import { NextResponse } from 'next/server';
import { getCurrentAdmin } from '@/lib/auth/admin';
import { seatMemberAtTable } from '@/lib/lunchclub/data';

export const runtime = 'nodejs';

async function requireSuper() {
  const a = await getCurrentAdmin();
  if (!a || a.chapter_id !== null) return null;
  return a;
}

export async function POST(
  req: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  if (!(await requireSuper())) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }
  const { id } = await ctx.params;
  const tableId = Number(id);
  if (!Number.isInteger(tableId)) {
    return NextResponse.json({ error: 'invalid_id' }, { status: 400 });
  }
  let body;
  try {
    body = (await req.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: 'invalid_body' }, { status: 400 });
  }
  const signupId = Number(body.signup_id);
  const seatsRaw = Number(body.seats ?? 1);
  if (!Number.isInteger(signupId)) {
    return NextResponse.json({ error: 'invalid_signup_id' }, { status: 400 });
  }
  if (seatsRaw !== 1 && seatsRaw !== 2) {
    return NextResponse.json({ error: 'invalid_seats' }, { status: 400 });
  }
  const member = await seatMemberAtTable(tableId, signupId, seatsRaw as 1 | 2);
  return NextResponse.json({ ok: true, member });
}
