import { query } from './db';
import type { Chapter } from './types';

const COLS = `id, slug, short_name, school_name, display_name, tagline, from_display_name,
  color_primary, color_secondary, color_header_bg, color_header_text, color_accent,
  font_family, is_active, created_at, updated_at`;

export async function getChapterBySlug(slug: string): Promise<Chapter | null> {
  const rows = await query<Chapter>(
    `SELECT ${COLS} FROM chapters WHERE slug = $1 AND is_active = true`,
    [slug],
  );
  return rows[0] ?? null;
}

export async function getChapterById(id: number): Promise<Chapter | null> {
  const rows = await query<Chapter>(
    `SELECT ${COLS} FROM chapters WHERE id = $1`,
    [id],
  );
  return rows[0] ?? null;
}

export async function listActiveChapters(): Promise<Chapter[]> {
  return query<Chapter>(
    `SELECT ${COLS} FROM chapters WHERE is_active = true ORDER BY display_name ASC`,
  );
}

export async function listAllChapters(): Promise<Chapter[]> {
  return query<Chapter>(`SELECT ${COLS} FROM chapters ORDER BY display_name ASC`);
}

export interface ChapterInput {
  slug: string;
  short_name: string;
  school_name: string;
  display_name: string;
  tagline?: string | null;
  from_display_name: string;
  color_primary: string;
  color_secondary: string;
  color_header_bg: string;
  color_header_text: string;
  color_accent: string;
  font_family?: string;
  is_active?: boolean;
}

export async function createChapter(input: ChapterInput): Promise<Chapter> {
  const rows = await query<Chapter>(
    `INSERT INTO chapters (slug, short_name, school_name, display_name, tagline,
       from_display_name, color_primary, color_secondary, color_header_bg, color_header_text,
       color_accent, font_family, is_active)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,COALESCE($13,true))
     RETURNING ${COLS}`,
    [
      input.slug,
      input.short_name,
      input.school_name,
      input.display_name,
      input.tagline ?? null,
      input.from_display_name,
      input.color_primary,
      input.color_secondary,
      input.color_header_bg,
      input.color_header_text,
      input.color_accent,
      input.font_family ?? 'Inter, system-ui, sans-serif',
      input.is_active ?? true,
    ],
  );
  return rows[0];
}

export async function updateChapter(id: number, input: Partial<ChapterInput>): Promise<Chapter | null> {
  const keys = Object.keys(input) as Array<keyof ChapterInput>;
  if (keys.length === 0) return getChapterById(id);
  const sets = keys.map((k, i) => `${k} = $${i + 2}`).join(', ');
  const vals = keys.map((k) => input[k]);
  const rows = await query<Chapter>(
    `UPDATE chapters SET ${sets}, updated_at = NOW() WHERE id = $1 RETURNING ${COLS}`,
    [id, ...vals],
  );
  return rows[0] ?? null;
}

export async function deleteChapter(id: number): Promise<void> {
  await query(`DELETE FROM chapters WHERE id = $1`, [id]);
}
