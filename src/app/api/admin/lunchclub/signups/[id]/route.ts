import { NextResponse } from 'next/server';
import { requireSuperAdmin } from '@/lib/auth/admin';
import { updateSignupAdmin } from '@/lib/lunchclub/data';
import type { SignupStatus } from '@/lib/lunchclub/types';

const STATUSES: ReadonlySet<SignupStatus> = new Set<SignupStatus>([
  'new',
  'contacted',
  'invited',
  'seated',
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
  const b = (body ?? {}) as Record<string, unknown>;

  const patch: { status?: SignupStatus; arm?: 'A' | 'C' | null; admin_note?: string | null } = {};

  if ('status' in b) {
    if (typeof b.status !== 'string' || !STATUSES.has(b.status as SignupStatus)) {
      return NextResponse.json({ error: 'invalid_status' }, { status: 400 });
    }
    patch.status = b.status as SignupStatus;
  }

  if ('arm' in b) {
    if (b.arm === null) {
      patch.arm = null;
    } else if (b.arm === 'A' || b.arm === 'C') {
      patch.arm = b.arm;
    } else {
      return NextResponse.json({ error: 'invalid_arm' }, { status: 400 });
    }
  }

  if ('admin_note' in b) {
    if (b.admin_note === null) {
      patch.admin_note = null;
    } else if (typeof b.admin_note === 'string') {
      const t = b.admin_note.trim();
      patch.admin_note = t.length === 0 ? null : t;
    } else {
      return NextResponse.json({ error: 'invalid_admin_note' }, { status: 400 });
    }
  }

  if (Object.keys(patch).length === 0) {
    return NextResponse.json({ error: 'no_fields' }, { status: 400 });
  }

  const row = await updateSignupAdmin(n, patch);
  if (!row) return NextResponse.json({ error: 'not_found' }, { status: 404 });
  return NextResponse.json({ signup: row });
}
