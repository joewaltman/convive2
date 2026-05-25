import { NextResponse } from 'next/server';
import { requireSuperAdmin } from '@/lib/auth/admin';
import { runCronJob } from '@/lib/runCron';
import type { CronJobName } from '@/lib/cron-locks';
import { sendRemindersBody } from '@/lib/cron-jobs/send-reminders';
import { sendPostDinnerBody } from '@/lib/cron-jobs/send-post-dinner';
import { processWaitlistBody } from '@/lib/cron-jobs/process-waitlist';
import { expirePendingReservationsBody } from '@/lib/cron-jobs/expire-pending-reservations';
import type { JobSummary } from '@/lib/types';

const JOB_MAP: Record<
  string,
  {
    name: CronJobName;
    body: (opts: { dryRun: boolean; dinnerId?: number; limit?: number }) => Promise<JobSummary>;
  }
> = {
  'send-reminders': { name: 'send_reminders', body: sendRemindersBody },
  'send-post-dinner': { name: 'send_post_dinner', body: sendPostDinnerBody },
  'process-waitlist': { name: 'process_waitlist', body: processWaitlistBody },
  'expire-pending-reservations': {
    name: 'expire_pending_reservations',
    body: expirePendingReservationsBody,
  },
};

export async function POST(req: Request, ctx: { params: Promise<{ job: string }> }) {
  await requireSuperAdmin();
  const { job } = await ctx.params;
  const cfg = JOB_MAP[job];
  if (!cfg) return NextResponse.json({ error: 'unknown_job' }, { status: 404 });

  let body: unknown = {};
  try {
    body = await req.json();
  } catch {
    body = {};
  }
  const b = (body ?? {}) as Record<string, unknown>;
  const dryRun = b.dryRun === true;
  const dinnerId =
    typeof b.dinnerId === 'number' && Number.isFinite(b.dinnerId)
      ? b.dinnerId
      : typeof b.dinnerId === 'string' && b.dinnerId.trim()
        ? parseInt(b.dinnerId.trim(), 10)
        : undefined;
  const limit =
    typeof b.limit === 'number' && Number.isFinite(b.limit)
      ? b.limit
      : typeof b.limit === 'string' && b.limit.trim()
        ? parseInt(b.limit.trim(), 10)
        : undefined;

  try {
    const summary = await runCronJob(cfg.name, cfg.body, {
      dryRun,
      dinnerId: dinnerId !== undefined && Number.isFinite(dinnerId) ? dinnerId : undefined,
      limit: limit !== undefined && Number.isFinite(limit) ? limit : undefined,
    });
    return NextResponse.json({ summary });
  } catch (err) {
    const e = err as Error;
    return NextResponse.json({ error: 'job_failed', message: e.message }, { status: 500 });
  }
}
