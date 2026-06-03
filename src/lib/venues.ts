import { query, withClient } from './db';
import type { Venue, VenuePhoto, VenueType } from './types';

const COLS = `id, name, venue_type, host_guest_id, address, neighborhood, city,
  google_maps_link, capacity_min, capacity_max, description, photo_url,
  chef_name, about_chef, is_public, is_active,
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
  chef_name?: string | null;
  about_chef?: string | null;
  is_public?: boolean;
  is_active?: boolean;
}

export async function createVenue(input: VenueInput): Promise<Venue> {
  const rows = await query<Venue>(
    `INSERT INTO venues (name, venue_type, host_guest_id, address, neighborhood, city,
       google_maps_link, capacity_min, capacity_max, description, photo_url,
       chef_name, about_chef, is_public, is_active)
     VALUES ($1,$2,$3,$4,$5,$6,$7,COALESCE($8,6),COALESCE($9,12),$10,$11,$12,$13,COALESCE($14,true),COALESCE($15,true))
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
      input.chef_name ?? null,
      input.about_chef ?? null,
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

const PHOTO_COLS = `id, venue_id, url, caption, sort_order, created_at`;

export async function listVenuePhotos(venueId: number): Promise<VenuePhoto[]> {
  return query<VenuePhoto>(
    `SELECT ${PHOTO_COLS} FROM venue_photos
     WHERE venue_id = $1
     ORDER BY sort_order ASC, id ASC`,
    [venueId],
  );
}

export interface VenuePhotoInput {
  url: string;
  caption?: string | null;
}

export async function setVenuePhotos(
  venueId: number,
  photos: VenuePhotoInput[],
): Promise<void> {
  await withClient(async (client) => {
    await client.query('BEGIN');
    try {
      await client.query(`DELETE FROM venue_photos WHERE venue_id = $1`, [venueId]);
      for (let i = 0; i < photos.length; i++) {
        const p = photos[i];
        await client.query(
          `INSERT INTO venue_photos (venue_id, url, caption, sort_order)
           VALUES ($1, $2, $3, $4)`,
          [venueId, p.url, p.caption ?? null, i],
        );
      }
      await client.query('COMMIT');
    } catch (err) {
      try { await client.query('ROLLBACK'); } catch { /* ignore */ }
      throw err;
    }
  });
}

/**
 * Returns the Google Maps URL to use for a venue.
 *
 * Prefers an explicit `google_maps_link` if one is set (admin override).
 * Otherwise builds a search URL from the address + city. Returns null when
 * there is not enough address data to produce a useful link.
 */
export function venueMapsUrl(
  v: Pick<Venue, 'google_maps_link' | 'name' | 'address' | 'neighborhood' | 'city'>,
): string | null {
  if (v.google_maps_link && v.google_maps_link.trim()) return v.google_maps_link;
  const parts = [v.address, v.neighborhood, v.city].filter(
    (s): s is string => typeof s === 'string' && s.trim().length > 0,
  );
  if (parts.length === 0) return null;
  const q = encodeURIComponent(parts.join(', '));
  return `https://www.google.com/maps/search/?api=1&query=${q}`;
}
