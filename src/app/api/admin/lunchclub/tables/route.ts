import { NextResponse } from 'next/server';
import { getCurrentAdmin } from '@/lib/auth/admin';
import { createStandingTable } from '@/lib/lunchclub/data';

export const runtime = 'nodejs';

async function requireSuper() {
  const a = await getCurrentAdmin();
  if (!a || a.chapter_id !== null) return null;
  return a;
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
  const name = typeof body.name === 'string' ? body.name.trim() : '';
  const day = Number(body.day_of_week);
  if (!name || !Number.isInteger(day) || day < 0 || day > 6) {
    return NextResponse.json({ error: 'invalid_fields' }, { status: 400 });
  }
  const row = await createStandingTable({
    name,
    day_of_week: day,
    area: typeof body.area === 'string' ? body.area.trim() || null : null,
    default_venue:
      typeof body.default_venue === 'string' ? body.default_venue.trim() || null : null,
    default_address:
      typeof body.default_address === 'string'
        ? body.default_address.trim() || null
        : null,
  });
  return NextResponse.json({ ok: true, table: row });
}
