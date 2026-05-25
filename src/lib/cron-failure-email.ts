import { sendEmail, platformFrom, replyTo, joeNotificationEmail } from './email';
import CronFailureEmail from '@/emails/cron-failure';
import type { CronJobName } from './cron-locks';

export async function sendCronFailureEmail(jobName: CronJobName, err: Error): Promise<void> {
  await sendEmail({
    from: platformFrom(),
    to: joeNotificationEmail(),
    replyTo: replyTo(),
    subject: `[Cron Error] ${jobName} failed`,
    react: CronFailureEmail({ jobName, stack: err?.stack || String(err), message: err?.message ?? '' }),
  });
}
