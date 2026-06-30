import { NextResponse } from 'next/server';
import { getCurrentAdmin } from '@/lib/auth/admin';
import { stripe } from '@/lib/stripe';
import {
  countPaidSeats,
  getLunch,
  markBookingPaid,
  markLunchStatus,
  resetConsecutiveUnpaid,
} from '@/lib/lunchclub/data';

export const runtime = 'nodejs';

const PAID_SEAT_FLOOR = 4;

async function requireSuper() {
  const a = await getCurrentAdmin();
  if (!a || a.chapter_id !== null) return null;
  return a;
}

export async function POST(
  _req: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  if (!(await requireSuper())) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }
  const { id } = await ctx.params;
  const lunchId = Number(id);
  if (!Number.isInteger(lunchId)) {
    return NextResponse.json({ error: 'invalid_id' }, { status: 400 });
  }
  const lunch = await getLunch(lunchId);
  if (!lunch) return NextResponse.json({ error: 'not_found' }, { status: 404 });

  // List recent Checkout sessions and filter by metadata.
  // Stripe's search API: query by metadata['lunch_id'] requires the search index.
  // Fall back to listing with a generous page size.
  let updates = 0;
  let scanned = 0;
  let nextPage: string | undefined;
  do {
    const page = await stripe.checkout.sessions.list({
      limit: 100,
      starting_after: nextPage,
    });
    nextPage = page.has_more ? page.data[page.data.length - 1]?.id : undefined;
    for (const session of page.data) {
      scanned++;
      const md = session.metadata ?? {};
      if (md.module !== 'lunchclub') continue;
      if (md.lunch_id !== String(lunchId)) continue;
      if (session.payment_status !== 'paid') continue;
      const bookingId = Number(session.client_reference_id ?? md.booking_id);
      if (!Number.isInteger(bookingId)) continue;
      const paymentIntentId =
        typeof session.payment_intent === 'string' ? session.payment_intent : null;
      const amount = typeof session.amount_total === 'number' ? session.amount_total : 0;
      const paid = await markBookingPaid(bookingId, {
        sessionId: session.id,
        paymentIntentId,
        amountCents: amount,
      });
      if (paid) {
        updates++;
        await resetConsecutiveUnpaid(paid.table_member_id);
      }
    }
    // Cap at a few pages to bound the scan; admin can re-run.
    if (scanned >= 500) break;
  } while (nextPage);

  const paidSeats = await countPaidSeats(lunchId);
  if (paidSeats >= PAID_SEAT_FLOOR && lunch.status === 'tentative') {
    await markLunchStatus(lunchId, 'confirmed');
  }

  return NextResponse.json({ ok: true, scanned, updates, paid_seats: paidSeats });
}
