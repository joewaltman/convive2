import { NextResponse } from 'next/server';
import { stripe } from '@/lib/stripe';
import {
  attachCheckoutSession,
  getBookingByToken,
} from '@/lib/lunchclub/data';
import { formatDateTimeLA } from '@/lib/lunchclub/format';

export const runtime = 'nodejs';

function baseUrl(): string {
  return process.env.NEXT_PUBLIC_BASE_URL ?? 'https://con-vive.com';
}

export async function POST(
  _req: Request,
  ctx: { params: Promise<{ token: string }> },
) {
  const { token } = await ctx.params;
  const b = await getBookingByToken(token);
  if (!b) {
    return NextResponse.json({ error: 'invalid_token' }, { status: 404 });
  }
  if (b.booking.status === 'paid') {
    return NextResponse.json({ error: 'already_paid' }, { status: 409 });
  }
  if (b.booking.status === 'cancelled' || b.booking.status === 'refunded') {
    return NextResponse.json({ error: 'cancelled' }, { status: 409 });
  }
  if (b.lunch.status === 'cancelled') {
    return NextResponse.json({ error: 'lunch_cancelled' }, { status: 410 });
  }
  if (Date.now() > b.lunch.booking_cutoff_at.getTime()) {
    return NextResponse.json({ error: 'closed' }, { status: 410 });
  }

  const url = baseUrl();
  let session;
  try {
    session = await stripe.checkout.sessions.create({
      mode: 'payment',
      customer_email: b.signup.email ?? undefined,
      line_items: [
        {
          quantity: 1,
          price_data: {
            currency: 'usd',
            unit_amount: b.booking.seats * b.lunch.price_cents,
            product_data: {
              name: `Lunch Club: ${b.standingTable.name}`,
              description: `${formatDateTimeLA(b.lunch.starts_at)} at ${b.lunch.venue}`,
            },
          },
        },
      ],
      client_reference_id: String(b.booking.id),
      metadata: {
        module: 'lunchclub',
        booking_id: String(b.booking.id),
        lunch_id: String(b.lunch.id),
      },
      expires_at: Math.floor(Date.now() / 1000) + 30 * 60,
      success_url: `${url}/lunchclub/book/${token}?paid=1`,
      cancel_url: `${url}/lunchclub/book/${token}`,
    });
  } catch (err) {
    return NextResponse.json(
      { error: 'stripe_error', detail: err instanceof Error ? err.message : String(err) },
      { status: 502 },
    );
  }

  if (!session.url) {
    return NextResponse.json({ error: 'stripe_no_url' }, { status: 502 });
  }
  await attachCheckoutSession(b.booking.id, session.id);
  return NextResponse.json({ checkout_url: session.url });
}
