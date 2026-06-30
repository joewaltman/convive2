import { NextResponse } from 'next/server';
import { getCurrentAdmin } from '@/lib/auth/admin';
import { run as runNudge } from '@/lib/lunchclub/cron/nudge';
import { run as runDayBefore } from '@/lib/lunchclub/cron/day-before-reminder';
import { run as runBelowFloor } from '@/lib/lunchclub/cron/below-floor-cancel';
import { run as runMonthly } from '@/lib/lunchclub/cron/monthly-loop';

export const runtime = 'nodejs';

type Job = 'nudge' | 'day-before' | 'below-floor' | 'monthly';
const JOBS: ReadonlySet<Job> = new Set(['nudge', 'day-before', 'below-floor', 'monthly']);

function isJob(v: string): v is Job {
  return (JOBS as Set<string>).has(v);
}

async function authorize(req: Request): Promise<boolean> {
  const headerSecret = req.headers.get('x-cron-secret');
  const envSecret = process.env.LUNCHCLUB_CRON_SECRET;
  if (headerSecret && envSecret && headerSecret === envSecret) return true;
  const admin = await getCurrentAdmin();
  return !!admin && admin.chapter_id === null;
}

export async function POST(
  req: Request,
  ctx: { params: Promise<{ job: string }> },
) {
  const { job } = await ctx.params;
  if (!isJob(job)) {
    return NextResponse.json({ error: 'unknown_job' }, { status: 404 });
  }
  if (!(await authorize(req))) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  let body: { dryRun?: boolean; limit?: number } = {};
  try {
    const text = await req.text();
    if (text.trim().length > 0) {
      const parsed = JSON.parse(text) as { dryRun?: boolean; limit?: number };
      body = {
        dryRun: typeof parsed.dryRun === 'boolean' ? parsed.dryRun : undefined,
        limit:
          typeof parsed.limit === 'number' && Number.isFinite(parsed.limit) && parsed.limit > 0
            ? Math.floor(parsed.limit)
            : undefined,
      };
    }
  } catch {
    return NextResponse.json({ error: 'invalid_body' }, { status: 400 });
  }

  try {
    let summary;
    if (job === 'nudge') summary = await runNudge(body);
    else if (job === 'day-before') summary = await runDayBefore(body);
    else if (job === 'below-floor') summary = await runBelowFloor(body);
    else summary = await runMonthly(body);
    return NextResponse.json({ ok: true, job, summary });
  } catch (err) {
    console.error('[lunchclub:cron]', job, err);
    return NextResponse.json(
      { ok: false, job, error: err instanceof Error ? err.message : String(err) },
      { status: 500 },
    );
  }
}
