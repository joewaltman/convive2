/**
 * Lunch Club harvest.
 *
 * Reads candidate guests from the legacy con-vive database (SOURCE_DATABASE_URL)
 * and upserts them into lunchclub.prospects in the convive2 database
 * (DATABASE_URL).
 *
 * - SOURCE is read-only. No writes against it, ever.
 * - Idempotent: ON CONFLICT (source_guest_id) DO UPDATE; token is preserved
 *   across re-runs.
 * - Candidate filter: any SOURCE guest with a usable phone_clean.
 * - The legacy `one_thing` column is intentionally NOT copied.
 *
 * Run:
 *   SOURCE_DATABASE_URL=... DATABASE_URL=... \
 *     npx ts-node --transpile-only scripts/lunchclub/harvest.ts
 */
import { Client } from 'pg';
import { generateUrlSafeToken } from '../../src/lib/tokens';

// SOURCE column names we attempt to map. Missing columns are tolerated.
const STRAIGHT_TEXT_COLS = [
  'first_name',
  'last_name',
  'email',
  'phone_clean',
  'age_range',
  'zip_code',
  'dietary_notes',
  'curious_about',
  'surprising_knowledge',
  'what_do_you_do',
  'about',
] as const;

// Map of TARGET column -> SOURCE column when names differ.
const RENAMED: Record<string, string> = {
  legacy_priority: 'priority',
};

// Candidate SOURCE column names for the legacy availability hint.
const AVAILABILITY_CANDIDATES = [
  'available_days',
  'availability',
  'available_weeknights',
  'available_evenings',
  'weeknight_availability',
];

interface SourceRow {
  id: unknown;
  [k: string]: unknown;
}

function toText(v: unknown): string | null {
  if (v === null || v === undefined) return null;
  if (typeof v === 'string') {
    const t = v.trim();
    return t.length === 0 ? null : t;
  }
  return String(v);
}

function toTextArray(v: unknown): string[] | null {
  if (v === null || v === undefined) return null;
  if (Array.isArray(v)) {
    const arr = v.map((x) => (x == null ? '' : String(x).trim())).filter(Boolean);
    return arr.length === 0 ? null : arr;
  }
  if (typeof v === 'string') {
    const arr = v
      .split(/[,;|]/)
      .map((s) => s.trim())
      .filter(Boolean);
    return arr.length === 0 ? null : arr;
  }
  return null;
}

async function listGuestColumns(src: Client): Promise<Set<string>> {
  const res = await src.query<{ column_name: string }>(
    `SELECT column_name FROM information_schema.columns
     WHERE table_schema = 'public' AND table_name = 'guests'`,
  );
  return new Set(res.rows.map((r) => r.column_name));
}

function pickAvailabilityColumn(cols: Set<string>): string | null {
  for (const c of AVAILABILITY_CANDIDATES) if (cols.has(c)) return c;
  // Fall back: any column whose name starts with "avail".
  for (const c of cols) if (c.toLowerCase().startsWith('avail')) return c;
  return null;
}

