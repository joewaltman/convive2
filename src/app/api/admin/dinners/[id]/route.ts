import { NextResponse } from 'next/server';
import { requireSuperAdmin } from '@/lib/auth/admin';
import {
  getDinnerByIdAdmin,
  updateDinner,
  deleteDinner,
  getDinnerWithRelations,
  type DinnerInput,
} from '@/lib/dinners';
import { parseLAInput } from '@/lib/time';
import type { DinnerStatus } from '@/lib/types';

const DINNER_STATUSES: ReadonlySet<DinnerStatus> = new Set<DinnerStatus>([
  'draft',
  'published',
  'sold_out',
  'cancelled',
  'completed',
]);

function parseId(s: string): number | null {
  const n = parseInt(s, 10);
  return Number.isFinite(n) && n > 0 ? n : null;
}

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

export async function GET(req: Request, ctx: { params: Promise<{ id: string }> }) {
  await requireSuperAdmin();
  const { id } = await ctx.params;
  const n = parseId(id);
  if (n === null) return NextResponse.json({ error: 'invalid_id' }, { status: 400 });
  const url = new URL(req.url);
  if (url.searchParams.get('with') === 'relations') {
    const bundle = await getDinnerWithRelations(n);
    if (!bundle) return NextResponse.json({ error: 'not_found' }, { status: 404 });
    return NextResponse.json(bundle);
  }
  const dinner = await getDinnerByIdAdmin(n);
  if (!dinner) return NextResponse.json({ error: 'not_found' }, { status: 404 });
  return NextResponse.json({ dinner });
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
  const patch: Partial<DinnerInput> = {};

  if ('chapter_id' in b) {
    const v = numOrNull(b.chapter_id);
    if (v !== null) patch.chapter_id = v;
  }
  if ('venue_id' in b) {
    const v = numOrNull(b.venue_id);
    if (v !== null) patch.venue_id = v;
  }
  if ('title' in b && typeof b.title === 'string' && b.title.trim()) {
    patch.title = b.title.trim();
  }
  if ('starts_at' in b) {
    const d = parseDateInput(b.starts_at);
    if (d) patch.starts_at = d;
    else return NextResponse.json({ error: 'starts_at_invalid' }, { status: 400 });
  }
  if ('total_seats' in b) {
    const v = numOrNull(b.total_seats);
    if (v !== null && v > 0) patch.total_seats = v;
  }
  if ('price_cents' in b) {
    const v = numOrNull(b.price_cents);
    if (v !== null && v >= 0) patch.price_cents = v;
  }
  if ('host_payout_cents' in b) patch.host_payout_cents = numOrNull(b.host_payout_cents);
  if ('menu' in b) patch.menu = trOrNull(b.menu);
  if ('description' in b) patch.description = trOrNull(b.description);
  if ('parking_note' in b) patch.parking_note = trOrNull(b.parking_note);
  if ('booking_cutoff_at' in b) {
    if (b.booking_cutoff_at === null || b.booking_cutoff_at === '') {
      patch.booking_cutoff_at = null;
    } else {
      const d = parseDateInput(b.booking_cutoff_at);
      if (d) patch.booking_cutoff_at = d;
    }
  }
  if ('allows_couples' in b && typeof b.allows_couples === 'boolean') {
    patch.allows_couples = b.allows_couples;
  }
  if (
    'status' in b &&
    typeof b.status === 'string' &&
    DINNER_STATUSES.has(b.status as DinnerStatus)
  ) {
    patch.status = b.status as DinnerStatus;
  }

  const dinner = await updateDinner(n, patch);
  if (!dinner) return NextResponse.json({ error: 'not_found' }, { status: 404 });
  return NextResponse.json({ dinner });
}

export async function DELETE(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  await requireSuperAdmin();
  const { id } = await ctx.params;
  const n = parseId(id);
  if (n === null) return NextResponse.json({ error: 'invalid_id' }, { status: 400 });
  await deleteDinner(n);
  return NextResponse.json({ ok: true });
}
