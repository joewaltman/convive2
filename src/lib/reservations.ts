import { pool, query } from './db';
import { generateUrlSafeToken } from './tokens';
import type { Reservation } from './types';
import type { PoolClient } from 'pg';

const COLS = `id, guest_id, dinner_id, chapter_id, grad_year, major, brings_partner, seat_count,
  status, amount_paid_cents, stripe_checkout_session_id, stripe_payment_intent_id,
  confirm_token, cancel_token, calendar_token, survey_token, pending_expires_at, waitlist_entry_id,
  booked_at, confirmed_at, cancelled_at, reminder_sent_at, post_dinner_sent_at,
  created_at, updated_at`;

export interface StartReservationArgs {
  guestId: number;
  dinnerId: number;
  gradYear: number;
  major: string | null;
  bringsPartner: boolean;
}

export type StartReservationResult =
  | { ok: true; reservation: Reservation }
  | { ok: false; fullForBooking: true }
  | { ok: false; alreadyBooked: true };

/**
 * Atomically check capacity and insert a pending reservation.
 * Returns { fullForBooking: true } if there isn't enough capacity, or
 * { alreadyBooked: true } if this guest already has a confirmed or
 * active pending reservation for this dinner.
 */
export async function startReservation(args: StartReservationArgs): Promise<StartReservationResult> {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const dinnerRows = await client.query<{
      id: number;
      total_seats: number;
      chapter_id: number;
      allows_couples: boolean;
    }>(
      `SELECT id, total_seats, chapter_id, allows_couples FROM dinners WHERE id = $1 FOR UPDATE`,
      [args.dinnerId],
    );
    if (!dinnerRows.rows.length) throw new Error('Dinner not found');
    const dinner = dinnerRows.rows[0];

    // Block duplicate bookings: confirmed, or pending whose hold hasn't expired.
    const dupRows = await client.query<{ id: number }>(
      `SELECT id FROM reservations
       WHERE guest_id = $1 AND dinner_id = $2
         AND (status = 'confirmed' OR (status = 'pending' AND pending_expires_at > NOW()))
       LIMIT 1`,
      [args.guestId, args.dinnerId],
    );
    if (dupRows.rows.length > 0) {
      await client.query('ROLLBACK');
      return { ok: false, alreadyBooked: true };
    }

    const usedRows = await client.query<{ used: string }>(
      `SELECT COALESCE(SUM(seat_count), 0)::text AS used
       FROM reservations
       WHERE dinner_id = $1
         AND (status = 'confirmed' OR (status = 'pending' AND pending_expires_at > NOW()))`,
      [args.dinnerId],
    );
    const used = parseInt(usedRows.rows[0].used, 10);
    const bringsPartner = args.bringsPartner && dinner.allows_couples;
    const requestedSeats = bringsPartner ? 2 : 1;

    if (used + requestedSeats > dinner.total_seats) {
      await client.query('ROLLBACK');
      return { ok: false, fullForBooking: true };
    }

    const tokens = {
      confirm_token: generateUrlSafeToken(),
      cancel_token: generateUrlSafeToken(),
      calendar_token: generateUrlSafeToken(),
      survey_token: generateUrlSafeToken(),
    };

    const ins = await client.query<Reservation>(
      `INSERT INTO reservations (guest_id, dinner_id, chapter_id, grad_year, major,
         brings_partner, seat_count, status, confirm_token, cancel_token, calendar_token,
         survey_token, pending_expires_at, booked_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, 'pending', $8, $9, $10, $11,
               NOW() + INTERVAL '30 minutes', NOW())
       RETURNING ${COLS}`,
      [
        args.guestId,
        args.dinnerId,
        dinner.chapter_id,
        args.gradYear,
        args.major,
        bringsPartner,
        requestedSeats,
        tokens.confirm_token,
        tokens.cancel_token,
        tokens.calendar_token,
        tokens.survey_token,
      ],
    );

    await client.query('COMMIT');
    return { ok: true, reservation: ins.rows[0] };
  } catch (err) {
    try { await client.query('ROLLBACK'); } catch { /* ignore */ }
    throw err;
  } finally {
    client.release();
  }
}

