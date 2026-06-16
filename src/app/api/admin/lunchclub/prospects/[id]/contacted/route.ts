import { NextResponse } from 'next/server';
import { requireSuperAdmin } from '@/lib/auth/admin';
import { setProspectContactedAt } from '@/lib/lunchclub/data';

function parseId(s: string): number | null {
  const n = parseInt(s, 10);
  return Number.isFinite(n) && n > 0 ? n : null;
}

export async function POST(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  await requireSuperAdmin();
  const { id } = await ctx.params;
  const n = parseId(id);
  if (n === null) return NextResponse.json({ error: 'invalid_id' }, { status: 400 });
  const ok = await setProspectContactedAt(n);
  if (!ok) return NextResponse.json({ error: 'not_found' }, { status: 404 });
  return NextResponse.json({ ok: true, contacted_at: new Date().toISOString() });
}
