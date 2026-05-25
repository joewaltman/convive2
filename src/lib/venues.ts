import { query } from './db';
import type { Venue, VenueType } from './types';

const COLS = `id, name, venue_type, host_guest_id, address, neighborhood, city,
  google_maps_link, capacity_min, capacity_max, description, photo_url, is_public, is_active,
  created_at, updated_at`;

export async function listAllVenues(): Promise<Venue[]> {
  return query<Venue>(`SELECT ${COLS} FROM venues ORDER BY name ASC`);
}

export async function listPublicVenues(): Promise<Venue[]> {
  return query<Venue>(
    `SELECT ${COLS} FROM venues WHERE is_public = true AND is_active = true ORDER BY venue_type, name`,
  );
}

export async function getVenueById(id: number): Promise<Venue | null> {
  const rows = await query<Venue>(`SELECT ${COLS} FROM venues WHERE id = $1`, [id]);
  return rows[0] ?? null;
}

export interface VenueInput {
  name: string;
  venue_type: VenueType;
  host_guest_id?: number | null;
  address?: string | null;
  neighborhood?: string | null;
  city?: string | null;
  google_maps_link?: string | null;
  capacity_min?: number;
  capacity_max?: number;
  description?: string | null;
  photo_url?: string | null;
  is_public?: boolean;
  is_active?: boolean;
}

export async function createVenue(input: VenueInput): Promise<Venue> {
  const rows = await query<Venue>(
    `INSERT INTO venues (name, venue_type, host_guest_id, address, neighborhood, city,
       google_maps_link, capacity_min, capacity_max, description, photo_url, is_public, is_active)
     VALUES ($1,$2,$3,$4,$5,$6,$7,COALESCE($8,6),COALESCE($9,12),$10,$11,COALESCE($12,true),COALESCE($13,true))
     RETURNING ${COLS}`,
    [
      input.name,
      input.venue_type,
      input.host_guest_id ?? null,
      input.address ?? null,
      input.neighborhood ?? null,
      input.city ?? null,
      input.google_maps_link ?? null,
      input.capacity_min ?? 6,
      input.capacity_max ?? 12,
      input.description ?? null,
      input.photo_url ?? null,
      input.is_public ?? true,
      input.is_active ?? true,
    ],
  );
  return rows[0];
}

export async function updateVenue(id: number, input: Partial<VenueInput>): Promise<Venue | null> {
  const keys = Object.keys(input) as Array<keyof VenueInput>;
  if (keys.length === 0) return getVenueById(id);
  const sets = keys.map((k, i) => `${k} = $${i + 2}`).join(', ');
  const vals = keys.map((k) => input[k] ?? null);
  const rows = await query<Venue>(
    `UPDATE venues SET ${sets}, updated_at = NOW() WHERE id = $1 RETURNING ${COLS}`,
    [id, ...vals],
  );
  return rows[0] ?? null;
}

export async function deleteVenue(id: number): Promise<void> {
  await query(`DELETE FROM venues WHERE id = $1`, [id]);
}
