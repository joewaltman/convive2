import { NextResponse } from 'next/server';
import { getCurrentAdmin } from '@/lib/auth/admin';
import {
  getBookingContext,
  getLunch,
  listBookingsForLunch,
  markBookingCancelled,
  markBookingRefunded,
  markLunchStatus,
} from '@/lib/lunchclub/data';
import { refundBooking } from '@/lib/lunchclub/refund';
import { buildLunchCancelledSms } from '@/lib/lunchclub/sms-templates';
import { sendSms } from '@/lib/sms/quo';

export const runtime = 'nodejs';

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
  if (lunch.status === 'cancelled') {
    return NextResponse.json({ ok: true, already_cancelled: true });
  }
  await markLunchStatus(lunchId, 'cancelled');

  const bookings = await listBookingsForLunch(lunchId);
  let refundsIssued = 0;
  let refundErrors = 0;
  let smsSent = 0;
  let smsErrors = 0;

  for (const b of bookings) {
    let refunded = false;
    if (b.status === 'paid' && b.stripe_payment_intent_id) {
      const r = await refundBooking({
        paymentIntentId: b.stripe_payment_intent_id,
      });
      if (r.ok) {
        await markBookingRefunded(b.id, r.refundId);
        refundsIssued++;
        refunded = true;
      } else {
        refundErrors++;
        console.error('[lunchclub:cancel-lunch] refund failed', {
          bookingId: b.id,
          error: r.error,
        });
        await markBookingCancelled(b.id);
      }
    } else if (b.status === 'paid' || b.status === 'invited' || b.status === 'checkout_pending') {
      await markBookingCancelled(b.id);
    }
    if (b.signup.phone) {
      const fresh = await getBookingContext(b.id);
      if (fresh) {
        const sms = buildLunchCancelledSms(fresh, refunded);
        if (sms.to) {
          const sres = await sendSms(sms);
          if (sres.ok) smsSent++;
          else {
            smsErrors++;
            console.error('[lunchclub:cancel-lunch] sms failed', {
              bookingId: b.id,
              error: sres.error,
            });
          }
        }
      }
    }
  }

  return NextResponse.json({
    ok: true,
    refunds_issued: refundsIssued,
    refund_errors: refundErrors,
    sms_sent: smsSent,
    sms_errors: smsErrors,
  });
}
