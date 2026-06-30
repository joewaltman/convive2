import type Stripe from 'stripe';
import {
  countPaidSeats,
  getBookingById,
  getBookingContext,
  markBookingPaid,
  markLunchStatus,
  resetConsecutiveUnpaid,
} from './data';
import { buildConfirmationSms } from './sms-templates';
import { sendSms } from '@/lib/sms/quo';

const PAID_SEAT_FLOOR = 4;

/**
 * Handle a Stripe checkout.session.completed event whose metadata.module is
 * 'lunchclub'. Dispatched from the unified /api/webhook/stripe handler after
 * its own idempotency check. Always returns a JSON-serializable summary; never
 * throws so the calling webhook always 200s back to Stripe.
 */
export async function handleLunchclubCheckoutCompleted(
  session: Stripe.Checkout.Session,
): Promise<Record<string, unknown>> {
  const md = session.metadata ?? {};
  const bookingId = Number(session.client_reference_id ?? md.booking_id);
  if (!Number.isFinite(bookingId) || bookingId <= 0) {
    return { module: 'lunchclub', no_booking_ref: true };
  }
  const existing = await getBookingById(bookingId);
  if (!existing) {
    return { module: 'lunchclub', no_booking: true };
  }
  if (existing.status === 'paid') {
    return { module: 'lunchclub', already_paid: true };
  }

  const amountCents =
    typeof session.amount_total === 'number' ? session.amount_total : 0;
  const paymentIntentId =
    typeof session.payment_intent === 'string' ? session.payment_intent : null;

  const paid = await markBookingPaid(bookingId, {
    sessionId: session.id,
    paymentIntentId,
    amountCents,
  });
  if (!paid) {
    return { module: 'lunchclub', already_paid: true };
  }

  await resetConsecutiveUnpaid(paid.table_member_id);

  // Confirmation SMS (non-fatal on failure).
  const ctx = await getBookingContext(bookingId);
  if (ctx) {
    const sms = buildConfirmationSms(ctx);
    if (sms.to) {
      const sres = await sendSms(sms);
      if (!sres.ok) {
        console.error('[lunchclub:webhook] confirmation sms failed', {
          bookingId,
          error: sres.error,
        });
      }
    }
  }

  // Auto-confirm lunch when paid seat floor is hit.
  const paidSeats = await countPaidSeats(paid.lunch_id);
  if (paidSeats >= PAID_SEAT_FLOOR && ctx && ctx.lunch.status === 'tentative') {
    await markLunchStatus(paid.lunch_id, 'confirmed');
  }

  return { module: 'lunchclub', paid: true };
}
