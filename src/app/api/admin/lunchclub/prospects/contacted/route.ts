import { NextResponse } from 'next/server';
import { requireSuperAdmin } from '@/lib/auth/admin';
import { setProspectsContactedAt } from '@/lib/lunchclub/data';

export async function POST(req: Request) {
  await requireSuperAdmin();
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'invalid_json' }, { status: 400 });
  }
  const b = (body ?? {}) as Record<string, unknown>;
  const rawIds = Array.isArray(b.ids) ? b.ids : [];
  const ids = rawIds.filter((v): v is number => Number.isInteger(v) && (v as number) > 0);
  if (ids.length === 0) return NextResponse.json({ error: 'no_ids' }, { status: 400 });
  const updated = await setProspectsContactedAt(ids);
  return NextResponse.json({ ok: true, updated, contacted_at: new Date().toISOString() });
}
