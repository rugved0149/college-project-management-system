import { createClient } from '@supabase/supabase-js';
import { randomUUID } from 'node:crypto';
import path from 'node:path';

const url = process.env.SUPABASE_URL;
const secretKey = process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;
const bucket = process.env.SUPABASE_STORAGE_BUCKET || 'submissions';

if (!url || !secretKey) {
  throw new Error('SUPABASE_URL and SUPABASE_SECRET_KEY are required for submission storage');
}

const supabase = createClient(url, secretKey, {
  auth: { persistSession: false, autoRefreshToken: false }
});

export async function storeSubmission(file, userId) {
  if (!file?.buffer) throw new Error('Submission upload is missing its in-memory file buffer');
  const extension = path.extname(file.originalname).toLowerCase();
  const objectPath = `${userId}/${randomUUID()}${extension}`;
  const { error } = await supabase.storage.from(bucket).upload(objectPath, file.buffer, {
    contentType: file.mimetype,
    upsert: false
  });
  if (error) throw Object.assign(new Error('Could not store the submission file'), { status: 502, cause: error });
  return objectPath;
}

export async function downloadSubmission(objectPath) {
  const { data, error } = await supabase.storage.from(bucket).download(objectPath);
  if (error || !data) throw Object.assign(new Error('Submission file not found'), { status: 404, cause: error });
  return Buffer.from(await data.arrayBuffer());
}

export async function removeSubmission(objectPath) {
  if (!objectPath) return;
  const { error } = await supabase.storage.from(bucket).remove([objectPath]);
  if (error) throw Object.assign(new Error('Could not remove the stored submission'), { status: 502, cause: error });
}
