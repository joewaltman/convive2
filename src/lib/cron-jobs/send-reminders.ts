import { fromZonedTime, toZonedTime } from 'date-fns-tz';
import { query } from '@/lib/db';
import { getDinnerWithRelations } from '@/lib/dinners';
import { generateGoogleCalendarUrl, generateOutlookUrl, generateIcsDownloadUrl } from '@/lib/calendar';
import { sendEmail, chapterFrom, replyTo, unsubscribeUrl, bulkHeaders } from '@/lib/email';
import DinnerReminder from '@/emails/dinner-reminder';
import {
  selectCompanions,
  renderCompanionBlock,
  type AttendeeForReminder,
  type CompanionBlock,
} from '@/lib/reminder-companions';
import type { JobSummary } from '@/lib/types';

const LA = 'America/Los_Angeles';

interface RemindCandidateRow {
  reservation_id: number;
  guest_id: number;
  guest_email: string;
  guest_unsub: Date | null;
  dinner_id: number;
  calendar_token: string;
}

export async function sendRemindersBody(opts: {
  dryRun: boolean;
  dinnerId?: number;
  limit?: number;
}): Promise<JobSummary> {
  const nowPT = toZonedTime(new Date(), LA);
  const startOfTomorrowPT = new Date(
    nowPT.getFullYear(),
    nowPT.getMonth(),
    nowPT.getDate() + 1,
    0,
    0,
    0,
  );
  const endOfTomorrowPT = new Date(
    nowPT.getFullYear(),
    nowPT.getMonth(),
    nowPT.getDate() + 2,
    0,
    0,
    0,
  );
  const startUtc = fromZonedTime(startOfTomorrowPT, LA);
  const endUtc = fromZonedTime(endOfTomorrowPT, LA);

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

  const candidates = await query<RemindCandidateRow>(
    `SELECT r.id AS reservation_id, r.guest_id, g.email AS guest_email,
            g.email_unsubscribed_at AS guest_unsub, r.dinner_id, r.calendar_token
     FROM reservations r
     JOIN dinners d ON d.id = r.dinner_id
     JOIN guests g ON g.id = r.guest_id
     WHERE r.status = 'confirmed'
       AND r.reminder_sent_at IS NULL
       AND d.starts_at >= $1 AND d.starts_at < $2${dinnerClause}
     ORDER BY r.id ASC${limitClause}`,
    params,
  );

  let processed = 0;
  let sent = 0;
  let skippedUnsub = 0;
  let errors = 0;

  // Cache dinner + attendee lookups per dinner_id
  const dinnerCache = new Map<number, Awaited<ReturnType<typeof getDinnerWithRelations>>>();
  const attendeeCache = new Map<number, AttendeeForReminder[]>();

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

      let attendees = attendeeCache.get(row.dinner_id);
      if (!attendees) {
        attendees = await query<AttendeeForReminder>(
          `SELECT r.guest_id, g.first_name, g.last_name, r.grad_year, r.major,
                  g.what_do_you_do
           FROM reservations r
           JOIN guests g ON g.id = r.guest_id
           WHERE r.dinner_id = $1 AND r.status = 'confirmed'`,
          [row.dinner_id],
        );
        attendeeCache.set(row.dinner_id, attendees);
      }

      const companionsRaw = selectCompanions(attendees, row.guest_id, row.dinner_id);
      const companions: CompanionBlock[] = companionsRaw
        .map((c) => renderCompanionBlock(c))
        .filter((c): c is CompanionBlock => c !== null);

      const { dinner, venue, chapter } = bundle;
      const fullAddress = [venue.address, venue.neighborhood, venue.city]
        .filter(Boolean)
        .join(', ');
      const calendarPayload = {
        title: `${chapter.display_name} dinner`,
        startsAt: dinner.starts_at,
        address: fullAddress,
        description: dinner.description ?? dinner.title,
      };

      if (opts.dryRun) {
        sent++;
        continue;
      }

      await sendEmail({
        from: chapterFrom(chapter),
        to: row.guest_email,
        replyTo: replyTo(),
        subject: `Tomorrow: ${dinner.title}`,
        react: DinnerReminder({
          chapterDisplayName: chapter.display_name,
          chapterAccent: chapter.color_accent,
          dinnerTitle: dinner.title,
          dinnerStartsAt: dinner.starts_at,
          venueName: venue.name,
          fullAddress,
          parkingNote: dinner.parking_note,
          googleCalendarUrl: generateGoogleCalendarUrl(calendarPayload),
          outlookUrl: generateOutlookUrl(calendarPayload),
          icsUrl: generateIcsDownloadUrl(row.calendar_token),
          companions,
          unsubscribeUrl: unsubscribeUrl(row.guest_id),
        }),
        headers: bulkHeaders(unsubscribeUrl(row.guest_id)),
      });

      await query(
        `UPDATE reservations SET reminder_sent_at = NOW(), updated_at = NOW() WHERE id = $1`,
        [row.reservation_id],
      );

      sent++;
    } catch (err) {
      console.error('[send-reminders]', err);
      errors++;
    }
  }

  return { processed, sent, skipped_unsub: skippedUnsub, errors };
}
