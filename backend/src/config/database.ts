import { Pool, PoolConfig } from 'pg';

let config: PoolConfig;

if (process.env.DATABASE_URL) {
  // Render free-tier PostgreSQL allows ~25 connections total.
  // Keep pool small so rolling deploys (two instances briefly overlapping) don't hit the limit.
  config = {
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false },
    // Was 5, then 15 — each a limit set for a smaller hosted database the app
    // no longer runs on. 15 was still too few: each staff member's dashboard
    // alone fires ~9 queries in parallel on load, so a handful of people
    // opening the app in the same few seconds is enough to fill it, and every
    // other request in the home then waits up to connectionTimeoutMillis
    // before failing outright — recorded as "Server error — timeout exceeded
    // when trying to connect", seen spread across almost every page (not just
    // one broken route) during busy minutes. Override with DB_POOL_MAX if
    // this VPS's Postgres needs a different ceiling.
    max: parseInt(process.env.DB_POOL_MAX || '30', 10),
    min: 1,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 10000,
  };
} else {
  const dbPassword = process.env.DB_PASSWORD;
  if (!dbPassword) {
    console.error('\n⛔  DB_PASSWORD is not set. Create a .env file in the backend folder.');
    console.error('    Copy backend/.env.example to backend/.env and fill in your PostgreSQL credentials.\n');
  }
  config = {
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432'),
    database: process.env.DB_NAME || 'healthark',
    user: process.env.DB_USER || 'postgres',
    password: dbPassword,
    ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: true } : false,
    max: 20,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 5000,
  };
}

export const pool = new Pool(config);

pool.on('error', (err) => {
  console.error('Unexpected PostgreSQL pool error:', err);
});

// Helper: run a query with automatic client management
export async function query<T = Record<string, unknown>>(
  text: string,
  params?: unknown[]
): Promise<T[]> {
  const start = Date.now();
  const res = await pool.query(text, params);
  const duration = Date.now() - start;
  if (process.env.NODE_ENV === 'development') {
    console.log('Query executed', { text: text.substring(0, 80), duration, rows: res.rowCount });
  }
  return res.rows as T[];
}

// Helper: transactional queries
export async function transaction<T>(
  fn: (client: import('pg').PoolClient) => Promise<T>
): Promise<T> {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const result = await fn(client);
    await client.query('COMMIT');
    return result;
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

export default pool;
