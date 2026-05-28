import { query, withClient } from './db';
import type { Dinner, Venue, Chapter } from './types';

const DINNER_COLS = `id, chapter_id, venue_id, title, starts_at, total_seats, price_cents,
  host_payout_cents, menu, description, parking_note, booking_cutoff_at, allows_couples,
  status, created_at, updated_at`;

export interface PublicDinnerCard {
  id: number;
  title: string;
  starts_at: Date;
  total_seats: number;
  price_cents: number;
  allows_couples: boolean;
  booking_cutoff_at: Date | null;
  city: string | null;
  neighborhood: string | null;
  venue_type: Venue['venue_type'];
  venue_display_name: string | null; // restaurant or event-space name; null for home
  seats_used: number;
  waitlist_count: number;
}

/** Public list: shows neighborhood (falling back to city). */
export async function listPublicUpcomingByChapter(chapterId: number): Promise<PublicDinnerCard[]> {
  const rows = await query<{
    id: number;
    title: string;
    starts_at: Date;
    total_seats: number;
    price_cents: number;
    allows_couples: boolean;
    booking_cutoff_at: Date | null;
    city: string | null;
    neighborhood: string | null;
    venue_type: Venue['venue_type'];
    venue_name: string;
    seats_used: string | null;
    waitlist_count: string | null;
  }>(
    `SELECT d.id, d.title, d.starts_at, d.total_seats, d.price_cents, d.allows_couples,
            d.booking_cutoff_at,
            v.city, v.neighborhood, v.venue_type, v.name AS venue_name,
            COALESCE((SELECT SUM(seat_count) FROM reservations r
              WHERE r.dinner_id = d.id
                AND (r.status = 'confirmed'
                     OR (r.status = 'pending' AND r.pending_expires_at > NOW()))), 0) AS seats_used,
            COALESCE((SELECT COUNT(*) FROM waitlist_entries we
              WHERE we.dinner_id = d.id AND we.status IN ('pending','promoted')), 0) AS waitlist_count
     FROM dinners d
     JOIN venues v ON v.id = d.venue_id
     WHERE d.chapter_id = $1
       AND d.status = 'published'
       AND d.starts_at >= NOW()
     ORDER BY d.starts_at ASC`,
    [chapterId],
  );
  return rows.map((r) => ({
    id: r.id,
    title: r.title,
    starts_at: r.starts_at,
    total_seats: r.total_seats,
    price_cents: r.price_cents,
    allows_couples: r.allows_couples,
    booking_cutoff_at: r.booking_cutoff_at,
    city: r.city,
    neighborhood: r.neighborhood,
    venue_type: r.venue_type,
    venue_display_name: r.venue_type === 'home' ? null : r.venue_name,
    seats_used: parseInt(r.seats_used ?? '0', 10),
    waitlist_count: parseInt(r.waitlist_count ?? '0', 10),
  }));
}

export interface DinnerWithRelations {
  dinner: Dinner;
  chapter: Chapter;
  venue: Venue;
  host_first_name?: string | null;
  host_grad_year?: number | null;
}

export async function getDinnerWithRelations(id: number): Promise<DinnerWithRelations | null> {
  const rows = await query<Record<string, unknown>>(
    `SELECT
       d.id AS d_id, d.chapter_id, d.venue_id, d.title, d.starts_at, d.total_seats, d.price_cents,
       d.host_payout_cents, d.menu, d.description, d.parking_note, d.booking_cutoff_at,
       d.allows_couples, d.status AS d_status, d.created_at AS d_created_at, d.updated_at AS d_updated_at,
       v.id AS v_id, v.name AS v_name, v.venue_type, v.host_guest_id, v.address, v.neighborhood,
       v.city, v.google_maps_link, v.capacity_min, v.capacity_max, v.description AS v_description,
       v.photo_url, v.is_public, v.is_active AS v_is_active, v.created_at AS v_created_at,
       v.updated_at AS v_updated_at,
       c.id AS c_id, c.slug, c.short_name, c.school_name, c.display_name, c.tagline,
       c.from_display_name, c.color_primary, c.color_secondary, c.color_header_bg,
       c.color_header_text, c.color_accent, c.font_family, c.is_active AS c_is_active,
       c.created_at AS c_created_at, c.updated_at AS c_updated_at,
       g.first_name AS host_first_name,
       (SELECT MIN(grad_year) FROM reservations rr WHERE rr.guest_id = g.id) AS host_grad_year
     FROM dinners d
     JOIN venues v ON v.id = d.venue_id
     JOIN chapters c ON c.id = d.chapter_id
     LEFT JOIN guests g ON g.id = v.host_guest_id
     WHERE d.id = $1`,
    [id],
  );
  const r = rows[0];
  if (!r) return null;
  const dinner: Dinner = {
    id: r.d_id as number,
    chapter_id: r.chapter_id as number,
    venue_id: r.venue_id as number,
    title: r.title as string,
    starts_at: r.starts_at as Date,
    total_seats: r.total_seats as number,
    price_cents: r.price_cents as number,
    host_payout_cents: r.host_payout_cents as number | null,
    menu: r.menu as string | null,
    description: r.description as string | null,
    parking_note: r.parking_note as string | null,
    booking_cutoff_at: r.booking_cutoff_at as Date | null,
    allows_couples: r.allows_couples as boolean,
    status: r.d_status as Dinner['status'],
    created_at: r.d_created_at as Date,
    updated_at: r.d_updated_at as Date,
  };
  const venue: Venue = {
    id: r.v_id as number,
    name: r.v_name as string,
    venue_type: r.venue_type as Venue['venue_type'],
    host_guest_id: r.host_guest_id as number | null,
    address: r.address as string | null,
    neighborhood: r.neighborhood as string | null,
    city: r.city as string | null,
    google_maps_link: r.google_maps_link as string | null,
    capacity_min: r.capacity_min as number,
    capacity_max: r.capacity_max as number,
    description: r.v_description as string | null,
    photo_url: r.photo_url as string | null,
    is_public: r.is_public as boolean,
    is_active: r.v_is_active as boolean,
    created_at: r.v_created_at as Date,
    updated_at: r.v_updated_at as Date,
  };
  const chapter: Chapter = {
    id: r.c_id as number,
    slug: r.slug as string,
    short_name: r.short_name as string,
    school_name: r.school_name as string,
    display_name: r.display_name as string,
    tagline: r.tagline as string | null,
    from_display_name: r.from_display_name as string,
    color_primary: r.color_primary as string,
    color_secondary: r.color_secondary as string,
    color_header_bg: r.color_header_bg as string,
    color_header_text: r.color_header_text as string,
    color_accent: r.color_accent as string,
    font_family: r.font_family as string,
    is_active: r.c_is_active as boolean,
    created_at: r.c_created_at as Date,
    updated_at: r.c_updated_at as Date,
  };
  return {
    dinner,
    chapter,
    venue,
    host_first_name: (r.host_first_name as string | null) ?? null,
    host_grad_year: (r.host_grad_year as number | null) ?? null,
  };
}