export async function getReservationById(id: number): Promise<Reservation | null> {
  const rows = await query<Reservation>(`SELECT ${COLS} FROM reservations WHERE id = $1`, [id]);
  return rows[0] ?? null;
}

export async function getReservationByConfirmToken(token: string): Promise<Reservation | null> {
  const rows = await query<Reservation>(
    `SELECT ${COLS} FROM reservations WHERE confirm_token = $1`,
    [token],
  );
  return rows[0] ?? null;
}

export async function getReservationByCancelToken(token: string): Promise<Reservation | null> {
  const rows = await query<Reservation>(
    `SELECT ${COLS} FROM reservations WHERE cancel_token = $1`,
    [token],
  );
  return rows[0] ?? null;
}

export async function getReservationByCalendarToken(token: string): Promise<Reservation | null> {
  const rows = await query<Reservation>(
    `SELECT ${COLS} FROM reservations WHERE calendar_token = $1`,
    [token],
  );
  return rows[0] ?? null;
}

export async function getReservationBySurveyToken(token: string): Promise<Reservation | null> {
  const rows = await query<Reservation>(
    `SELECT ${COLS} FROM reservations WHERE survey_token = $1`,
    [token],
  );
  return rows[0] ?? null;
}

export async function getReservationByCheckoutSession(sessionId: string): Promise<Reservation | null> {
  const rows = await query<Reservation>(
    `SELECT ${COLS} FROM reservations WHERE stripe_checkout_session_id = $1`,
    [sessionId],
  );
  return rows[0] ?? null;
}

export async function listReservationsForGuest(guestId: number): Promise<Reservation[]> {
  return query<Reservation>(
    `SELECT ${COLS} FROM reservations WHERE guest_id = $1
     ORDER BY created_at DESC`,
    [guestId],
  );
}

export async function attachCheckoutSession(
  reservationId: number,
  stripeSessionId: string,
): Promise<void> {
  await query(
    `UPDATE reservations SET stripe_checkout_session_id = $2, updated_at = NOW() WHERE id = $1`,
    [reservationId, stripeSessionId],
  );
}

export async function markConfirmedFromWebhook(args: {
  reservationId: number;
  amountPaidCents: number;
  paymentIntentId: string | null;
}): Promise<Reservation | null> {
  const rows = await query<Reservation>(
    `UPDATE reservations
     SET status = 'confirmed', confirmed_at = NOW(),
         amount_paid_cents = $2, stripe_payment_intent_id = $3,
         pending_expires_at = NULL, updated_at = NOW()
     WHERE id = $1 AND status != 'confirmed'
     RETURNING ${COLS}`,
    [args.reservationId, args.amountPaidCents, args.paymentIntentId],
  );
  return rows[0] ?? null;
}

/** Convenience: bulk seat-and-waitlist details for the admin views */
export async function listReservationsForDinner(dinnerId: number): Promise<Reservation[]> {
  return query<Reservation>(
    `SELECT ${COLS} FROM reservations WHERE dinner_id = $1 ORDER BY created_at ASC`,
    [dinnerId],
  );
}

export interface CancelReservationResult {
  cancelled: Reservation;
  promoted?: {
    newReservation: Reservation;
    waitlistEntryId: number;
    guestId: number;
  };
}

/**
 * Atomically cancel a reservation and promote the oldest pending waitlist entry, if any.
 * Returns the cancelled reservation and optional promotion info.
 */
