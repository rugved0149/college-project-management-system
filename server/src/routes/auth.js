import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import crypto from 'node:crypto';
import { db } from '../config/database.js';
import { auth } from '../middleware/auth.js';
import { createAuthToken, sendAuthEmail, verificationUrl, resetUrl } from '../services/emailService.js';

const r = Router();
const authLimiter = rateLimit({ windowMs: 15 * 60 * 1000, limit: 8, standardHeaders: true, legacyHeaders: false, message: { error: 'Too many requests. Please try again later.' } });
const publicUser = u => ({ user_id: u.user_id, name: u.name, email: u.email, role: u.role, department_id: u.department_id });
const tokenHash = token => crypto.createHash('sha256').update(String(token || '')).digest('hex');
function recordAccess(userId, action, req) {
  db.prepare('INSERT INTO audit_logs(user_id,action,resource_type,resource_id,ip_address) VALUES(?,?,?,?,?)').run(userId, action, 'AUTH', String(userId), req.ip);
}
function issueToken(userId, purpose, hours) {
  const generated = createAuthToken();
  db.prepare('DELETE FROM auth_tokens WHERE user_id=? AND purpose=?').run(userId, purpose);
  db.prepare('INSERT INTO auth_tokens(user_id,purpose,token_hash,expires_at) VALUES(?,?,?,?)')
    .run(userId, purpose, generated.hash, new Date(Date.now() + hours * 60 * 60 * 1000).toISOString());
  return generated.token;
}
function validEmail(email) { return /^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$/.test(email); }

r.get('/departments', (q, s) => s.json({ departments: db.prepare('SELECT department_id, name AS department_name FROM departments ORDER BY name').all() }));

r.post('/register', authLimiter, async (q, s, next) => {
  const registration = db.prepare("SELECT setting_value FROM system_settings WHERE setting_key='allow_registration'").get();
  if (registration && registration.setting_value === 'false') return s.status(403).json({ error: 'New registrations are currently disabled' });
  const name = String(q.body.name || '').trim();
  const email = String(q.body.email || '').trim().toLowerCase();
  const password = String(q.body.password || '');
  const departmentId = Number(q.body.departmentId) || null;
  if (!name || name.length > 100 || !validEmail(email) || password.length < 8 || password.length > 72) return s.status(400).json({ error: 'Enter a valid name, email and password of 8–72 characters' });
  if (departmentId && !db.prepare('SELECT 1 FROM departments WHERE department_id=?').get(departmentId)) return s.status(400).json({ error: 'Choose a valid department' });
  try {
    const info = db.prepare("INSERT INTO users(name,email,password_hash,role,department_id,email_verified) VALUES(?,?,?,'STUDENT',?,0)")
      .run(name, email, bcrypt.hashSync(password, 12), departmentId);
    const token = issueToken(info.lastInsertRowid, 'EMAIL_VERIFY', 24);
    await sendAuthEmail({ to: email, name, subject: 'Verify your CampusFlow email', heading: 'Verify your email address', message: 'Confirm your email address to activate your CampusFlow account.', actionLabel: 'Verify email', actionUrl: verificationUrl(token), expiry: '24 hours' });
    recordAccess(info.lastInsertRowid, 'ACCOUNT_REGISTERED', q);
    return s.status(201).json({ message: 'Account created. Check your email for the verification link.' });
  } catch (e) {
    if (String(e.code || '').includes('SQLITE_CONSTRAINT') || String(e.message).includes('UNIQUE')) return s.status(409).json({ error: 'An account with this email already exists' });
    return next(e);
  }
});

r.get('/verify-email', async (q, s, next) => {
  try {
    const token = String(q.query.token || '');
    if (!/^[a-f0-9]{64}$/.test(token)) return s.status(400).json({ error: 'Verification link is invalid or expired' });
    const record = db.prepare("SELECT t.token_id,t.user_id FROM auth_tokens t WHERE t.token_hash=? AND t.purpose='EMAIL_VERIFY' AND datetime(t.expires_at)>datetime('now')").get(tokenHash(token));
    if (!record) return s.status(400).json({ error: 'Verification link is invalid or expired' });
    db.transaction(() => {
      db.prepare('UPDATE users SET email_verified=1 WHERE user_id=?').run(record.user_id);
      db.prepare('DELETE FROM auth_tokens WHERE user_id=? AND purpose=\'EMAIL_VERIFY\'').run(record.user_id);
    })();
    recordAccess(record.user_id, 'EMAIL_VERIFIED', q);
    s.json({ success: true, message: 'Email verified. You can now sign in.' });
  } catch (e) { next(e); }
});

r.post('/resend-verification', authLimiter, async (q, s, next) => {
  try {
    const email = String(q.body.email || '').trim().toLowerCase();
    const user = db.prepare('SELECT user_id,name,email,email_verified,is_active FROM users WHERE email=?').get(email);
    if (user && user.is_active && !user.email_verified) {
      const token = issueToken(user.user_id, 'EMAIL_VERIFY', 24);
      await sendAuthEmail({ to: user.email, name: user.name, subject: 'Verify your CampusFlow email', heading: 'Verify your email address', message: 'Use the link below to activate your CampusFlow account.', actionLabel: 'Verify email', actionUrl: verificationUrl(token), expiry: '24 hours' });
    }
    s.json({ message: 'If an unverified account exists for that address, a new verification link has been sent.' });
  } catch (e) { next(e); }
});

