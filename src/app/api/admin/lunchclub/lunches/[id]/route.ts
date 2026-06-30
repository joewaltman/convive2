import { NextResponse } from 'next/server';
import { getCurrentAdmin } from '@/lib/auth/admin';
import { updateLunch } from '@/lib/lunchclub/data';

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

export async function PATCH(
  req: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  if (!(await requireSuper())) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }
  const { id } = await ctx.params;
  const lunchId = Number(id);
  if (!Number.isInteger(lunchId)) {
    return NextResponse.json({ error: 'invalid_id' }, { status: 400 });
  }
  let body;
  try {
    body = (await req.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: 'invalid_body' }, { status: 400 });
  }
  const patch: Parameters<typeof updateLunch>[1] = {};
  if (typeof body.venue === 'string') patch.venue = body.venue.trim();
  if (typeof body.address === 'string') patch.address = body.address.trim();
  if (isDateString(body.lunch_date)) patch.lunch_date = body.lunch_date;
  if (isTimeString(body.start_time)) patch.start_time = body.start_time;
  if (typeof body.price_cents === 'number' && Number.isInteger(body.price_cents) && body.price_cents > 0) {
    patch.price_cents = body.price_cents;
  }
  if (typeof body.total_seats === 'number' && Number.isInteger(body.total_seats) && body.total_seats > 0) {
    patch.total_seats = body.total_seats;
  }
  if (body.menu === null || typeof body.menu === 'string') {
    patch.menu = typeof body.menu === 'string' ? body.menu.trim() || null : null;
  }
  const row = await updateLunch(lunchId, patch);
  if (!row) return NextResponse.json({ error: 'not_found' }, { status: 404 });
  return NextResponse.json({ ok: true, lunch: row });
}
