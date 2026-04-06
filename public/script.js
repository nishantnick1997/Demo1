const requestForm = document.getElementById('request-otp-form');
const verifyForm = document.getElementById('verify-otp-form');
const statusEl = document.getElementById('status');
const emailInput = document.getElementById('email');
const otpInput = document.getElementById('otp');

function setStatus(message, isError = false) {
  statusEl.textContent = message;
  statusEl.className = isError ? 'error' : 'success';
}

requestForm.addEventListener('submit', async (event) => {
  event.preventDefault();
  const email = emailInput.value.trim();

  const res = await fetch('/auth/email/request-otp', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email })
  });

  const data = await res.json();
  if (!res.ok) {
    setStatus(data.error || 'Failed to send OTP.', true);
    return;
  }

  setStatus(data.message || 'OTP sent.');
});

verifyForm.addEventListener('submit', async (event) => {
  event.preventDefault();
  const email = emailInput.value.trim();
  const otp = otpInput.value.trim();

  const res = await fetch('/auth/email/verify-otp', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, otp })
  });

  const data = await res.json();
  if (!res.ok) {
    setStatus(data.error || 'OTP verification failed.', true);
    return;
  }

  setStatus(data.message || 'Signup successful. Redirecting...');
  setTimeout(() => {
    window.location.href = '/dashboard.html';
  }, 500);
});
