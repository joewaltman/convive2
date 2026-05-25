import { NextResponse } from 'next/server';
import { getCurrentGuest, createGuestSession } from '@/lib/auth/guest';
import { getGuestByEmail, createGuest, type GuestInput } from '@/lib/guests';
import { startReservation, attachCheckoutSession } from '@/lib/reservations';
import { getDinnerWithRelations } from '@/lib/dinners';
import { stripe } from '@/lib/stripe';
import type { Guest } from '@/lib/types';

interface ProfileBody {
  first_name?: unknown;
  last_name?: unknown;
  what_do_you_do?: unknown;
  dietary_restrictions?: unknown;
  dietary_notes?: unknown;
  grad_year?: unknown;
  major?: unknown;
}

function baseUrl(): string {
  return process.env.NEXT_PUBLIC_BASE_URL ?? 'https://con-vive.com';
}

function asString(v: unknown): string {
  return typeof v === 'string' ? v.trim() : '';
}

function asNullableString(v: unknown): string | null {
  if (typeof v !== 'string') return null;
  const t = v.trim();
  return t.length === 0 ? null : t;
}

function asStringArray(v: unknown): string[] {
  if (!Array.isArray(v)) return [];
  return v.filter((x): x is string => typeof x === 'string').map((s) => s.trim()).filter(Boolean);
}

export async function POST(req: Request) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'invalid_json' }, { status: 400 });
  }
  const b = body as {
    dinner_id?: unknown;
    profile?: ProfileBody;
    brings_partner?: unknown;
    email?: unknown;
  };

  const dinnerId = typeof b.dinner_id === 'number' ? b.dinner_id : parseInt(String(b.dinner_id ?? ''), 10);
  if (!Number.isFinite(dinnerId) || dinnerId <= 0) {
    return NextResponse.json({ error: 'dinner_id_required' }, { status: 400 });
  }
  const bringsPartner = Boolean(b.brings_partner);
  const profile = (b.profile ?? {}) as ProfileBody;

  // Resolve the guest: existing session, or look up/create from email.
  let guest: Guest | null = await getCurrentGuest();
  if (!guest) {
    const email = asString(b.email);
    if (!email) {
      return NextResponse.json({ error: 'email_required' }, { status: 400 });
    }
    const existing = await getGuestByEmail(email);
    if (existing) {
      return NextResponse.json({ needsCode: true, email }, { status: 401 });
    }
    // New guest: profile must be present
    const firstName = asString(profile.first_name);
    const lastName = asString(profile.last_name);
    if (!firstName || !lastName) {
      return NextResponse.json({ error: 'profile_required' }, { status: 400 });
    }
    const input: GuestInput = {
      email,
      first_name: firstName,
      last_name: lastName,
      what_do_you_do: asNullableString(profile.what_do_you_do),
      dietary_restrictions: asStringArray(profile.dietary_restrictions),
      dietary_notes: asNullableString(profile.dietary_notes),
    };
    guest = await createGuest(input);
    // Spec: skip code for new guests since they just provided their email at booking time.
    await createGuestSession(guest.id);
  }

  const gradYearRaw = profile.grad_year;
  const gradYear =
    typeof gradYearRaw === 'number'
      ? gradYearRaw
      : parseInt(String(gradYearRaw ?? ''), 10);
  if (!Number.isFinite(gradYear) || gradYear <= 0) {
    return NextResponse.json({ error: 'grad_year_required' }, { status: 400 });
  }
  const major = asNullableString(profile.major);

  const relations = await getDinnerWithRelations(dinnerId);
  if (!relations) {
    return NextResponse.json({ error: 'dinner_not_found' }, { status: 404 });
  }
  const { dinner, chapter } = relations;

  const result = await startReservation({
    guestId: guest.id,
    dinnerId,
    gradYear,
    major,
    bringsPartner,
  });

  if (!result.ok) {
    return NextResponse.json({ fullForBooking: true });
  }

  const reservation = result.reservation;
  const seatCount = reservation.seat_count;
  const amount = dinner.price_cents * seatCount;

  // Stripe Checkout Session. branding_settings is a preview field not in current SDK
  // types — cast the whole params object as any per spec to bypass type checks.
  const params = {
    mode: 'payment' as const,
    customer_email: guest.email,
    line_items: [
      {
        quantity: seatCount,
        price_data: {
          currency: 'usd',
          unit_amount: dinner.price_cents,
          product_data: {
            name: `${chapter.display_name}: ${dinner.title}`,
            description: `Seat${seatCount > 1 ? 's' : ''} for ${dinner.title}`,
          },
        },
      },
    ],
    success_url: `${baseUrl()}/alumni/${chapter.slug}/reservation/success?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${baseUrl()}/alumni/${chapter.slug}/dinner/${dinner.id}`,
    expires_at: Math.floor(Date.now() / 1000) + 30 * 60,
    metadata: {
      reservation_id: String(reservation.id),
      guest_id: String(guest.id),
      dinner_id: String(dinner.id),
      chapter_slug: chapter.slug,
    },
    branding_settings: {
      background_color: chapter.color_primary,
      button_color: chapter.color_accent,
      accent_color: chapter.color_accent,
      brand_name: chapter.display_name,
    },
  };

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const session = await (stripe.checkout.sessions.create as any)(params);

  await attachCheckoutSession(reservation.id, session.id);

  // amount totals for caller debug — not strictly required.
  void amount;

  return NextResponse.json({
    checkout_url: session.url,
    reservation_id: reservation.id,
  });
}
