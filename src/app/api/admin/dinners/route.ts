import { NextResponse } from 'next/server';
import { requireSuperAdmin } from '@/lib/auth/admin';
import { createDinner, type DinnerInput } from '@/lib/dinners';
import { query } from '@/lib/db';
import { parseLAInput } from '@/lib/time';
import type { Dinner, DinnerStatus } from '@/lib/types';

const DINNER_STATUSES: ReadonlySet<DinnerStatus> = new Set<DinnerStatus>([
  'draft',
  'published',
  'sold_out',
  'cancelled',
  'completed',
]);

function numOrNull(v: unknown): number | null {
  if (typeof v === 'number' && Number.isFinite(v)) return v;
  if (typeof v === 'string' && v.trim() !== '') {
    const n = parseInt(v.trim(), 10);
    if (Number.isFinite(n)) return n;
  }
  return null;
}

function trOrNull(v: unknown): string | null {
  if (typeof v !== 'string') return null;
  const t = v.trim();
  return t.length === 0 ? null : t;
}

function parseDateInput(v: unknown): Date | null {
  if (v instanceof Date) return v;
  if (typeof v !== 'string') return null;
  const t = v.trim();
  if (!t) return null;
  // Accept ISO strings as-is, or "YYYY-MM-DD HH:mm" as LA local.
  if (/^\d{4}-\d{2}-\d{2}[T ]\d{2}:\d{2}(:\d{2})?(\.\d+)?(Z|[+-]\d{2}:?\d{2})$/.test(t)) {
    const d = new Date(t);
    return Number.isNaN(d.getTime()) ? null : d;
  }
  try {
    return parseLAInput(t);
  } catch {
    return null;
  }
}

export async function GET(req: Request) {
  await requireSuperAdmin();
  const url = new URL(req.url);
  const chapterIdParam = url.searchParams.get('chapter') ?? url.searchParams.get('chapter_id');
  const statusParam = url.searchParams.get('status');
  const params: unknown[] = [];
  const conds: string[] = [];
  if (chapterIdParam) {
    const cid = parseInt(chapterIdParam, 10);
    if (Number.isFinite(cid)) {
      params.push(cid);
      conds.push(`d.chapter_id = $${params.length}`);
    }
  }
  if (statusParam && DINNER_STATUSES.has(statusParam as DinnerStatus)) {
    params.push(statusParam);
    conds.push(`d.status = $${params.length}`);
  }
  const where = conds.length > 0 ? `WHERE ${conds.join(' AND ')}` : '';
  const rows = await query<
    Dinner & {
      chapter_short_name: string;
      chapter_display_name: string;
      venue_name: string;
      seats_used: string | null;
      waitlist_count: string | null;
    }
  >(
    `SELECT d.id, d.chapter_id, d.venue_id, d.title, d.starts_at, d.total_seats, d.price_cents,
            d.host_payout_cents, d.menu, d.description, d.parking_note, d.booking_cutoff_at,
            d.allows_couples, d.status, d.created_at, d.updated_at,
            c.short_name AS chapter_short_name, c.display_name AS chapter_display_name,
            v.name AS venue_name,
            COALESCE((SELECT SUM(seat_count) FROM reservations r
              WHERE r.dinner_id = d.id
                AND (r.status = 'confirmed'
                     OR (r.status = 'pending' AND r.pending_expires_at > NOW()))), 0)::text AS seats_used,
            COALESCE((SELECT COUNT(*) FROM waitlist_entries we
              WHERE we.dinner_id = d.id AND we.status IN ('pending','promoted')), 0)::text AS waitlist_count
     FROM dinners d
     JOIN chapters c ON c.id = d.chapter_id
     JOIN venues v ON v.id = d.venue_id
     ${where}
     ORDER BY d.starts_at DESC`,
    params,
  );
  return NextResponse.json({
    dinners: rows.map((r) => ({
      ...r,
      seats_used: parseInt(r.seats_used ?? '0', 10),
      waitlist_count: parseInt(r.waitlist_count ?? '0', 10),
    })),
  });
}

export async function POST(req: Request) {
  await requireSuperAdmin();
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'invalid_json' }, { status: 400 });
  }
  const b = body as Record<string, unknown>;
  const chapterId = numOrNull(b.chapter_id);
  const venueId = numOrNull(b.venue_id);
  const title = typeof b.title === 'string' ? b.title.trim() : '';
  const startsAt = parseDateInput(b.starts_at);
  const totalSeats = numOrNull(b.total_seats);
  const priceCents = numOrNull(b.price_cents);
  if (!chapterId) return NextResponse.json({ error: 'chapter_id_required' }, { status: 400 });
  if (!venueId) return NextResponse.json({ error: 'venue_id_required' }, { status: 400 });
  if (!title) return NextResponse.json({ error: 'title_required' }, { status: 400 });
  if (!startsAt) return NextResponse.json({ error: 'starts_at_invalid' }, { status: 400 });
  if (totalSeats === null || totalSeats <= 0) {
    return NextResponse.json({ error: 'total_seats_invalid' }, { status: 400 });
  }
  if (priceCents === null || priceCents < 0) {
    return NextResponse.json({ error: 'price_cents_invalid' }, { status: 400 });
  }
  const status =
    typeof b.status === 'string' && DINNER_STATUSES.has(b.status as DinnerStatus)
      ? (b.status as DinnerStatus)
      : 'draft';
  const input: DinnerInput = {
    chapter_id: chapterId,
    venue_id: venueId,
    title,
    starts_at: startsAt,
    total_seats: totalSeats,
    price_cents: priceCents,
    host_payout_cents: numOrNull(b.host_payout_cents),
    menu: trOrNull(b.menu),
    description: trOrNull(b.description),
    chef_name: trOrNull(b.chef_name),
    about_chef: trOrNull(b.about_chef),
    parking_note: trOrNull(b.parking_note),
    booking_cutoff_at: parseDateInput(b.booking_cutoff_at),
    allows_couples: typeof b.allows_couples === 'boolean' ? b.allows_couples : true,
    status,
  };
  const dinner = await createDinner(input);
  return NextResponse.json({ dinner });
}
