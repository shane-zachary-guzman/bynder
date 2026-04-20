import fs from 'fs';
import path from 'path';
import pool from './db';

/**
 * Runs every SQL file in db/migrations/ in alphabetical order.
 *
 * All migration files use CREATE TABLE IF NOT EXISTS and
 * CREATE INDEX IF NOT EXISTS, so this is safe to call on every
 * startup — already-applied migrations are a no-op.
 */
export async function runMigrations(): Promise<void> {
  const migrationsDir = path.resolve(__dirname, '../../db/migrations');

  let files: string[];
  try {
    files = fs
      .readdirSync(migrationsDir)
      .filter((f) => f.endsWith('.sql'))
      .sort();
  } catch (err) {
    console.error('[migrate] Could not read migrations directory:', migrationsDir, err);
    throw err;
  }

  if (files.length === 0) {
    console.log('[migrate] No migration files found.');
    return;
  }

  const client = await pool.connect();
  try {
    for (const file of files) {
      const filePath = path.join(migrationsDir, file);
      const sql = fs.readFileSync(filePath, 'utf8');
      console.log(`[migrate] Applying ${file}…`);
      await client.query(sql);
    }
    console.log(`[migrate] Done — ${files.length} migration(s) applied.`);
  } finally {
    client.release();
  }
}
