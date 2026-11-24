import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { validateFileSignature, scanWithClamAV } from './fileValidation.js';

const directory = mkdtempSync(join(tmpdir(), 'campusflow-upload-'));
const pdfPath = join(directory, 'sample.pdf');
const fakePath = join(directory, 'fake.pdf');
writeFileSync(pdfPath, Buffer.concat([Buffer.from('%PDF-1.7'), Buffer.from(' test document')]));
writeFileSync(fakePath, Buffer.from('not really a PDF'));

test('validates PDF file signatures rather than trusting the filename', async () => {
  await assert.doesNotReject(validateFileSignature(pdfPath, '.pdf'));
  await assert.rejects(validateFileSignature(fakePath, '.pdf'), /does not match/);
});

test('rejects unsupported extensions', async () => {
  await assert.rejects(validateFileSignature(fakePath, '.exe'), /Unsupported file extension/);
});

test('malware scanning can be required and fails closed without a scanner', async () => {
  delete process.env.CLAMAV_HOST;
  process.env.REQUIRE_MALWARE_SCAN = 'true';
  await assert.rejects(scanWithClamAV(pdfPath), error => error.status === 503);
  process.env.REQUIRE_MALWARE_SCAN = 'false';
  assert.deepEqual(await scanWithClamAV(pdfPath), { scanned: false, reason: 'scanner_not_configured' });
});

test('cleans up temporary upload validation fixtures', () => {
  rmSync(directory, { recursive: true, force: true });
  assert.equal(true, true);
});
