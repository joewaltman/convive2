import { query } from './db';
import type { Guest } from './types';

const COLS = `id, email, first_name, last_name, what_do_you_do, dietary_restrictions,
  dietary_notes, email_unsubscribed_at, created_at, updated_at`;

export async function getGuestByEmail(email: string): Promise<Guest | null> {
  const rows = await query<Guest>(
    `SELECT ${COLS} FROM guests WHERE LOWER(email) = LOWER($1)`,
    [email.trim()],
  );
  return rows[0] ?? null;
}

export async function getGuestById(id: number): Promise<Guest | null> {
  const rows = await query<Guest>(`SELECT ${COLS} FROM guests WHERE id = $1`, [id]);
  return rows[0] ?? null;
}

export interface GuestInput {
  email: string;
  first_name: string;
  last_name: string;
  what_do_you_do?: string | null;
  dietary_restrictions?: string[];
  dietary_notes?: string | null;
}

function trimNullable(s: string | null | undefined): string | null {
  if (s == null) return null;
  const t = s.trim();
  return t.length === 0 ? null : t;
}

export async function createGuest(input: GuestInput): Promise<Guest> {
  const rows = await query<Guest>(
    `INSERT INTO guests (email, first_name, last_name, what_do_you_do,
       dietary_restrictions, dietary_notes)
     VALUES ($1, $2, $3, $4, $5, $6)
     RETURNING ${COLS}`,
    [
      input.email.trim(),
      input.first_name.trim(),
      input.last_name.trim(),
      trimNullable(input.what_do_you_do),
      input.dietary_restrictions ?? [],
      trimNullable(input.dietary_notes),
    ],
  );
  return rows[0];
}

export async function updateGuest(
  id: number,
  input: Partial<GuestInput>,
): Promise<Guest | null> {
  const fields: string[] = [];
  const vals: unknown[] = [];
  let p = 1;
  if (input.first_name !== undefined) { fields.push(`first_name = $${++p}`); vals.push(input.first_name.trim()); }
  if (input.last_name !== undefined) { fields.push(`last_name = $${++p}`); vals.push(input.last_name.trim()); }
  if (input.what_do_you_do !== undefined) { fields.push(`what_do_you_do = $${++p}`); vals.push(trimNullable(input.what_do_you_do)); }
  if (input.dietary_restrictions !== undefined) { fields.push(`dietary_restrictions = $${++p}`); vals.push(input.dietary_restrictions); }
  if (input.dietary_notes !== undefined) { fields.push(`dietary_notes = $${++p}`); vals.push(trimNullable(input.dietary_notes)); }
  if (fields.length === 0) return getGuestById(id);
  const rows = await query<Guest>(
    `UPDATE guests SET ${fields.join(', ')}, updated_at = NOW() WHERE id = $1 RETURNING ${COLS}`,
    [id, ...vals],
  );
  return rows[0] ?? null;
}

export async function searchGuestsByEmail(q: string, limit = 50): Promise<Guest[]> {
  return query<Guest>(
    `SELECT ${COLS} FROM guests WHERE LOWER(email) LIKE LOWER($1) ORDER BY created_at DESC LIMIT $2`,
    [`%${q.trim()}%`, limit],
  );
}

export async function setUnsubscribed(id: number, on: boolean): Promise<void> {
  await query(
    `UPDATE guests SET email_unsubscribed_at = $2, updated_at = NOW() WHERE id = $1`,
    [id, on ? new Date() : null],
  );
}
