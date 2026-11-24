import test, { before, after } from 'node:test';
import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import bcrypt from 'bcryptjs';

process.env.DB_PATH = join(mkdtempSync(join(tmpdir(), 'campusflow-auth-')), 'test.db');
process.env.JWT_SECRET = 'integration-test-secret-at-least-32-characters';
process.env.CLIENT_URL = 'http://localhost:5173';
process.env.BREVO_API_KEY = 'integration-test-key';
process.env.EMAIL_FROM = 'no-reply@example.edu';

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
  rmSync(dirname(process.env.DB_PATH), { recursive: true, force: true });
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

test('student registration accepts a valid email and sends verification email', async () => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async (input, options) => {
    if (String(input).startsWith('https://api.brevo.com/v3/smtp/email')) {
      return new Response(null, { status: 201 });
    }
    return originalFetch(input, options);
  };
  try {
    const email = 'new.student@example.edu';
    const response = await fetch(baseUrl + '/api/auth/register', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        name: 'New Student',
        email,
        password: 'StudentPass123',
        departmentId
      })
    });
    assert.equal(response.status, 201);
    assert.match((await response.json()).message, /check your email/i);
    const created = db.prepare('SELECT role,email_verified FROM users WHERE email=?').get(email);
    assert.deepEqual(created, { role: 'STUDENT', email_verified: 0 });
  } finally {
    globalThis.fetch = originalFetch;
  }
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


test('project visibility is restricted to members, assigned faculty and department administrators', async () => {
  const createUser = (name, email, role, deptId) => db.prepare(
    'INSERT INTO users(name,email,password_hash,role,department_id,email_verified) VALUES(?,?,?,?,?,1)'
  ).run(name, email, bcrypt.hashSync(password, 4), role, deptId).lastInsertRowid;
  const ownerToken = (await (await login()).json()).token;
  const projectResponse = await fetch(baseUrl + '/api/projects', {
    method: 'POST',
    headers: { 'content-type': 'application/json', authorization: 'Bearer ' + ownerToken },
    body: JSON.stringify({ title: 'Access Control Project', description: 'Integration test project' })
  });
  assert.equal(projectResponse.status, 201);
  const project = (await projectResponse.json()).project;

  const outsiderId = createUser('Same Department Outsider', 'outsider@example.edu', 'STUDENT', departmentId);
  const outsiderToken = (await (await login('outsider@example.edu')).json()).token;
  assert.equal((await fetch(baseUrl + '/api/projects/' + project.project_id, {
    headers: { authorization: 'Bearer ' + outsiderToken }
  })).status, 403);

  const memberResponse = await fetch(baseUrl + '/api/projects/' + project.project_id + '/members', {
    method: 'POST',
    headers: { 'content-type': 'application/json', authorization: 'Bearer ' + ownerToken },
    body: JSON.stringify({ email: 'outsider@example.edu' })
  });
  assert.equal(memberResponse.status, 201);
  assert.equal((await fetch(baseUrl + '/api/projects/' + project.project_id, {
    headers: { authorization: 'Bearer ' + outsiderToken }
  })).status, 200);

  const secondDepartmentId = db.prepare('INSERT INTO departments(name) VALUES(?)').run('Other Integration Department').lastInsertRowid;
  const otherAdminId = createUser('Other Department Admin', 'other-admin@example.edu', 'DEPARTMENT_ADMIN', secondDepartmentId);
  const otherAdminToken = (await (await login('other-admin@example.edu')).json()).token;
  assert.equal((await fetch(baseUrl + '/api/projects/' + project.project_id, {
    headers: { authorization: 'Bearer ' + otherAdminToken }
  })).status, 403);
  const people = await fetch(baseUrl + '/api/admin/users', {
    headers: { authorization: 'Bearer ' + otherAdminToken }
  });
  assert.equal(people.status, 200);
  const listedUsers = (await people.json()).users;
  assert.ok(listedUsers.every(user => user.department_id === secondDepartmentId));
  assert.ok(!listedUsers.some(user => user.user_id === userId));
});
