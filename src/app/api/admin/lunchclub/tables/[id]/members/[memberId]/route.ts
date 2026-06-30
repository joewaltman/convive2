import { NextResponse } from 'next/server';
import { getCurrentAdmin } from '@/lib/auth/admin';
import { releaseMember } from '@/lib/lunchclub/data';

export const runtime = 'nodejs';

async function requireSuper() {
  const a = await getCurrentAdmin();
  if (!a || a.chapter_id !== null) return null;
  return a;
}

export async function PATCH(
  req: Request,
  ctx: { params: Promise<{ id: string; memberId: string }> },
) {
  if (!(await requireSuper())) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }
  const { memberId } = await ctx.params;
  const id = Number(memberId);
  if (!Number.isInteger(id)) {
    return NextResponse.json({ error: 'invalid_id' }, { status: 400 });
  }
  let body;
  try {
    body = (await req.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: 'invalid_body' }, { status: 400 });
  }
  if (body.status !== 'released') {
    return NextResponse.json({ error: 'unsupported_status' }, { status: 400 });
  }
  const row = await releaseMember(id);
  if (!row) return NextResponse.json({ error: 'not_found' }, { status: 404 });
  return NextResponse.json({ ok: true, member: row });
}
