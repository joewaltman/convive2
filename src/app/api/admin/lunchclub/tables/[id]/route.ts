import { NextResponse } from 'next/server';
import { getCurrentAdmin } from '@/lib/auth/admin';
import { updateStandingTable } from '@/lib/lunchclub/data';
import type { TableStatus } from '@/lib/lunchclub/types';

export const runtime = 'nodejs';

const TABLE_STATUSES: ReadonlySet<TableStatus> = new Set([
  'forming',
  'active',
  'paused',
]);

async function requireSuper() {
  const a = await getCurrentAdmin();
  if (!a || a.chapter_id !== null) return null;
  return a;
}

export async function PATCH(
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
  const patch: Parameters<typeof updateStandingTable>[1] = {};
  if (typeof body.name === 'string') patch.name = body.name.trim();
  if (typeof body.day_of_week === 'number' && Number.isInteger(body.day_of_week) && body.day_of_week >= 0 && body.day_of_week <= 6) {
    patch.day_of_week = body.day_of_week;
  }
  if (body.area === null || typeof body.area === 'string') {
    patch.area = typeof body.area === 'string' ? body.area.trim() || null : null;
  }
  if (body.default_venue === null || typeof body.default_venue === 'string') {
    patch.default_venue =
      typeof body.default_venue === 'string' ? body.default_venue.trim() || null : null;
  }
  if (body.default_address === null || typeof body.default_address === 'string') {
    patch.default_address =
      typeof body.default_address === 'string'
        ? body.default_address.trim() || null
        : null;
  }
  if (typeof body.status === 'string' && (TABLE_STATUSES as Set<string>).has(body.status)) {
    patch.status = body.status as TableStatus;
  }
  const row = await updateStandingTable(tableId, patch);
  if (!row) return NextResponse.json({ error: 'not_found' }, { status: 404 });
  return NextResponse.json({ ok: true, table: row });
}
