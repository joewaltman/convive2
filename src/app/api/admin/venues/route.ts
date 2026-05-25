import { NextResponse } from 'next/server';
import { requireSuperAdmin } from '@/lib/auth/admin';
import { listAllVenues, createVenue, type VenueInput } from '@/lib/venues';
import type { VenueType } from '@/lib/types';

const VENUE_TYPES: ReadonlySet<VenueType> = new Set<VenueType>(['restaurant', 'event_space', 'home']);

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

export async function GET() {
  await requireSuperAdmin();
  const rows = await listAllVenues();
  return NextResponse.json({ venues: rows });
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
  const name = typeof b.name === 'string' ? b.name.trim() : '';
  if (!name) return NextResponse.json({ error: 'name_required' }, { status: 400 });
  const vt = typeof b.venue_type === 'string' ? (b.venue_type.trim() as VenueType) : ('' as VenueType);
  if (!VENUE_TYPES.has(vt)) {
    return NextResponse.json({ error: 'invalid_venue_type' }, { status: 400 });
  }
  const input: VenueInput = {
    name,
    venue_type: vt,
    host_guest_id: numOrNull(b.host_guest_id),
    address: trOrNull(b.address),
    neighborhood: trOrNull(b.neighborhood),
    city: trOrNull(b.city),
    google_maps_link: trOrNull(b.google_maps_link),
    capacity_min: numOrNull(b.capacity_min) ?? 6,
    capacity_max: numOrNull(b.capacity_max) ?? 12,
    description: trOrNull(b.description),
    photo_url: trOrNull(b.photo_url),
    is_public: typeof b.is_public === 'boolean' ? b.is_public : true,
    is_active: typeof b.is_active === 'boolean' ? b.is_active : true,
  };
  const venue = await createVenue(input);
  return NextResponse.json({ venue });
}
