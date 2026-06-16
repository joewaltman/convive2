/**
 * Lunch Club: full archive of SOURCE Postgres to local CSVs.
 *
 * Read-only. Dumps every table in every non-system schema as one CSV per
 * table into ./archive/<schema>__<table>.csv. Preserves all columns at full
 * fidelity so the legacy data is independent of the old service.
 *
 * Run:
 *   SOURCE_DATABASE_URL=... npx ts-node --transpile-only scripts/lunchclub/archive.ts
 */
import { Client } from 'pg';
import { mkdirSync, createWriteStream } from 'fs';
import { join } from 'path';

const OUT_DIR = './archive';
const EXCLUDED_SCHEMAS = new Set(['pg_catalog', 'information_schema', 'pg_toast']);

function csvEscape(v: unknown): string {
  if (v === null || v === undefined) return '';
  let s: string;
  if (v instanceof Date) {
    s = v.toISOString();
  } else if (Array.isArray(v)) {
    s = JSON.stringify(v);
  } else if (typeof v === 'object') {
    s = JSON.stringify(v);
  } else {
    s = String(v);
  }
  if (/[",\r\n]/.test(s)) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}

async function listTables(client: Client): Promise<Array<{ schema: string; name: string }>> {
  const res = await client.query<{ schema: string; name: string }>(
    `SELECT table_schema AS schema, table_name AS name
     FROM information_schema.tables
     WHERE table_type = 'BASE TABLE'
       AND table_schema NOT IN ('pg_catalog', 'information_schema')
       AND table_schema NOT LIKE 'pg_%'
     ORDER BY table_schema, table_name`,
  );
  return res.rows.filter((r) => !EXCLUDED_SCHEMAS.has(r.schema));
}

async function dumpTable(
  client: Client,
  schema: string,
  name: string,
): Promise<number> {
  // Get ordered column names so the CSV header matches the column order.
  const colsRes = await client.query<{ column_name: string }>(
    `SELECT column_name FROM information_schema.columns
     WHERE table_schema = $1 AND table_name = $2
     ORDER BY ordinal_position`,
    [schema, name],
  );
  const cols = colsRes.rows.map((r) => r.column_name);

  const outPath = join(OUT_DIR, `${schema}__${name}.csv`);
  const stream = createWriteStream(outPath, { encoding: 'utf8' });
  stream.write(cols.map((c) => csvEscape(c)).join(',') + '\n');

  const data = await client.query(
    `SELECT * FROM "${schema}"."${name}"`,
  );

  for (const row of data.rows as Record<string, unknown>[]) {
    const line = cols.map((c) => csvEscape(row[c])).join(',');
    stream.write(line + '\n');
  }

  await new Promise<void>((resolve, reject) => {
    stream.end((err?: Error | null) => (err ? reject(err) : resolve()));
  });

  return data.rowCount ?? 0;
}

async function main() {
  const srcUrl = process.env.SOURCE_DATABASE_URL;
  if (!srcUrl) {
    console.error('SOURCE_DATABASE_URL is not set');
    process.exit(1);
  }

  mkdirSync(OUT_DIR, { recursive: true });

  const client = new Client({ connectionString: srcUrl });
  await client.connect();

  try {
    const tables = await listTables(client);
    console.log(`Archiving ${tables.length} table(s) to ${OUT_DIR}/`);
    let total = 0;
    for (const t of tables) {
      const n = await dumpTable(client, t.schema, t.name);
      total += n;
      console.log(`  ${t.schema}.${t.name}: ${n} rows`);
    }
    console.log(`Done. ${tables.length} tables, ${total} rows total.`);
  } finally {
    await client.end();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
