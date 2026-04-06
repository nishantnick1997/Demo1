require('dotenv').config();
const express = require('express');
const session = require('express-session');
const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const nodemailer = require('nodemailer');
const path = require('path');
const crypto = require('crypto');

const app = express();
const PORT = process.env.PORT || 3000;
const BASE_URL = process.env.BASE_URL || `http://localhost:${PORT}`;

app.use(express.urlencoded({ extended: false }));
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));
app.use(
  session({
    secret: process.env.SESSION_SECRET || 'dev-secret',
    resave: false,
    saveUninitialized: false
  })
);

app.use(passport.initialize());
app.use(passport.session());

const users = new Map();
const emailOtps = new Map();

passport.serializeUser((user, done) => done(null, user.id));
passport.deserializeUser((id, done) => done(null, users.get(id) || null));

if (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET) {
  passport.use(
    new GoogleStrategy(
      {
        clientID: process.env.GOOGLE_CLIENT_ID,
        clientSecret: process.env.GOOGLE_CLIENT_SECRET,
        callbackURL: `${BASE_URL}/auth/google/callback`
      },
      (_accessToken, _refreshToken, profile, done) => {
        const email = profile.emails?.[0]?.value;
        const user = {
          id: `google-${profile.id}`,
          provider: 'google',
          name: profile.displayName,
          email,
          verified: true
        };
        users.set(user.id, user);
        done(null, user);
      }
    )
  );
}

function generateOtp() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

function getTransporter() {
  if (
    process.env.SMTP_HOST &&
    process.env.SMTP_PORT &&
    process.env.SMTP_USER &&
    process.env.SMTP_PASS
  ) {
    return nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: Number(process.env.SMTP_PORT || 587),
      secure: process.env.SMTP_SECURE === 'true',
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS
      }
    });
  }

  return {
    sendMail: async ({ to, subject, text }) => {
      console.log(`\n[DEV OTP EMAIL]\nTo: ${to}\nSubject: ${subject}\n${text}\n`);
      return { messageId: crypto.randomUUID() };
    }
  };
}

const transporter = getTransporter();

async function sendOtpEmail(email, otp) {
  await transporter.sendMail({
    from: process.env.SMTP_FROM || 'no-reply@example.com',
    to: email,
    subject: 'Your OTP for Simple Platform signup',
    text: `Your verification OTP is ${otp}. It expires in 10 minutes.`
  });
}

function requireAuth(req, res, next) {
  if (req.isAuthenticated && req.isAuthenticated()) {
    return next();
  }

  res.status(401).json({ error: 'Not authenticated' });
}

app.post('/auth/email/request-otp', async (req, res) => {
  const email = String(req.body.email || '').trim().toLowerCase();

  if (!email || !/^\S+@\S+\.\S+$/.test(email)) {
    return res.status(400).json({ error: 'Please provide a valid email address.' });
  }

  const otp = generateOtp();
  const expiresAt = Date.now() + 10 * 60 * 1000;

  emailOtps.set(email, { otp, expiresAt });

  try {
    await sendOtpEmail(email, otp);
    return res.json({
      message:
        'OTP sent. Check your email. (In development, OTP is printed in terminal when SMTP is not configured.)'
    });
  } catch (error) {
    console.error('Failed to send OTP email:', error);
    return res.status(500).json({ error: 'Failed to send OTP. Please try again.' });
  }
});

app.post('/auth/email/verify-otp', (req, res) => {
  const email = String(req.body.email || '').trim().toLowerCase();
  const otp = String(req.body.otp || '').trim();
  const record = emailOtps.get(email);

  if (!record) {
    return res.status(400).json({ error: 'No OTP request found for this email.' });
  }

  if (Date.now() > record.expiresAt) {
    emailOtps.delete(email);
    return res.status(400).json({ error: 'OTP expired. Please request a new one.' });
  }

  if (record.otp !== otp) {
    return res.status(400).json({ error: 'Invalid OTP. Please try again.' });
  }

  emailOtps.delete(email);

  const user = {
    id: `email-${email}`,
    provider: 'email',
    email,
    name: email.split('@')[0],
    verified: true
  };

  users.set(user.id, user);
  req.login(user, (err) => {
    if (err) {
      return res.status(500).json({ error: 'Login failed after OTP verification.' });
    }

    return res.json({ message: 'Email verified and signup complete!', user });
  });
});

app.get('/auth/google', (req, res, next) => {
  if (!process.env.GOOGLE_CLIENT_ID || !process.env.GOOGLE_CLIENT_SECRET) {
    return res
      .status(503)
      .send('Google OAuth is not configured. Please add GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET.');
  }

  return passport.authenticate('google', { scope: ['profile', 'email'] })(req, res, next);
});

app.get('/auth/google/callback', passport.authenticate('google', { failureRedirect: '/?error=google_auth' }), (req, res) => {
  res.redirect('/dashboard.html');
});

app.get('/api/me', requireAuth, (req, res) => {
  res.json({ user: req.user });
});

app.post('/auth/logout', (req, res) => {
  req.logout(() => {
    req.session.destroy(() => {
      res.json({ message: 'Logged out' });
    });
  });
});

app.get('/health', (_req, res) => {
  res.json({ ok: true });
});

app.listen(PORT, () => {
  console.log(`Simple Platform running at ${BASE_URL}`);
});
