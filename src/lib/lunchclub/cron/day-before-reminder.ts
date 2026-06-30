import { runCronJob } from '@/lib/runCron';
import type { JobSummary } from '@/lib/types';
import { sendSms } from '@/lib/sms/quo';
import {
  listBookingsNeedingReminder,
  stampReminderSent,
} from '@/lib/lunchclub/data';
import { buildDayBeforeReminderSms } from '@/lib/lunchclub/sms-templates';

interface RunOpts {
  dryRun?: boolean;
  limit?: number;
}

export async function run(opts: RunOpts = {}): Promise<JobSummary> {
  return runCronJob('lunchclub_day_before_reminder', async ({ dryRun, limit }) => {
    const all = await listBookingsNeedingReminder();
    const slice = typeof limit === 'number' && limit > 0 ? all.slice(0, limit) : all;
    let sent = 0;
    let smsErrors = 0;
    let skippedNoPhone = 0;
    for (const ctx of slice) {
      const sms = buildDayBeforeReminderSms(ctx);
      if (!sms.to) {
        skippedNoPhone++;
        if (!dryRun) await stampReminderSent(ctx.booking.id);
        continue;
      }
      if (dryRun) {
        sent++;
        continue;
      }
      const res = await sendSms(sms);
      if (res.ok) {
        await stampReminderSent(ctx.booking.id);
        sent++;
      } else {
        smsErrors++;
        console.error('[lunchclub:day-before] sms failed', {
          bookingId: ctx.booking.id,
          status: res.status,
          error: res.error,
        });
      }
    }
    return {
      ok: true,
      processed: slice.length,
      sent,
      sms_errors: smsErrors,
      skipped_no_phone: skippedNoPhone,
    };
  }, { dryRun: opts.dryRun, limit: opts.limit });
}
