import crypto from 'node:crypto';

const apiKey = process.env.BREVO_API_KEY;
const sender = process.env.EMAIL_FROM;
const senderName = process.env.EMAIL_FROM_NAME || 'CampusFlow';
const appUrl = (process.env.APP_URL || (process.env.CLIENT_URL || 'http://localhost:5173').split(',')[0]).replace(/\/$/, '');

export function createAuthToken() {
  const token = crypto.randomBytes(32).toString('hex');
  return { token, hash: crypto.createHash('sha256').update(token).digest('hex') };
}

export async function sendAuthEmail({ to, name, subject, heading, message, actionLabel, actionUrl, expiry }) {
  if (!apiKey || !sender) throw Object.assign(new Error('Email delivery is not configured. Set BREVO_API_KEY and EMAIL_FROM.'), { status: 503 });
  const html = `<div style="font-family:Arial,sans-serif;max-width:560px;margin:auto;color:#172033;line-height:1.6"><h2>${heading}</h2><p>Hello ${escapeHtml(name)},</p><p>${message}</p><p><a href="${actionUrl}" style="display:inline-block;background:#2449a6;color:#fff;padding:12px 20px;border-radius:6px;text-decoration:none">${actionLabel}</a></p><p>This link expires in ${expiry}. If you did not request this, you can ignore this email.</p><p>— CampusFlow</p></div>`;
  const response = await fetch('https://api.brevo.com/v3/smtp/email', {
    method: 'POST',
    headers: { 'accept': 'application/json', 'api-key': apiKey, 'content-type': 'application/json' },
    body: JSON.stringify({ sender: { name: senderName, email: sender }, to: [{ email: to, name }], subject, htmlContent: html }),
    signal: AbortSignal.timeout(12000)
  });
  if (!response.ok) {
    const body = await response.text();
    console.error('Brevo email delivery failed:', response.status, body.slice(0, 300));
    throw Object.assign(new Error('Unable to send email at this time. Please try again later.'), { status: 502 });
  }
}

export function verificationUrl(token) { return appUrl + '/?verify=' + encodeURIComponent(token); }
export function resetUrl(token) { return appUrl + '/?reset=' + encodeURIComponent(token); }

function escapeHtml(value = '') {
  return String(value).replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char]);
}
