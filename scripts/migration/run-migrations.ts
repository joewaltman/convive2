/**
 * Migration runner.
 * - Reads every .sql file in scripts/migration/ whose name starts with a numeric prefix.
 * - Applies any not yet recorded in the `migrations` table, in numeric order.
 * - Each file is applied inside its own transaction.
 */
import { Client } from 'pg';
import { readdirSync, readFileSync } from 'fs';
import { join } from 'path';

const MIGRATIONS_DIR = __dirname;

function listMigrationFiles(): string[] {
  return readdirSync(MIGRATIONS_DIR)
    .filter((f) => /^\d{3}_.+\.sql$/.test(f))
    .sort((a, b) => {
      const na = parseInt(a.slice(0, 3), 10);
      const nb = parseInt(b.slice(0, 3), 10);
      return na - nb;
    });
}

async function main() {
  const url = process.env.DATABASE_URL;
  if (!url) {
    console.error('DATABASE_URL is not set');
    process.exit(1);
  }
  const client = new Client({ connectionString: url });
  await client.connect();

  try {
    await client.query(`
      CREATE TABLE IF NOT EXISTS migrations (
        filename TEXT PRIMARY KEY,
        applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);

    const applied = new Set<string>(
      (await client.query(`SELECT filename FROM migrations`)).rows.map(
        (r: { filename: string }) => r.filename,
      ),
    );

    const files = listMigrationFiles();
    let appliedCount = 0;
    for (const f of files) {
      if (applied.has(f)) continue;
      const sql = readFileSync(join(MIGRATIONS_DIR, f), 'utf8');
      process.stdout.write(`Applying ${f}... `);
      try {
        await client.query('BEGIN');
        await client.query(sql);
        await client.query(
          `INSERT INTO migrations (filename) VALUES ($1)`,
          [f],
        );
        await client.query('COMMIT');
        appliedCount += 1;
        process.stdout.write('ok\n');
      } catch (err) {
        await client.query('ROLLBACK');
        console.error(`\nFAILED ${f}:`, err);
        process.exit(1);
      }
    }
    console.log(`Done. ${appliedCount} new migration(s) applied.`);
  } finally {
    await client.end();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
