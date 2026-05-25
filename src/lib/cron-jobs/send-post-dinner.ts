import { fromZonedTime, toZonedTime } from 'date-fns-tz';
import { query } from '@/lib/db';
import { getDinnerWithRelations } from '@/lib/dinners';
import { sendEmail, chapterFrom, replyTo, unsubscribeUrl, bulkHeaders } from '@/lib/email';
import PostDinnerThankYou from '@/emails/post-dinner-thank-you';
import type { JobSummary } from '@/lib/types';

const LA = 'America/Los_Angeles';

interface CandidateRow {
  reservation_id: number;
  guest_id: number;
  guest_email: string;
  guest_unsub: Date | null;
  dinner_id: number;
}

export async function sendPostDinnerBody(opts: {
  dryRun: boolean;
  dinnerId?: number;
  limit?: number;
}): Promise<JobSummary> {
  const nowPT = toZonedTime(new Date(), LA);
  const startOfYesterdayPT = new Date(
    nowPT.getFullYear(),
    nowPT.getMonth(),
    nowPT.getDate() - 1,
    0,
    0,
    0,
  );
  const startOfTodayPT = new Date(
    nowPT.getFullYear(),
    nowPT.getMonth(),
    nowPT.getDate(),
    0,
    0,
    0,
  );
  const startUtc = fromZonedTime(startOfYesterdayPT, LA);
  const endUtc = fromZonedTime(startOfTodayPT, LA);

  const params: unknown[] = [startUtc, endUtc];
  let dinnerClause = '';
  if (opts.dinnerId) {
    params.push(opts.dinnerId);
    dinnerClause = ` AND r.dinner_id = $${params.length}`;
  }
  let limitClause = '';
  if (opts.limit && Number.isFinite(opts.limit) && opts.limit > 0) {
    params.push(opts.limit);
    limitClause = ` LIMIT $${params.length}`;
  }

  const candidates = await query<CandidateRow>(
    `SELECT r.id AS reservation_id, r.guest_id, g.email AS guest_email,
            g.email_unsubscribed_at AS guest_unsub, r.dinner_id
     FROM reservations r
     JOIN dinners d ON d.id = r.dinner_id
     JOIN guests g ON g.id = r.guest_id
     WHERE r.status = 'confirmed'
       AND r.post_dinner_sent_at IS NULL
       AND d.starts_at >= $1 AND d.starts_at < $2${dinnerClause}
     ORDER BY r.id ASC${limitClause}`,
    params,
  );

  let processed = 0;
  let sent = 0;
  let skippedUnsub = 0;
  let errors = 0;

  const dinnerCache = new Map<number, Awaited<ReturnType<typeof getDinnerWithRelations>>>();
  const base = process.env.NEXT_PUBLIC_BASE_URL ?? 'https://con-vive.com';

  for (const row of candidates) {
    processed++;
    try {
      if (row.guest_unsub) {
        skippedUnsub++;
        continue;
      }

      let bundle = dinnerCache.get(row.dinner_id);
      if (bundle === undefined) {
        bundle = await getDinnerWithRelations(row.dinner_id);
        dinnerCache.set(row.dinner_id, bundle);
      }
      if (!bundle) {
        errors++;
        continue;
      }
      const { chapter } = bundle;
      const chapterPageUrl = `${base}/${chapter.slug}`;

      if (opts.dryRun) {
        sent++;
        continue;
      }

      await sendEmail({
        from: chapterFrom(chapter),
        to: row.guest_email,
        replyTo: replyTo(),
        subject: `Thanks for joining us at ${chapter.display_name}`,
        react: PostDinnerThankYou({
          chapterDisplayName: chapter.display_name,
          chapterAccent: chapter.color_accent,
          chapterPageUrl,
          unsubscribeUrl: unsubscribeUrl(row.guest_id),
        }),
        headers: bulkHeaders(unsubscribeUrl(row.guest_id)),
      });

      await query(
        `UPDATE reservations SET post_dinner_sent_at = NOW(), updated_at = NOW() WHERE id = $1`,
        [row.reservation_id],
      );
      sent++;
    } catch (err) {
      console.error('[send-post-dinner]', err);
      errors++;
    }
  }

  return { processed, sent, skipped_unsub: skippedUnsub, errors };
}
