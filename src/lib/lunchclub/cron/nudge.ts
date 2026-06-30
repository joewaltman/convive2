import { runCronJob } from '@/lib/runCron';
import type { JobSummary } from '@/lib/types';
import { sendSms } from '@/lib/sms/quo';
import { listBookingsNeedingNudge, stampNudgeSent } from '@/lib/lunchclub/data';
import { buildNudgeSms } from '@/lib/lunchclub/sms-templates';

function baseUrl(): string {
  return process.env.NEXT_PUBLIC_BASE_URL ?? 'https://con-vive.com';
}

interface RunOpts {
  dryRun?: boolean;
  limit?: number;
}

export async function run(opts: RunOpts = {}): Promise<JobSummary> {
  return runCronJob('lunchclub_nudge', async ({ dryRun, limit }) => {
    const all = await listBookingsNeedingNudge();
    const slice = typeof limit === 'number' && limit > 0 ? all.slice(0, limit) : all;
    let sent = 0;
    let smsErrors = 0;
    let skippedNoPhone = 0;
    for (const ctx of slice) {
      const sms = buildNudgeSms(ctx, baseUrl());
      if (!sms.to) {
        skippedNoPhone++;
        // Stamp anyway so we don't keep retrying a guest without a phone.
        if (!dryRun) await stampNudgeSent(ctx.booking.id);
        continue;
      }
      if (dryRun) {
        sent++;
        continue;
      }
      const res = await sendSms(sms);
      if (res.ok) {
        await stampNudgeSent(ctx.booking.id);
        sent++;
      } else {
        smsErrors++;
        console.error('[lunchclub:nudge] sms failed', {
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
