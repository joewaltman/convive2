import { NextResponse } from 'next/server';
import type Stripe from 'stripe';
import { stripe } from '@/lib/stripe';
import { query } from '@/lib/db';
import {
  getReservationByCheckoutSession,
  markConfirmedFromWebhook,
} from '@/lib/reservations';
import { getDinnerWithRelations } from '@/lib/dinners';
import {
  sendEmail,
  chapterFrom,
  replyTo,
} from '@/lib/email';
import {
  generateGoogleCalendarUrl,
  generateOutlookUrl,
  generateIcsDownloadUrl,
} from '@/lib/calendar';
import ReservationConfirmation from '@/emails/reservation-confirmation';
import { handleLunchclubCheckoutCompleted } from '@/lib/lunchclub/webhook-handler';

// Stripe webhook requires the Node.js runtime (raw body access; not Edge-compatible)
export const runtime = 'nodejs';

function baseUrl(): string {
  return process.env.NEXT_PUBLIC_BASE_URL ?? 'https://con-vive.com';
}

function buildFullAddress(addr: string | null, city: string | null): string | null {
  if (!addr && !city) return null;
  return [addr, city].filter(Boolean).join(', ');
}

export async function POST(req: Request) {
  const sig = req.headers.get('stripe-signature');
  if (!sig) {
    return NextResponse.json({ error: 'missing_signature' }, { status: 400 });
  }
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!secret) {
    return NextResponse.json({ error: 'no_webhook_secret_configured' }, { status: 500 });
  }

  const rawBody = await req.text();

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(rawBody, sig, secret);
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'invalid_signature';
    return NextResponse.json({ error: msg }, { status: 400 });
  }

  // Idempotency: insert the event id; if duplicate, short-circuit
  const inserted = await query<{ event_id: string }>(
    `INSERT INTO processed_stripe_events (event_id, event_type)
     VALUES ($1, $2)
     ON CONFLICT (event_id) DO NOTHING
     RETURNING event_id`,
    [event.id, event.type],
  );
  if (inserted.length === 0) {
    return NextResponse.json({ received: true, idempotent: true });
  }

  if (event.type === 'checkout.session.completed') {
    const session = event.data.object as Stripe.Checkout.Session;
    const sessionId = session.id;

    // Dispatch lunch-club checkout sessions to the lunchclub handler. Alumni
    // sessions (no metadata.module or anything other than 'lunchclub') fall
    // through to the original reservation flow below.
    if (session.metadata?.module === 'lunchclub') {
      const summary = await handleLunchclubCheckoutCompleted(session);
      return NextResponse.json({ received: true, ...summary });
    }

    const reservation = await getReservationByCheckoutSession(sessionId);
    if (!reservation) {
      // Reservation not found for this session; ack so Stripe doesn't retry.
      return NextResponse.json({ received: true, no_reservation: true });
    }
    if (reservation.status === 'confirmed') {
      return NextResponse.json({ received: true, already_confirmed: true });
    }

    const amountPaid =
      typeof session.amount_total === 'number'
        ? session.amount_total
        : 0;
    const paymentIntentId =
      typeof session.payment_intent === 'string'
        ? session.payment_intent
        : null;

    const confirmed = await markConfirmedFromWebhook({
      reservationId: reservation.id,
      amountPaidCents: amountPaid,
      paymentIntentId,
    });
    if (!confirmed) {
      return NextResponse.json({ received: true, no_update: true });
    }

    const relations = await getDinnerWithRelations(confirmed.dinner_id);
    if (relations) {
      const { dinner, chapter, venue } = relations;
      const guestRows = await query<{ email: string }>(
        `SELECT email FROM guests WHERE id = $1`,
        [confirmed.guest_id],
      );
      const guestEmail = guestRows[0]?.email;
      if (guestEmail) {
        const fullAddress = buildFullAddress(venue.address, venue.city) ?? venue.name;
        const calendarDinner = {
          title: `${chapter.display_name} dinner`,
          startsAt: dinner.starts_at,
          address: fullAddress,
          description: dinner.description ?? dinner.title,
        };
        const googleUrl = generateGoogleCalendarUrl(calendarDinner);
        const outlookUrl = generateOutlookUrl(calendarDinner);
        const icsUrl = generateIcsDownloadUrl(confirmed.calendar_token);
        const cancelUrl = `${baseUrl()}/cancel/${confirmed.cancel_token}`;

        await sendEmail({
          from: chapterFrom({ from_display_name: chapter.from_display_name }),
          to: guestEmail,
          replyTo: replyTo(),
          subject: `You're confirmed — ${dinner.title}`,
          react: ReservationConfirmation({
            chapterDisplayName: chapter.display_name,
            chapterAccent: chapter.color_accent,
            dinnerTitle: dinner.title,
            dinnerStartsAt: dinner.starts_at,
            venueName: venue.name,
            fullAddress,
            parkingNote: dinner.parking_note,
            menu: dinner.menu,
            bringsPartner: confirmed.brings_partner,
            amountPaidDollars: ((confirmed.amount_paid_cents ?? 0) / 100).toFixed(2),
            googleCalendarUrl: googleUrl,
            outlookUrl,
            icsUrl,
            cancelUrl,
          }),
        });
      }
    }
  }

  return NextResponse.json({ received: true });
}