r.post('/login', authLimiter, (q, s) => {
  const email = String(q.body.email || '').trim().toLowerCase();
  const u = db.prepare('SELECT * FROM users WHERE email=? AND is_active=1').get(email);
  if (!u || !bcrypt.compareSync(String(q.body.password || ''), u.password_hash)) return s.status(401).json({ error: 'Invalid email or password' });
  if (!u.email_verified) return s.status(403).json({ error: 'Verify your email before signing in. You can request a new verification link below.' });
  const token = jwt.sign({ user_id: u.user_id }, process.env.JWT_SECRET, { expiresIn: '12h' });
  recordAccess(u.user_id, 'LOGIN_SUCCESS', q);
  s.json({ token, user: publicUser(u) });
});

r.post('/forgot-password', authLimiter, async (q, s, next) => {
  try {
    const email = String(q.body.email || '').trim().toLowerCase();
    const user = db.prepare('SELECT user_id,name,email,is_active,email_verified FROM users WHERE email=?').get(email);
    if (user && user.is_active && user.email_verified) {
      const token = issueToken(user.user_id, 'PASSWORD_RESET', 1);
      await sendAuthEmail({ to: user.email, name: user.name, subject: 'Reset your CampusFlow password', heading: 'Password reset requested', message: 'Use the link below to choose a new password for your account.', actionLabel: 'Reset password', actionUrl: resetUrl(token), expiry: '1 hour' });
    }
    s.json({ message: 'If an active verified account exists for that address, password reset instructions have been sent.' });
  } catch (e) { next(e); }
});

r.post('/reset-password', authLimiter, (q, s, next) => {
  try {
    const token = String(q.body.token || '');
    const password = String(q.body.password || '');
    if (!/^[a-f0-9]{64}$/.test(token) || password.length < 8 || password.length > 72) return s.status(400).json({ error: 'Use a valid reset link and a password of 8–72 characters' });
    const record = db.prepare("SELECT token_id,user_id FROM auth_tokens WHERE token_hash=? AND purpose='PASSWORD_RESET' AND datetime(expires_at)>datetime('now')").get(tokenHash(token));
    if (!record) return s.status(400).json({ error: 'Reset link is invalid or expired. Request a new one.' });
    db.transaction(() => {
      db.prepare('UPDATE users SET password_hash=? WHERE user_id=?').run(bcrypt.hashSync(password, 12), record.user_id);
      db.prepare('DELETE FROM auth_tokens WHERE user_id=? AND purpose=\'PASSWORD_RESET\'').run(record.user_id);
    })();
    recordAccess(record.user_id, 'PASSWORD_RESET_COMPLETED', q);
    s.json({ success: true, message: 'Password updated. Sign in with your new password.' });
  } catch (e) { next(e); }
});

r.get('/me', auth, (q, s) => {
  const u = db.prepare('SELECT * FROM users WHERE user_id=?').get(q.user.user_id);
  s.json({ user: publicUser(u) });
});

r.patch('/profile', auth, async (q, s, next) => {
  try {
    const name = String(q.body.name || '').trim();
    const email = String(q.body.email || '').trim().toLowerCase();
    if (!name || name.length > 100 || !validEmail(email)) return s.status(400).json({ error: 'Enter a valid name and email address' });
    const current = db.prepare('SELECT * FROM users WHERE user_id=?').get(q.user.user_id);
    const changed = email !== current.email;
    db.prepare('UPDATE users SET name=?,email=?,email_verified=CASE WHEN ? THEN 0 ELSE email_verified END WHERE user_id=?').run(name, email, changed ? 1 : 0, q.user.user_id);
    if (changed) {
      const token = issueToken(q.user.user_id, 'EMAIL_VERIFY', 24);
      await sendAuthEmail({ to: email, name, subject: 'Verify your new CampusFlow email', heading: 'Confirm your new email address', message: 'You changed the email address on your CampusFlow account. Confirm the new address to restore sign-in access.', actionLabel: 'Verify email', actionUrl: verificationUrl(token), expiry: '24 hours' });
      recordAccess(q.user.user_id, 'EMAIL_CHANGE_REQUESTED', q);
      return s.json({ message: 'Profile updated. Verify your new email address before your next sign-in.', user: publicUser(db.prepare('SELECT * FROM users WHERE user_id=?').get(q.user.user_id)) });
    }
    db.prepare('UPDATE users SET name=? WHERE user_id=?').run(name, q.user.user_id);
    s.json({ user: publicUser(db.prepare('SELECT * FROM users WHERE user_id=?').get(q.user.user_id)) });
  } catch (e) {
    if (String(e.message).includes('UNIQUE')) return s.status(409).json({ error: 'Email address is already in use' });
    next(e);
  }
});

export default r;
