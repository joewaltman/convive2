import { NextResponse } from 'next/server';
import { requireSuperAdmin } from '@/lib/auth/admin';
import { listAllChapters, createChapter, type ChapterInput } from '@/lib/chapters';

export async function GET() {
  await requireSuperAdmin();
  const rows = await listAllChapters();
  return NextResponse.json({ chapters: rows });
}

function tr(v: unknown): string {
  return typeof v === 'string' ? v.trim() : '';
}

function trOrNull(v: unknown): string | null {
  if (typeof v !== 'string') return null;
  const t = v.trim();
  return t.length === 0 ? null : t;
}

export async function POST(req: Request) {
  await requireSuperAdmin();
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'invalid_json' }, { status: 400 });
  }
  const b = body as Record<string, unknown>;
  const required = [
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
  ] as const;
  for (const k of required) {
    if (!tr(b[k])) {
      return NextResponse.json({ error: `${k}_required` }, { status: 400 });
    }
  }
  const input: ChapterInput = {
    slug: tr(b.slug),
    short_name: tr(b.short_name),
    school_name: tr(b.school_name),
    display_name: tr(b.display_name),
    tagline: trOrNull(b.tagline),
    from_display_name: tr(b.from_display_name),
    color_primary: tr(b.color_primary),
    color_secondary: tr(b.color_secondary),
    color_header_bg: tr(b.color_header_bg),
    color_header_text: tr(b.color_header_text),
    color_accent: tr(b.color_accent),
    font_family: typeof b.font_family === 'string' && b.font_family.trim() ? b.font_family.trim() : undefined,
    is_active: typeof b.is_active === 'boolean' ? b.is_active : true,
  };
  const chapter = await createChapter(input);
  return NextResponse.json({ chapter });
}
