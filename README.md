# Simple Signup Platform (Google + Email OTP)

A minimal platform where users can sign up using:
- **Google OAuth**, or
- **Any email address with OTP verification**.

## Features
- Google sign-in flow via Passport.
- Email OTP request + verify APIs.
- Session-based login.
- Lightweight frontend for signup and dashboard.

## Run locally
1. Install dependencies:
   ```bash
   npm install
   ```
2. Create `.env` file:
   ```bash
   cp .env.example .env
   ```
3. Update `.env`:
   - `SESSION_SECRET` to a strong value.
   - (Optional) Google OAuth credentials to enable Google login.
   - (Optional) SMTP credentials to send real emails.

4. Start server:
   ```bash
   npm start
   ```

5. Open `http://localhost:3000`.

## Google OAuth setup
- Create OAuth credentials in Google Cloud Console.
- Add this redirect URI:
  - `http://localhost:3000/auth/google/callback`

## Email OTP behavior
- OTP is a 6-digit code, valid for 10 minutes.
- If SMTP is not configured, OTP is printed to the terminal for development.

## API endpoints
- `POST /auth/email/request-otp` `{ email }`
- `POST /auth/email/verify-otp` `{ email, otp }`
- `GET /auth/google`
- `GET /api/me`
- `POST /auth/logout`