async function main() {
  const srcUrl = process.env.SOURCE_DATABASE_URL;
  const tgtUrl = process.env.DATABASE_URL;
  if (!srcUrl) {
    console.error('SOURCE_DATABASE_URL is not set');
    process.exit(1);
  }
  if (!tgtUrl) {
    console.error('DATABASE_URL is not set');
    process.exit(1);
  }

  const src = new Client({ connectionString: srcUrl });
  const tgt = new Client({ connectionString: tgtUrl });
  await src.connect();
  await tgt.connect();

  let inserted = 0;
  let updated = 0;

  try {
    const cols = await listGuestColumns(src);
    if (cols.size === 0) {
      console.error('SOURCE has no public.guests table');
      process.exit(1);
    }
    if (!cols.has('id')) {
      console.error('SOURCE public.guests is missing required column: id');
      process.exit(1);
    }
    if (!cols.has('phone_clean')) {
      console.error('SOURCE public.guests is missing required column: phone_clean');
      process.exit(1);
    }

    const availCol = pickAvailabilityColumn(cols);

    // Build the SELECT list: only columns we recognize and that exist.
    const select: string[] = ['id'];
    for (const c of STRAIGHT_TEXT_COLS) if (cols.has(c)) select.push(c);
    if (cols.has('dietary_restrictions')) select.push('dietary_restrictions');
    for (const tgtName of Object.keys(RENAMED)) {
      const srcName = RENAMED[tgtName];
      if (cols.has(srcName)) select.push(`${srcName} AS ${tgtName}`);
    }
    if (availCol) select.push(`${availCol} AS available_days_legacy`);

    console.log(
      `SOURCE guests columns matched: ${select.length}` +
        (availCol ? ` (availability column: ${availCol})` : ' (no availability column found)'),
    );

    const sourceRows = await src.query<SourceRow>(
      `SELECT ${select.join(', ')}
       FROM public.guests
       WHERE phone_clean IS NOT NULL AND btrim(phone_clean) <> ''`,
    );
    console.log(`SOURCE candidate rows: ${sourceRows.rowCount}`);

    await tgt.query('BEGIN');

    for (const row of sourceRows.rows) {
      const sourceGuestId = String(row.id);
      // Look up existing prospect to decide insert vs update and preserve token.
      const existing = await tgt.query<{ token: string }>(
        `SELECT token FROM lunchclub.prospects WHERE source_guest_id = $1`,
        [sourceGuestId],
      );

      const token = existing.rowCount && existing.rowCount > 0
        ? existing.rows[0].token
        : generateUrlSafeToken(24);

      const params: unknown[] = [
        sourceGuestId,
        token,
        toText(row.first_name),
        toText(row.last_name),
        toText(row.email),
        toText(row.phone_clean),
        toText(row.age_range),
        toText(row.zip_code),
        toTextArray(row.dietary_restrictions),
        toText(row.dietary_notes),
        toText(row.available_days_legacy),
        toText(row.curious_about),
        toText(row.surprising_knowledge),
        toText(row.what_do_you_do),
        toText(row.about),
        toText(row.legacy_priority),
      ];

      await tgt.query(
        `INSERT INTO lunchclub.prospects (
           source_guest_id, token, first_name, last_name, email, phone_clean,
           age_range, zip_code, dietary_restrictions, dietary_notes,
           available_days_legacy, curious_about, surprising_knowledge,
           what_do_you_do, about, legacy_priority
         ) VALUES (
           $1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16
         )
         ON CONFLICT (source_guest_id) DO UPDATE SET
           first_name            = EXCLUDED.first_name,
           last_name             = EXCLUDED.last_name,
           email                 = EXCLUDED.email,
           phone_clean           = EXCLUDED.phone_clean,
           age_range             = EXCLUDED.age_range,
           zip_code              = EXCLUDED.zip_code,
           dietary_restrictions  = EXCLUDED.dietary_restrictions,
           dietary_notes         = EXCLUDED.dietary_notes,
           available_days_legacy = EXCLUDED.available_days_legacy,
           curious_about         = EXCLUDED.curious_about,
           surprising_knowledge  = EXCLUDED.surprising_knowledge,
           what_do_you_do        = EXCLUDED.what_do_you_do,
           about                 = EXCLUDED.about,
           legacy_priority       = EXCLUDED.legacy_priority`,
        params,
      );

      if (existing.rowCount && existing.rowCount > 0) updated += 1;
      else inserted += 1;
    }

    await tgt.query('COMMIT');
  } catch (err) {
    try {
      await tgt.query('ROLLBACK');
    } catch {
      /* ignore */
    }
    throw err;
  }

  console.log(`Inserted: ${inserted}`);
  console.log(`Updated:  ${updated}`);

  // --- Verification ---
  const totals = await tgt.query<{
    total: string;
    with_email: string;
    with_phone: string;
    with_both_narrative: string;
    unique_tokens: string;
  }>(
    `SELECT
       COUNT(*)::text AS total,
       COUNT(*) FILTER (WHERE email IS NOT NULL AND btrim(email) <> '')::text AS with_email,
       COUNT(*) FILTER (WHERE phone_clean IS NOT NULL AND btrim(phone_clean) <> '')::text AS with_phone,
       COUNT(*) FILTER (
         WHERE curious_about IS NOT NULL AND btrim(curious_about) <> ''
           AND surprising_knowledge IS NOT NULL AND btrim(surprising_knowledge) <> ''
       )::text AS with_both_narrative,
       COUNT(DISTINCT token)::text AS unique_tokens
     FROM lunchclub.prospects`,
  );
  const t = totals.rows[0];

  console.log('');
  console.log('=== lunchclub.prospects verification ===');
  console.log(`Total prospects:                       ${t.total}`);
  console.log(`With email:                            ${t.with_email}`);
  console.log(`With phone:                            ${t.with_phone}`);
  console.log(`With both curious_about + surprising:  ${t.with_both_narrative}`);
  console.log(
    `Tokens unique?                         ${t.unique_tokens === t.total ? 'yes' : `NO (${t.unique_tokens} unique vs ${t.total} rows)`}`,
  );

  const sample = await tgt.query<{
    first_name: string | null;
    last_name: string | null;
    token: string;
  }>(
    `SELECT first_name, last_name, token
     FROM lunchclub.prospects
     ORDER BY id
     LIMIT 5`,
  );
  console.log('');
  console.log('Sample (5 rows, names and tokens only):');
  for (const r of sample.rows) {
    const name = [r.first_name, r.last_name].filter(Boolean).join(' ') || '(no name)';
    console.log(`  ${name.padEnd(28)} ${r.token}`);
  }

  await src.end();
  await tgt.end();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
