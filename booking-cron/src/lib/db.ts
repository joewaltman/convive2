import { Pool, type PoolClient, type QueryResultRow } from 'pg';

declare global {
  // eslint-disable-next-line no-var
  var __cv_cron_pool: Pool | undefined;
}

function makePool(): Pool {
  if (!process.env.DATABASE_URL) {
    throw new Error('DATABASE_URL is not set');
  }
  return new Pool({ connectionString: process.env.DATABASE_URL });
}

export const pool: Pool = globalThis.__cv_cron_pool ?? (globalThis.__cv_cron_pool = makePool());

export async function query<T extends QueryResultRow = QueryResultRow>(
  sql: string,
  params?: ReadonlyArray<unknown>,
): Promise<T[]> {
  const res = await pool.query<T>(sql, params as unknown[] | undefined);
  return res.rows;
}

export async function withClient<T>(fn: (c: PoolClient) => Promise<T>): Promise<T> {
  const client = await pool.connect();
  try {
    return await fn(client);
  } finally {
    client.release();
  }
}