export async function cancelReservation(reservationId: number): Promise<CancelReservationResult | null> {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const resRows = await client.query<Reservation>(
      `SELECT ${COLS} FROM reservations WHERE id = $1 FOR UPDATE`,
      [reservationId],
    );
    if (!resRows.rows.length) {
      await client.query('ROLLBACK');
      return null;
    }
    const reservation = resRows.rows[0];
    if (reservation.status === 'cancelled') {
      await client.query('ROLLBACK');
      return { cancelled: reservation };
    }

    const cancelRows = await client.query<Reservation>(
      `UPDATE reservations
       SET status = 'cancelled', cancelled_at = NOW(), pending_expires_at = NULL,
           updated_at = NOW()
       WHERE id = $1
       RETURNING ${COLS}`,
      [reservationId],
    );
    const cancelled = cancelRows.rows[0];

    const promoted = await promoteOldestPendingInTx(client, reservation.dinner_id, reservation.chapter_id);

    await client.query('COMMIT');
    return promoted ? { cancelled, promoted } : { cancelled };
  } catch (err) {
    try { await client.query('ROLLBACK'); } catch { /* ignore */ }
    throw err;
  } finally {
    client.release();
  }
}

/**
 * Try to promote the oldest pending waitlist entry for a dinner.
 * Must be called inside an active transaction.
 */
export async function promoteOldestPendingInTx(
  client: PoolClient,
  dinnerId: number,
  chapterId: number,
): Promise<{ newReservation: Reservation; waitlistEntryId: number; guestId: number } | null> {
  const candidate = await client.query<{ id: number; guest_id: number; chapter_id: number }>(
    `SELECT id, guest_id, chapter_id
     FROM waitlist_entries
     WHERE dinner_id = $1 AND status = 'pending'
     ORDER BY created_at ASC
     LIMIT 1
     FOR UPDATE SKIP LOCKED`,
    [dinnerId],
  );
  if (!candidate.rows.length) return null;
  const entry = candidate.rows[0];

  // Re-check that there is room. Promotion creates a single-seat hold.
  const usedRows = await client.query<{ used: string; total_seats: number }>(
    `SELECT COALESCE(SUM(r.seat_count), 0)::text AS used, d.total_seats
     FROM dinners d
     LEFT JOIN reservations r ON r.dinner_id = d.id
       AND (r.status = 'confirmed' OR (r.status = 'pending' AND r.pending_expires_at > NOW()))
     WHERE d.id = $1
     GROUP BY d.total_seats`,
    [dinnerId],
  );
  if (!usedRows.rows.length) return null;
  const used = parseInt(usedRows.rows[0].used, 10);
  const totalSeats = usedRows.rows[0].total_seats;
  if (used + 1 > totalSeats) return null;

  // Pull guest's prior grad_year/major from most recent reservation if any; required by NOT NULL
  const priorRows = await client.query<{ grad_year: number; major: string | null }>(
    `SELECT grad_year, major FROM reservations
     WHERE guest_id = $1 ORDER BY created_at DESC LIMIT 1`,
    [entry.guest_id],
  );
  const gradYear = priorRows.rows[0]?.grad_year ?? 0;
  const major = priorRows.rows[0]?.major ?? null;

  const tokens = {
    confirm_token: generateUrlSafeToken(),
    cancel_token: generateUrlSafeToken(),
    calendar_token: generateUrlSafeToken(),
    survey_token: generateUrlSafeToken(),
  };

  const newRes = await client.query<Reservation>(
    `INSERT INTO reservations (guest_id, dinner_id, chapter_id, grad_year, major,
       brings_partner, seat_count, status, confirm_token, cancel_token, calendar_token,
       survey_token, pending_expires_at, waitlist_entry_id, booked_at)
     VALUES ($1, $2, $3, $4, $5, false, 1, 'pending', $6, $7, $8, $9,
             NOW() + INTERVAL '24 hours', $10, NOW())
     RETURNING ${COLS}`,
    [
      entry.guest_id,
      dinnerId,
      chapterId,
      gradYear,
      major,
      tokens.confirm_token,
      tokens.cancel_token,
      tokens.calendar_token,
      tokens.survey_token,
      entry.id,
    ],
  );

  await client.query(
    `UPDATE waitlist_entries
     SET status = 'promoted', promoted_at = NOW(), notified_at = NOW(), updated_at = NOW()
     WHERE id = $1`,
    [entry.id],
  );

  return { newReservation: newRes.rows[0], waitlistEntryId: entry.id, guestId: entry.guest_id };
}

export { pool };
