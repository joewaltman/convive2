import { NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { getReservationById, attachCheckoutSession } from '@/lib/reservations';
import { getDinnerWithRelations } from '@/lib/dinners';
import { stripe } from '@/lib/stripe';

function baseUrl(): string {
  return process.env.NEXT_PUBLIC_BASE_URL ?? 'https://con-vive.com';
}

export async function POST(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const reservationId = parseInt(id, 10);
  if (!Number.isFinite(reservationId)) {
    return NextResponse.json({ error: 'invalid_id' }, { status: 400 });
  }

  const reservation = await getReservationById(reservationId);
  if (!reservation) {
    return NextResponse.json({ error: 'not_found' }, { status: 404 });
  }
  if (reservation.status !== 'pending') {
    return NextResponse.json({ error: 'not_pending' }, { status: 409 });
  }
  if (!reservation.waitlist_entry_id) {
    return NextResponse.json({ error: 'not_a_waitlist_claim' }, { status: 400 });
  }
  if (!reservation.pending_expires_at || new Date(reservation.pending_expires_at) < new Date()) {
    return NextResponse.json({ error: 'expired' }, { status: 410 });
  }

  const relations = await getDinnerWithRelations(reservation.dinner_id);
  if (!relations) {
    return NextResponse.json({ error: 'dinner_not_found' }, { status: 404 });
  }
  const { dinner, chapter } = relations;

  // Lookup guest email for the Checkout customer field
  const guestRows = await query<{ email: string }>(
    `SELECT email FROM guests WHERE id = $1`,
    [reservation.guest_id],
  );
  const guestEmail = guestRows[0]?.email;

  const params2 = {
    mode: 'payment' as const,
    customer_email: guestEmail,
    line_items: [
      {
        quantity: reservation.seat_count,
        price_data: {
          currency: 'usd',
          unit_amount: dinner.price_cents,
          product_data: {
            name: `${chapter.display_name}: ${dinner.title}`,
            description: `Seat${reservation.seat_count > 1 ? 's' : ''} for ${dinner.title}`,
          },
        },
      },
    ],
    success_url: `${baseUrl()}/alumni/${chapter.slug}/reservation/success?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${baseUrl()}/alumni/${chapter.slug}/dinner/${dinner.id}`,
    expires_at: Math.floor(Date.now() / 1000) + 30 * 60,
    metadata: {
      reservation_id: String(reservation.id),
      guest_id: String(reservation.guest_id),
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
  const session = await (stripe.checkout.sessions.create as any)(params2);
  await attachCheckoutSession(reservation.id, session.id);

  return NextResponse.json({ checkout_url: session.url });
}
