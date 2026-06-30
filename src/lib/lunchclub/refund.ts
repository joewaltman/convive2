import { stripe } from '@/lib/stripe';

export interface RefundArgs {
  paymentIntentId: string;
  amountCents?: number;
}

export type RefundResult =
  | { ok: true; refundId: string }
  | { ok: false; error: string };

/**
 * Wraps stripe.refunds.create. Never throws so callers can branch cleanly
 * inside a webhook or cron iteration.
 */
export async function refundBooking(args: RefundArgs): Promise<RefundResult> {
  if (!args.paymentIntentId) {
    return { ok: false, error: 'missing_payment_intent' };
  }
  try {
    const refund = await stripe.refunds.create({
      payment_intent: args.paymentIntentId,
      ...(typeof args.amountCents === 'number' ? { amount: args.amountCents } : {}),
    });
    return { ok: true, refundId: refund.id };
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : String(err),
    };
  }
}
