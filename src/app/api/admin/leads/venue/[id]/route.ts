import { NextResponse } from 'next/server';
import { requireSuperAdmin } from '@/lib/auth/admin';
import { updateVenueLead, type VenueLead } from '@/lib/leads';

const STATUSES: ReadonlySet<VenueLead['status']> = new Set<VenueLead['status']>([
  'new',
  'contacted',
  'visited',
  'partnered',
  'declined',
]);

function parseId(s: string): number | null {
  const n = parseInt(s, 10);
  return Number.isFinite(n) && n > 0 ? n : null;
}

export async function PATCH(req: Request, ctx: { params: Promise<{ id: string }> }) {
  await requireSuperAdmin();
  const { id } = await ctx.params;
  const n = parseId(id);
  if (n === null) return NextResponse.json({ error: 'invalid_id' }, { status: 400 });

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'invalid_json' }, { status: 400 });
  }
  const b = body as Record<string, unknown>;
  const patch: Partial<Pick<VenueLead, 'status' | 'internal_notes'>> = {};
  if (typeof b.status === 'string' && STATUSES.has(b.status as VenueLead['status'])) {
    patch.status = b.status as VenueLead['status'];
  }
  if ('internal_notes' in b) {
    if (b.internal_notes === null) patch.internal_notes = null;
    else if (typeof b.internal_notes === 'string') {
      const t = b.internal_notes.trim();
      patch.internal_notes = t.length === 0 ? null : t;
    }
  }
  const lead = await updateVenueLead(n, patch);
  if (!lead) return NextResponse.json({ error: 'not_found' }, { status: 404 });
  return NextResponse.json({ lead });
}
