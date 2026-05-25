import { NextResponse } from 'next/server';
import { requireSuperAdmin } from '@/lib/auth/admin';
import { query } from '@/lib/db';
import type { ReservationStatus } from '@/lib/types';

const STATUSES: ReadonlySet<ReservationStatus> = new Set<ReservationStatus>([
  'pending',
  'confirmed',
  'cancelled',
]);

export async function GET(req: Request) {
  await requireSuperAdmin();
  const url = new URL(req.url);
  const dinnerIdRaw = url.searchParams.get('dinner_id');
  const statusRaw = url.searchParams.get('status');
  const emailRaw = url.searchParams.get('email');

  const params: unknown[] = [];
  const conds: string[] = [];
  if (dinnerIdRaw) {
    const id = parseInt(dinnerIdRaw, 10);
    if (Number.isFinite(id)) {
      params.push(id);
      conds.push(`r.dinner_id = $${params.length}`);
    }
  }
  if (statusRaw && STATUSES.has(statusRaw as ReservationStatus)) {
    params.push(statusRaw);
    conds.push(`r.status = $${params.length}`);
  }
  if (emailRaw && emailRaw.trim()) {
    params.push(`%${emailRaw.trim().toLowerCase()}%`);
    conds.push(`LOWER(g.email) LIKE $${params.length}`);
  }
  const where = conds.length > 0 ? `WHERE ${conds.join(' AND ')}` : '';

  const rows = await query(
    `SELECT r.id, r.guest_id, r.dinner_id, r.chapter_id, r.grad_year, r.major,
            r.brings_partner, r.seat_count, r.status, r.amount_paid_cents,
            r.pending_expires_at, r.booked_at, r.confirmed_at, r.cancelled_at,
            r.reminder_sent_at, r.post_dinner_sent_at, r.created_at,
            g.email AS guest_email, g.first_name AS guest_first_name, g.last_name AS guest_last_name,
            d.title AS dinner_title, d.starts_at AS dinner_starts_at,
            c.short_name AS chapter_short_name
     FROM reservations r
     JOIN guests g ON g.id = r.guest_id
     JOIN dinners d ON d.id = r.dinner_id
     JOIN chapters c ON c.id = r.chapter_id
     ${where}
     ORDER BY r.created_at DESC
     LIMIT 500`,
    params,
  );
  return NextResponse.json({ reservations: rows });
}
