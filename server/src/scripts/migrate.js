import 'dotenv/config';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { pool } from '../config/postgres.js';

const directory = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../migrations');

try {
  const files = (await fs.readdir(directory)).filter(file => /^\d+_.*\.sql$/.test(file)).sort();
  if (!files.length) throw new Error('No SQL migrations were found');
  for (const file of files) {
    const sql = await fs.readFile(path.join(directory, file), 'utf8');
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      await client.query(sql);
      await client.query('COMMIT');
      console.log('Applied migration:', file);
    } catch (error) {
      await client.query('ROLLBACK');
      throw new Error(`Migration ${file} failed: ${error.message}`);
    } finally {
      client.release();
    }
  }
} finally {
  await pool.end();
}
