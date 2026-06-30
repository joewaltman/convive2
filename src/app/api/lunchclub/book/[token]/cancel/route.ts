import { NextResponse } from 'next/server';
import {
  getBookingByToken,
  getBookingContext,
  markBookingCancelled,
  markBookingRefunded,
} from '@/lib/lunchclub/data';
import { refundBooking } from '@/lib/lunchclub/refund';
import { buildGuestCancelSms } from '@/lib/lunchclub/sms-templates';
import { sendSms } from '@/lib/sms/quo';

export const runtime = 'nodejs';

export async function POST(
  _req: Request,
  ctx: { params: Promise<{ token: string }> },
) {
  const { token } = await ctx.params;
  const b = await getBookingByToken(token);
  if (!b) {
    return NextResponse.json({ error: 'invalid_token' }, { status: 404 });
  }
  if (b.booking.status === 'cancelled' || b.booking.status === 'refunded') {
    return NextResponse.json({ ok: true, refunded: false, already: true });
  }

  const outsideWindow = Date.now() < b.lunch.booking_cutoff_at.getTime();
  let refunded = false;
  let refundId: string | null = null;

  if (
    b.booking.status === 'paid' &&
    b.booking.stripe_payment_intent_id &&
    outsideWindow
  ) {
    const r = await refundBooking({
      paymentIntentId: b.booking.stripe_payment_intent_id,
    });
    if (r.ok) {
      refunded = true;
      refundId = r.refundId;
    } else {
      console.error('[lunchclub:cancel] refund failed', {
        bookingId: b.booking.id,
        error: r.error,
      });
    }
  }

  if (refunded && refundId) {
    await markBookingRefunded(b.booking.id, refundId);
  } else {
    await markBookingCancelled(b.booking.id);
  }

  const fresh = await getBookingContext(b.booking.id);
  if (fresh) {
    const sms = buildGuestCancelSms(fresh, refunded);
    if (sms.to) {
      const sres = await sendSms(sms);
      if (!sres.ok) {
        console.error('[lunchclub:cancel] sms failed', {
          bookingId: b.booking.id,
          error: sres.error,
        });
      }
    }
  }

  return NextResponse.json({ ok: true, refunded });
}
