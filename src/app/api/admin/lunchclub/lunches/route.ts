import { NextResponse } from 'next/server';
import { getCurrentAdmin } from '@/lib/auth/admin';
import { createLunch } from '@/lib/lunchclub/data';

export const runtime = 'nodejs';

async function requireSuper() {
  const a = await getCurrentAdmin();
  if (!a || a.chapter_id !== null) return null;
  return a;
}

function isDateString(v: unknown): v is string {
  return typeof v === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(v);
}

function isTimeString(v: unknown): v is string {
  return typeof v === 'string' && /^\d{2}:\d{2}(:\d{2})?$/.test(v);
}

export async function POST(req: Request) {
  if (!(await requireSuper())) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }
  let body;
  try {
    body = (await req.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: 'invalid_body' }, { status: 400 });
  }
  const standingTableId = Number(body.standing_table_id);
  const venue = typeof body.venue === 'string' ? body.venue.trim() : '';
  const address = typeof body.address === 'string' ? body.address.trim() : '';
  const lunchDate = body.lunch_date;
  const startTime = body.start_time;
  const priceCents = Number(body.price_cents);
  if (
    !Number.isInteger(standingTableId) ||
    !venue ||
    !address ||
    !isDateString(lunchDate) ||
    !isTimeString(startTime) ||
    !Number.isInteger(priceCents) ||
    priceCents <= 0
  ) {
    return NextResponse.json({ error: 'invalid_fields' }, { status: 400 });
  }
  const totalSeats =
    typeof body.total_seats === 'number' && Number.isInteger(body.total_seats) && body.total_seats > 0
      ? body.total_seats
      : 6;
  const menu = typeof body.menu === 'string' ? body.menu.trim() || null : null;
  const lunch = await createLunch({
    standing_table_id: standingTableId,
    venue,
    address,
    lunch_date: lunchDate,
    start_time: startTime,
    price_cents: priceCents,
    total_seats: totalSeats,
    menu,
  });
  return NextResponse.json({ ok: true, lunch });
}
