import { NextResponse } from 'next/server';
import { requireSuperAdmin } from '@/lib/auth/admin';
import { getChapterById, updateChapter, deleteChapter, type ChapterInput } from '@/lib/chapters';

function parseId(s: string): number | null {
  const n = parseInt(s, 10);
  return Number.isFinite(n) && n > 0 ? n : null;
}

export async function GET(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  await requireSuperAdmin();
  const { id } = await ctx.params;
  const n = parseId(id);
  if (n === null) return NextResponse.json({ error: 'invalid_id' }, { status: 400 });
  const chapter = await getChapterById(n);
  if (!chapter) return NextResponse.json({ error: 'not_found' }, { status: 404 });
  return NextResponse.json({ chapter });
}

const STRING_FIELDS: Array<keyof ChapterInput> = [
  'slug',
  'short_name',
  'school_name',
  'display_name',
  'from_display_name',
  'color_primary',
  'color_secondary',
  'color_header_bg',
  'color_header_text',
  'color_accent',
  'font_family',
];

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
  const patch: Partial<ChapterInput> = {};
  for (const k of STRING_FIELDS) {
    if (k in b) {
      const v = b[k];
      if (typeof v === 'string') {
        const t = v.trim();
        if (t.length > 0) (patch as Record<string, unknown>)[k] = t;
      }
    }
  }
  if ('tagline' in b) {
    const v = b.tagline;
    if (typeof v === 'string') {
      const t = v.trim();
      patch.tagline = t.length === 0 ? null : t;
    } else if (v === null) {
      patch.tagline = null;
    }
  }
  if ('is_active' in b && typeof b.is_active === 'boolean') {
    patch.is_active = b.is_active;
  }
  const chapter = await updateChapter(n, patch);
  if (!chapter) return NextResponse.json({ error: 'not_found' }, { status: 404 });
  return NextResponse.json({ chapter });
}

export async function DELETE(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  await requireSuperAdmin();
  const { id } = await ctx.params;
  const n = parseId(id);
  if (n === null) return NextResponse.json({ error: 'invalid_id' }, { status: 400 });
  await deleteChapter(n);
  return NextResponse.json({ ok: true });
}
