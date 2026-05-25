import { query } from '@/lib/db';
import type { JobSummary } from '@/lib/types';

export async function expirePendingReservationsBody(opts: {
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
