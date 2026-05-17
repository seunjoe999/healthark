import { Pool, PoolConfig } from 'pg';

const dbUser = process.env.DB_USER || 'postgres';
const dbPassword = process.env.DB_PASSWORD;

if (!dbPassword) {
  console.error('\n⛔  DB_PASSWORD is not set. Create a .env file in the backend folder.');
  console.error('    Copy backend/.env.example to backend/.env and fill in your PostgreSQL credentials.\n');
}

const config: PoolConfig = {
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432'),
  database: process.env.DB_NAME || 'healthark',
  user: dbUser,
  password: dbPassword,
  ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: true } : false,
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 5000,
};

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
