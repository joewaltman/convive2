import { pool } from './db';
import { CRON_LOCKS, type CronJobName } from './cron-locks';
import { sendEmail, platformFrom, replyTo, joeNotificationEmail } from './email';
import CronFailure from '../emails/cron-failure';
import type { JobSummary } from './types';

export interface CronOpts {
  dryRun?: boolean;
  dinnerId?: number;
  limit?: number;
}

async function sendCronFailureEmail(jobName: CronJobName, err: Error): Promise<void> {
  await sendEmail({
    from: platformFrom(),
    to: joeNotificationEmail(),
    replyTo: replyTo(),
    subject: `[Cron Error] ${jobName} failed`,
    react: CronFailure({ jobName, stack: err?.stack || String(err), message: err?.message ?? '' }),
  });
}

export async function runCronJob(
  jobName: CronJobName,
  body: (opts: { dryRun: boolean; dinnerId?: number; limit?: number }) => Promise<JobSummary>,
  opts: CronOpts = {},
): Promise<JobSummary> {
  const lockId = CRON_LOCKS[jobName];
  const client = await pool.connect();

  const runIns = await client.query(
    `INSERT INTO cron_runs (job_name) VALUES ($1) RETURNING id`,
    [jobName],
  );
  const runId = runIns.rows[0].id;

  try {
    await client.query('BEGIN');
    const lockRes = await client.query(
      `SELECT pg_try_advisory_xact_lock($1) AS got`,
      [lockId],
    );
    if (!lockRes.rows[0].got) {
      await client.query('ROLLBACK');
      await client.query(
        `UPDATE cron_runs SET status='skipped_locked', completed_at=NOW() WHERE id=$1`,
        [runId],
      );
      return { skipped: true, reason: 'locked' };
    }

    const summary = await body({
      dryRun: !!opts.dryRun,
      dinnerId: opts.dinnerId,
      limit: opts.limit,
    });

    await client.query('COMMIT');
    await client.query(
      `UPDATE cron_runs SET status='success', completed_at=NOW(), summary=$2 WHERE id=$1`,
      [runId, JSON.stringify(summary)],
    );
    return summary;
  } catch (err: unknown) {
    try { await client.query('ROLLBACK'); } catch { /* ignore */ }
    const e = err as Error;
    await client.query(
      `UPDATE cron_runs SET status='error', completed_at=NOW(), error_message=$2 WHERE id=$1`,
      [runId, e?.stack || String(err)],
    );
    try { await sendCronFailureEmail(jobName, e); } catch { /* swallow secondary failure */ }
    throw err;
  } finally {
    client.release();
  }
}
