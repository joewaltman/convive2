import { query } from './db';

export interface ChapterLead {
  id: number;
  contact_name: string;
  contact_email: string;
  contact_role: string | null;
  chapter_name: string;
  approximate_size: number | null;
  goals: string | null;
  status: 'new' | 'contacted' | 'call_scheduled' | 'partnered' | 'declined';
  internal_notes: string | null;
  created_at: Date;
  updated_at: Date;
}

export interface VenueLead {
  id: number;
  contact_name: string;
  contact_email: string;
  venue_name: string | null;
  venue_type: string | null;
  neighborhood: string | null;
  capacity: number | null;
  notes: string | null;
  status: 'new' | 'contacted' | 'visited' | 'partnered' | 'declined';
  internal_notes: string | null;
  created_at: Date;
  updated_at: Date;
}

function tr(s: string | null | undefined): string | null {
  if (s == null) return null;
  const t = String(s).trim();
  return t.length === 0 ? null : t;
}

export async function createChapterLead(input: {
  contact_name: string;
  contact_email: string;
  contact_role?: string | null;
  chapter_name: string;
  approximate_size?: number | null;
  goals?: string | null;
}): Promise<ChapterLead> {
  const rows = await query<ChapterLead>(
    `INSERT INTO chapter_leads (contact_name, contact_email, contact_role, chapter_name,
       approximate_size, goals)
     VALUES ($1, $2, $3, $4, $5, $6)
     RETURNING *`,
    [
      input.contact_name.trim(),
      input.contact_email.trim(),
      tr(input.contact_role),
      input.chapter_name.trim(),
      input.approximate_size ?? null,
      tr(input.goals),
    ],
  );
  return rows[0];
}

export async function createVenueLead(input: {
  contact_name: string;
  contact_email: string;
  venue_name?: string | null;
  venue_type?: string | null;
  neighborhood?: string | null;
  capacity?: number | null;
  notes?: string | null;
}): Promise<VenueLead> {
  const rows = await query<VenueLead>(
    `INSERT INTO venue_leads (contact_name, contact_email, venue_name, venue_type,
       neighborhood, capacity, notes)
     VALUES ($1, $2, $3, $4, $5, $6, $7)
     RETURNING *`,
    [
      input.contact_name.trim(),
      input.contact_email.trim(),
      tr(input.venue_name),
      tr(input.venue_type),
      tr(input.neighborhood),
      input.capacity ?? null,
      tr(input.notes),
    ],
  );
  return rows[0];
}

export async function listChapterLeads(): Promise<ChapterLead[]> {
  return query<ChapterLead>(`SELECT * FROM chapter_leads ORDER BY created_at DESC`);
}

export async function listVenueLeads(): Promise<VenueLead[]> {
  return query<VenueLead>(`SELECT * FROM venue_leads ORDER BY created_at DESC`);
}

export async function updateChapterLead(
  id: number,
  fields: Partial<Pick<ChapterLead, 'status' | 'internal_notes'>>,
): Promise<ChapterLead | null> {
  const keys = Object.keys(fields) as Array<keyof typeof fields>;
  if (keys.length === 0) return null;
  const sets = keys.map((k, i) => `${k} = $${i + 2}`).join(', ');
  const vals = keys.map((k) => fields[k] ?? null);
  const rows = await query<ChapterLead>(
    `UPDATE chapter_leads SET ${sets}, updated_at = NOW() WHERE id = $1 RETURNING *`,
    [id, ...vals],
  );
  return rows[0] ?? null;
}

export async function updateVenueLead(
  id: number,
  fields: Partial<Pick<VenueLead, 'status' | 'internal_notes'>>,
): Promise<VenueLead | null> {
  const keys = Object.keys(fields) as Array<keyof typeof fields>;
  if (keys.length === 0) return null;
  const sets = keys.map((k, i) => `${k} = $${i + 2}`).join(', ');
  const vals = keys.map((k) => fields[k] ?? null);
  const rows = await query<VenueLead>(
    `UPDATE venue_leads SET ${sets}, updated_at = NOW() WHERE id = $1 RETURNING *`,
    [id, ...vals],
  );
  return rows[0] ?? null;
}
