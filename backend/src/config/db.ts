import { Pool } from 'pg';
import dotenv from 'dotenv';

dotenv.config();

/**
 * Shared PostgreSQL connection pool configured from the `DATABASE_URL` environment variable.
 * The process exits with code 1 if the pool emits an unexpected client error.
 */
const connectionString = process.env['DATABASE_URL'];

const pool = new Pool({
  connectionString,
  // Render internal connections (between services in the same region) don't
  // need SSL. External DATABASE_URLs (e.g. local dev pointed at Render) do.
  ssl: connectionString?.includes('localhost') || connectionString?.includes('127.0.0.1')
    ? false
    : { rejectUnauthorized: false },
});

pool.on('error', (err) => {
  console.error('Unexpected PostgreSQL client error:', err);
  process.exit(1);
});

export default pool;
