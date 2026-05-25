import { pool, query } from './db';
import type { WaitlistEntry } from './types';
import { promoteOldestPendingInTx } from './reservations';
import type { PoolClient } from 'pg';

const COLS = `id, dinner_id, chapter_id, guest_id, status, promoted_at, notified_at,
  created_at, updated_at`;

export interface JoinWaitlistResult {
  entry: WaitlistEntry;
  alreadyOnWaitlist: boolean;
}

export async function joinWaitlist(args: {
  dinnerId: number;
  chapterId: number;
  guestId: number;
}): Promise<JoinWaitlistResult> {
  try {
    const rows = await query<WaitlistEntry>(
      `INSERT INTO waitlist_entries (dinner_id, chapter_id, guest_id)
       VALUES ($1, $2, $3)
       RETURNING ${COLS}`,
      [args.dinnerId, args.chapterId, args.guestId],
    );
    return { entry: rows[0], alreadyOnWaitlist: false };
  } catch (err: unknown) {
    const e = err as { code?: string };
    if (e?.code === '23505') {
      const rows = await query<WaitlistEntry>(
        `SELECT ${COLS} FROM waitlist_entries
         WHERE dinner_id = $1 AND guest_id = $2 AND status IN ('pending','promoted')`,
        [args.dinnerId, args.guestId],
      );
      return { entry: rows[0], alreadyOnWaitlist: true };
    }
    throw err;
  }
}

export async function listWaitlistForDinner(dinnerId: number): Promise<WaitlistEntry[]> {
  return query<WaitlistEntry>(
    `SELECT ${COLS} FROM waitlist_entries WHERE dinner_id = $1 ORDER BY created_at ASC`,
    [dinnerId],
  );
}

/** For the process-waitlist cron: returns promoted entries whose claim window has passed. */
export async function findExpiredPromoted(now: Date = new Date()): Promise<
  Array<{
    entry_id: number;
    dinner_id: number;
    chapter_id: number;
    reservation_id: number | null;
  }>
> {
  return query<{ entry_id: number; dinner_id: number; chapter_id: number; reservation_id: number | null }>(
    `SELECT we.id AS entry_id, we.dinner_id, we.chapter_id,
            (SELECT r.id FROM reservations r
              WHERE r.waitlist_entry_id = we.id AND r.status = 'pending'
              ORDER BY r.created_at DESC LIMIT 1) AS reservation_id
     FROM waitlist_entries we
     WHERE we.status = 'promoted'
       AND we.notified_at < $1 - INTERVAL '24 hours'`,
    [now],
  );
}

/**
 * Cancel the pending reservation for an expired promoted entry, mark entry expired,
 * then attempt to promote the next pending entry. Returns next-promotion info if any.
 */
export async function expirePromotedEntry(
  entryId: number,
): Promise<{
  expiredEntryId: number;
  expiredReservationId: number | null;
  nextPromotion: { newReservationId: number; guestId: number; waitlistEntryId: number } | null;
} | null> {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const entryRows = await client.query<{
      id: number;
      dinner_id: number;
      chapter_id: number;
      status: string;
    }>(
      `SELECT id, dinner_id, chapter_id, status FROM waitlist_entries
       WHERE id = $1 FOR UPDATE`,
      [entryId],
    );
    if (!entryRows.rows.length || entryRows.rows[0].status !== 'promoted') {
      await client.query('ROLLBACK');
      return null;
    }
    const entry = entryRows.rows[0];

    const resRows = await client.query<{ id: number; status: string }>(
      `SELECT id, status FROM reservations
       WHERE waitlist_entry_id = $1 AND status = 'pending'
       ORDER BY created_at DESC LIMIT 1
       FOR UPDATE`,
      [entryId],
    );
    let cancelledResId: number | null = null;
    if (resRows.rows.length) {
      cancelledResId = resRows.rows[0].id;
      await client.query(
        `UPDATE reservations SET status='cancelled', cancelled_at=NOW(),
           pending_expires_at=NULL, updated_at=NOW() WHERE id=$1`,
        [cancelledResId],
      );
    }

    await client.query(
      `UPDATE waitlist_entries SET status='expired', updated_at=NOW() WHERE id=$1`,
      [entryId],
    );

    const promoted = await promoteOldestPendingInTx(client, entry.dinner_id, entry.chapter_id);

    await client.query('COMMIT');
    return {
      expiredEntryId: entryId,
      expiredReservationId: cancelledResId,
      nextPromotion: promoted
        ? {
            newReservationId: promoted.newReservation.id,
            guestId: promoted.guestId,
            waitlistEntryId: promoted.waitlistEntryId,
          }
        : null,
    };
  } catch (err) {
    try { await client.query('ROLLBACK'); } catch { /* ignore */ }
    throw err;
  } finally {
    client.release();
  }
}

export async function getWaitlistEntryById(id: number): Promise<WaitlistEntry | null> {
  const rows = await query<WaitlistEntry>(`SELECT ${COLS} FROM waitlist_entries WHERE id = $1`, [id]);
  return rows[0] ?? null;
}

export { promoteOldestPendingInTx };
export type { PoolClient };
