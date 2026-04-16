import { Pool } from 'pg';
import dotenv from 'dotenv';

dotenv.config();

/**
 * Shared PostgreSQL connection pool configured from the `DATABASE_URL` environment variable.
 * The process exits with code 1 if the pool emits an unexpected client error.
 */
const pool = new Pool({
  connectionString: process.env['DATABASE_URL'],
});

pool.on('error', (err) => {
  console.error('Unexpected PostgreSQL client error:', err);
  process.exit(1);
});

export default pool;
