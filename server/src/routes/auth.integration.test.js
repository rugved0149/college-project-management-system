import test, { before, after } from 'node:test';
import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import bcrypt from 'bcryptjs';

process.env.DB_PATH = join(mkdtempSync(join(tmpdir(), 'campusflow-auth-')), 'test.db');
process.env.JWT_SECRET = 'integration-test-secret-at-least-32-characters';
process.env.CLIENT_URL = 'http://localhost:5173';

let db;
let server;
let baseUrl;
let departmentId;
let userId;
let userEmail = 'verified@example.edu';
const password = 'InitialPass123';

before(async () => {
  const database = await import('../config/database.js');
  db = database.db;
  database.initializeDatabase();
  departmentId = db.prepare('INSERT INTO departments(name) VALUES(?)').run('Integration Test Department').lastInsertRowid;
  userId = db.prepare("INSERT INTO users(name,email,password_hash,role,department_id,email_verified) VALUES(?,?,?,'STUDENT',?,1)")
    .run('Verified Student', userEmail, bcrypt.hashSync(password, 4), departmentId).lastInsertRowid;
  const { createApp } = await import('../app.js');
  server = createServer(createApp());
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  baseUrl = 'http://127.0.0.1:' + server.address().port;
});

after(async () => {
  if (server) await new Promise(resolve => server.close(resolve));
  if (db) db.close();
  rmSync(process.env.DB_PATH.replace(/test\\.db$/, ''), { recursive: true, force: true });
});

async function login(email = userEmail, pass = password) {
  return fetch(baseUrl + '/api/auth/login', {
    method: 'POST', headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ email, password: pass })
  });
}

test('health endpoint responds without authentication', async () => {
  const response = await fetch(baseUrl + '/api/health');
  assert.equal(response.status, 200);
  assert.equal((await response.json()).status, 'ok');
});

test('verified user can sign in and access the authenticated profile', async () => {
  const response = await login();
  assert.equal(response.status, 200);
  const data = await response.json();
  assert.ok(data.token);
  assert.equal(data.user.email, userEmail);
  const profile = await fetch(baseUrl + '/api/auth/me', { headers: { authorization: 'Bearer ' + data.token } });
  assert.equal(profile.status, 200);
  assert.equal((await profile.json()).user.user_id, userId);
});

test('unverified account cannot sign in and a valid verification token is single-use', async () => {
  const email = 'unverified@example.edu';
  const id = db.prepare("INSERT INTO users(name,email,password_hash,role,department_id,email_verified) VALUES(?,?,?,'STUDENT',?,0)")
    .run('Unverified Student', email, bcrypt.hashSync(password, 4), departmentId).lastInsertRowid;
  const { createAuthToken } = await import('../services/emailService.js');
  const token = createAuthToken();
  db.prepare("INSERT INTO auth_tokens(user_id,purpose,token_hash,expires_at) VALUES(?,'EMAIL_VERIFY',?,?)")
    .run(id, token.hash, new Date(Date.now() + 60 * 60 * 1000).toISOString());
  assert.equal((await login(email)).status, 403);
  const verified = await fetch(baseUrl + '/api/auth/verify-email?token=' + token.token);
  assert.equal(verified.status, 200);
  assert.equal((await login(email)).status, 200);
  assert.equal((await fetch(baseUrl + '/api/auth/verify-email?token=' + token.token)).status, 400);
});

test('password reset consumes its token and revokes existing JWT sessions', async () => {
  const signedIn = await login();
  const oldToken = (await signedIn.json()).token;
  const { createAuthToken } = await import('../services/emailService.js');
  const token = createAuthToken();
  db.prepare("INSERT INTO auth_tokens(user_id,purpose,token_hash,expires_at) VALUES(?,'PASSWORD_RESET',?,?)")
    .run(userId, token.hash, new Date(Date.now() + 60 * 60 * 1000).toISOString());
  const reset = await fetch(baseUrl + '/api/auth/reset-password', {
    method: 'POST', headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ token: token.token, password: 'UpdatedPass456' })
  });
  assert.equal(reset.status, 200);
  const oldSession = await fetch(baseUrl + '/api/auth/me', { headers: { authorization: 'Bearer ' + oldToken } });
  assert.equal(oldSession.status, 401);
  assert.equal((await login(userEmail, 'UpdatedPass456')).status, 200);
  const replay = await fetch(baseUrl + '/api/auth/reset-password', {
    method: 'POST', headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ token: token.token, password: 'AnotherPass789' })
  });
  assert.equal(replay.status, 400);
});
