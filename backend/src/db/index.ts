import { Pool, QueryResultRow } from 'pg';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

pool.on('error', (err) => {
  console.error('Unexpected error on idle client', err);
  process.exit(-1);
});

export const db = {
  query: <T extends QueryResultRow>(text: string, params?: unknown[]) =>
    pool.query<T>(text, params),
  getClient: () => pool.connect(),
  pool,
};
