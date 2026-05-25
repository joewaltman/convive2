import { query } from './lib/db';
import { runCronJob } from './lib/runCron';
import type { JobSummary } from './lib/types';

async function expirePendingReservationsBody(opts: {
  dryRun: boolean;
  dinnerId?: number;
  limit?: number;
}): Promise<JobSummary> {
  if (opts.dryRun) {
    const params: unknown[] = [];
    let dinnerClause = '';
    if (opts.dinnerId) {
      params.push(opts.dinnerId);
      dinnerClause = ` AND dinner_id = $${params.length}`;
    }
    const rows = await query<{ id: number }>(
      `SELECT id FROM reservations
       WHERE status = 'pending' AND pending_expires_at < NOW()
         AND waitlist_entry_id IS NULL${dinnerClause}`,
      params,
    );
    const limited =
      opts.limit && Number.isFinite(opts.limit) && opts.limit > 0
        ? rows.slice(0, opts.limit)
        : rows;
    return { cancelled: limited.length, dryRun: true };
  }

  const params: unknown[] = [];
  let dinnerClause = '';
  if (opts.dinnerId) {
    params.push(opts.dinnerId);
    dinnerClause = ` AND dinner_id = $${params.length}`;
  }
  let limitClause = '';
  if (opts.limit && Number.isFinite(opts.limit) && opts.limit > 0) {
    params.push(opts.limit);
    limitClause = `
       AND id IN (
         SELECT id FROM reservations
         WHERE status = 'pending' AND pending_expires_at < NOW() AND waitlist_entry_id IS NULL${dinnerClause}
         ORDER BY id ASC
         LIMIT $${params.length}
       )`;
    const rows = await query<{ id: number }>(
      `UPDATE reservations
       SET status = 'cancelled', cancelled_at = NOW(), pending_expires_at = NULL,
           updated_at = NOW()
       WHERE status = 'pending' AND pending_expires_at < NOW() AND waitlist_entry_id IS NULL${limitClause}
       RETURNING id`,
      params,
    );
    return { cancelled: rows.length };
  }

  const rows = await query<{ id: number }>(
    `UPDATE reservations
     SET status = 'cancelled', cancelled_at = NOW(), pending_expires_at = NULL,
         updated_at = NOW()
     WHERE status = 'pending' AND pending_expires_at < NOW() AND waitlist_entry_id IS NULL${dinnerClause}
     RETURNING id`,
    params,
  );
  return { cancelled: rows.length };
}

function parseArgs(): { dryRun: boolean; dinnerId?: number; limit?: number } {
  const args = process.argv.slice(2);
  const opts: { dryRun: boolean; dinnerId?: number; limit?: number } = { dryRun: false };
  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--dry-run') {
      opts.dryRun = true;
    } else if (args[i] === '--dinner-id' && args[i + 1]) {
      opts.dinnerId = parseInt(args[++i], 10);
    } else if (args[i] === '--limit' && args[i + 1]) {
      opts.limit = parseInt(args[++i], 10);
    }
  }
  return opts;
}

export async function main(): Promise<JobSummary> {
  const opts = parseArgs();
  console.log('[expire-pending-reservations] starting with opts:', opts);
  const summary = await runCronJob('expire_pending_reservations', expirePendingReservationsBody, opts);
  console.log('[expire-pending-reservations] summary:', summary);
  return summary;
}

if (require.main === module) {
  main()
    .then(() => process.exit(0))
    .catch((err) => {
      console.error('[expire-pending-reservations] fatal:', err);
      process.exit(1);
    });
}
