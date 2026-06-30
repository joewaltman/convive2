import { runCronJob } from '@/lib/runCron';
import type { JobSummary } from '@/lib/types';
import { sendSms } from '@/lib/sms/quo';
import {
  countPaidSeats,
  getBookingContext,
  listBookingsForLunch,
  listOverdueLunchesForBelowFloor,
  markBookingCancelled,
  markBookingRefunded,
  markLunchStatus,
} from '@/lib/lunchclub/data';
import { refundBooking } from '@/lib/lunchclub/refund';
import { buildLunchCancelledSms } from '@/lib/lunchclub/sms-templates';

const PAID_SEAT_FLOOR = 4;

interface RunOpts {
  dryRun?: boolean;
  limit?: number;
}

export async function run(opts: RunOpts = {}): Promise<JobSummary> {
  return runCronJob('lunchclub_below_floor_cancel', async ({ dryRun, limit }) => {
    const lunches = await listOverdueLunchesForBelowFloor();
    const slice = typeof limit === 'number' && limit > 0 ? lunches.slice(0, limit) : lunches;

    let confirmedAtCutoff = 0;
    let cancelledLunches = 0;
    let refundsIssued = 0;
    let refundErrors = 0;
    let smsSent = 0;
    let smsErrors = 0;

    for (const lunch of slice) {
      const paidSeats = await countPaidSeats(lunch.id);
      if (paidSeats >= PAID_SEAT_FLOOR) {
        if (lunch.status === 'tentative' && !dryRun) {
          await markLunchStatus(lunch.id, 'confirmed');
        }
        confirmedAtCutoff++;
        continue;
      }
      // Below floor: cancel + refund + notify everyone
      if (!dryRun) await markLunchStatus(lunch.id, 'cancelled');
      cancelledLunches++;
      const bookings = await listBookingsForLunch(lunch.id);
      for (const b of bookings) {
        let refunded = false;
        if (
          b.status === 'paid' &&
          b.stripe_payment_intent_id &&
          !dryRun
        ) {
          const r = await refundBooking({
            paymentIntentId: b.stripe_payment_intent_id,
          });
          if (r.ok) {
            await markBookingRefunded(b.id, r.refundId);
            refunded = true;
            refundsIssued++;
          } else {
            refundErrors++;
            console.error('[lunchclub:below-floor] refund failed', {
              bookingId: b.id,
              error: r.error,
            });
            // Still mark cancelled so seat is freed and we don't keep paying it.
            await markBookingCancelled(b.id);
          }
        } else if (
          (b.status === 'paid' || b.status === 'invited' || b.status === 'checkout_pending') &&
          !dryRun
        ) {
          await markBookingCancelled(b.id);
        }
        if (b.signup.phone) {
          const ctx = await getBookingContext(b.id);
          if (ctx) {
            const sms = buildLunchCancelledSms(ctx, refunded);
            if (sms.to) {
              if (dryRun) {
                smsSent++;
              } else {
                const sres = await sendSms(sms);
                if (sres.ok) smsSent++;
                else {
                  smsErrors++;
                  console.error('[lunchclub:below-floor] sms failed', {
                    bookingId: b.id,
                    error: sres.error,
                  });
                }
              }
            }
          }
        }
      }
    }

    return {
      ok: true,
      processed: slice.length,
      confirmed_at_cutoff: confirmedAtCutoff,
      cancelled_lunches: cancelledLunches,
      refunds_issued: refundsIssued,
      refund_errors: refundErrors,
      sms_sent: smsSent,
      sms_errors: smsErrors,
    };
  }, { dryRun: opts.dryRun, limit: opts.limit });
}
