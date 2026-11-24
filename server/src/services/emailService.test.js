import test from 'node:test';
import assert from 'node:assert/strict';
import { createAuthToken } from './emailService.js';

test('authentication tokens use cryptographically random 256-bit hex values and separate hashes', () => {
  const first = createAuthToken();
  const second = createAuthToken();
  assert.match(first.token, /^[a-f0-9]{64}$/);
  assert.match(first.hash, /^[a-f0-9]{64}$/);
  assert.notEqual(first.token, first.hash);
  assert.notEqual(first.token, second.token);
  assert.notEqual(first.hash, second.hash);
});
