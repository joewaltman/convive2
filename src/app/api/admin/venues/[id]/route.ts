import { NextResponse } from 'next/server';
import { requireSuperAdmin } from '@/lib/auth/admin';
import {
  getVenueById,
  updateVenue,
  deleteVenue,
  setVenuePhotos,
  type VenueInput,
  type VenuePhotoInput,
} from '@/lib/venues';
import type { VenueType } from '@/lib/types';

function parsePhotos(v: unknown): VenuePhotoInput[] | null {
  if (!Array.isArray(v)) return null;
  const out: VenuePhotoInput[] = [];
  for (const item of v) {
    if (!item || typeof item !== 'object') continue;
    const o = item as Record<string, unknown>;
    const url = typeof o.url === 'string' ? o.url.trim() : '';
    if (!url) continue;
    const captionRaw = o.caption;
    const caption =
      typeof captionRaw === 'string' && captionRaw.trim().length > 0
        ? captionRaw.trim()
        : null;
    out.push({ url, caption });
  }
  return out;
}

const VENUE_TYPES: ReadonlySet<VenueType> = new Set<VenueType>(['restaurant', 'event_space', 'home']);

function parseId(s: string): number | null {
  const n = parseInt(s, 10);
  return Number.isFinite(n) && n > 0 ? n : null;
}

function trOrNull(v: unknown): string | null {
  if (typeof v !== 'string') return null;
  const t = v.trim();
  return t.length === 0 ? null : t;
}

function numOrNull(v: unknown): number | null {
  if (typeof v === 'number' && Number.isFinite(v)) return v;
  if (typeof v === 'string' && v.trim() !== '') {
    const n = parseInt(v.trim(), 10);
    if (Number.isFinite(n)) return n;
  }
  return null;
}

export async function GET(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  await requireSuperAdmin();
  const { id } = await ctx.params;
  const n = parseId(id);
  if (n === null) return NextResponse.json({ error: 'invalid_id' }, { status: 400 });
  const venue = await getVenueById(n);
  if (!venue) return NextResponse.json({ error: 'not_found' }, { status: 404 });
  return NextResponse.json({ venue });
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
  const patch: Partial<VenueInput> = {};
  if (typeof b.name === 'string' && b.name.trim()) patch.name = b.name.trim();
  if (typeof b.venue_type === 'string') {
    const vt = b.venue_type.trim() as VenueType;
    if (!VENUE_TYPES.has(vt)) return NextResponse.json({ error: 'invalid_venue_type' }, { status: 400 });
    patch.venue_type = vt;
  }
  if ('host_guest_id' in b) patch.host_guest_id = numOrNull(b.host_guest_id);
  if ('address' in b) patch.address = trOrNull(b.address);
  if ('neighborhood' in b) patch.neighborhood = trOrNull(b.neighborhood);
  if ('city' in b) patch.city = trOrNull(b.city);
  if ('google_maps_link' in b) patch.google_maps_link = trOrNull(b.google_maps_link);
  if ('capacity_min' in b) {
    const v = numOrNull(b.capacity_min);
    if (v !== null) patch.capacity_min = v;
  }
  if ('capacity_max' in b) {
    const v = numOrNull(b.capacity_max);
    if (v !== null) patch.capacity_max = v;
  }
  if ('description' in b) patch.description = trOrNull(b.description);
  const photos = 'photos' in b ? parsePhotos(b.photos) : null;
  if ('photo_url' in b || photos) {
    const fromList = photos && photos.length > 0 ? photos[0].url : null;
    patch.photo_url = fromList ?? ('photo_url' in b ? trOrNull(b.photo_url) : null);
  }
  if ('chef_name' in b) patch.chef_name = trOrNull(b.chef_name);
  if ('about_chef' in b) patch.about_chef = trOrNull(b.about_chef);
  if ('is_public' in b && typeof b.is_public === 'boolean') patch.is_public = b.is_public;
  if ('is_active' in b && typeof b.is_active === 'boolean') patch.is_active = b.is_active;

  const venue = await updateVenue(n, patch);
  if (!venue) return NextResponse.json({ error: 'not_found' }, { status: 404 });
  if (photos) await setVenuePhotos(venue.id, photos);
  return NextResponse.json({ venue });
}

export async function DELETE(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  await requireSuperAdmin();
  const { id } = await ctx.params;
  const n = parseId(id);
  if (n === null) return NextResponse.json({ error: 'invalid_id' }, { status: 400 });
  await deleteVenue(n);
  return NextResponse.json({ ok: true });
}