export async function countSeatsUsed(dinnerId: number): Promise<number> {
  const rows = await query<{ used: string }>(
    `SELECT COALESCE(SUM(seat_count), 0)::text AS used
     FROM reservations
     WHERE dinner_id = $1
       AND (status = 'confirmed' OR (status = 'pending' AND pending_expires_at > NOW()))`,
    [dinnerId],
  );
  return parseInt(rows[0]?.used ?? '0', 10);
}

export async function countActiveWaitlist(dinnerId: number): Promise<number> {
  const rows = await query<{ n: string }>(
    `SELECT COUNT(*)::text AS n FROM waitlist_entries
     WHERE dinner_id = $1 AND status IN ('pending','promoted')`,
    [dinnerId],
  );
  return parseInt(rows[0]?.n ?? '0', 10);
}

export async function listAllDinnersAdmin(): Promise<Dinner[]> {
  return query<Dinner>(`SELECT ${DINNER_COLS} FROM dinners ORDER BY starts_at DESC`);
}

export async function getDinnerByIdAdmin(id: number): Promise<Dinner | null> {
  const rows = await query<Dinner>(`SELECT ${DINNER_COLS} FROM dinners WHERE id = $1`, [id]);
  return rows[0] ?? null;
}

export interface DinnerInput {
  chapter_id: number;
  venue_id: number;
  title: string;
  starts_at: Date;
  total_seats: number;
  price_cents: number;
  host_payout_cents?: number | null;
  menu?: string | null;
  description?: string | null;
  parking_note?: string | null;
  booking_cutoff_at?: Date | null;
  allows_couples?: boolean;
  status?: Dinner['status'];
}

export async function createDinner(input: DinnerInput): Promise<Dinner> {
  const rows = await query<Dinner>(
    `INSERT INTO dinners (chapter_id, venue_id, title, starts_at, total_seats, price_cents,
       host_payout_cents, menu, description, parking_note, booking_cutoff_at, allows_couples, status)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,COALESCE($12,true),COALESCE($13,'draft'))
     RETURNING ${DINNER_COLS}`,
    [
      input.chapter_id,
      input.venue_id,
      input.title,
      input.starts_at,
      input.total_seats,
      input.price_cents,
      input.host_payout_cents ?? null,
      input.menu ?? null,
      input.description ?? null,
      input.parking_note ?? null,
      input.booking_cutoff_at ?? null,
      input.allows_couples ?? true,
      input.status ?? 'draft',
    ],
  );
  return rows[0];
}

export async function updateDinner(id: number, input: Partial<DinnerInput>): Promise<Dinner | null> {
  const keys = Object.keys(input) as Array<keyof DinnerInput>;
  if (keys.length === 0) return getDinnerByIdAdmin(id);
  const sets = keys.map((k, i) => `${k} = $${i + 2}`).join(', ');
  const vals = keys.map((k) => input[k] ?? null);
  const rows = await query<Dinner>(
    `UPDATE dinners SET ${sets}, updated_at = NOW() WHERE id = $1 RETURNING ${DINNER_COLS}`,
    [id, ...vals],
  );
  return rows[0] ?? null;
}

export async function deleteDinner(id: number): Promise<void> {
  await query(`DELETE FROM dinners WHERE id = $1`, [id]);
}

// re-export withClient for callers that want a shared transaction (e.g. test setup).
export { withClient };
