import { fromZonedTime, toZonedTime } from 'date-fns-tz';
import { query } from './lib/db';
import { runCronJob } from './lib/runCron';
import { sendEmail, chapterFrom, replyTo, unsubscribeUrl, bulkHeaders } from './lib/email';
import PostDinnerThankYou from './emails/post-dinner-thank-you';
import type { JobSummary, Chapter, Dinner, Venue } from './lib/types';

const LA = 'America/Los_Angeles';

interface CandidateRow {
  reservation_id: number;
  guest_id: number;
  guest_email: string;
  guest_unsub: Date | null;
  dinner_id: number;
}

interface DinnerBundle {
  dinner: Dinner;
  chapter: Chapter;
  venue: Venue;
}

async function getDinnerWithRelations(dinnerId: number): Promise<DinnerBundle | null> {
  const rows = await query<Dinner & { chapter_slug: string } & Record<string, unknown>>(
    `SELECT d.*, c.id AS ch_id, c.slug AS chapter_slug, c.short_name AS ch_short_name,
            c.school_name AS ch_school_name, c.display_name AS ch_display_name,
            c.tagline AS ch_tagline, c.from_display_name AS ch_from_display_name,
            c.color_primary AS ch_color_primary, c.color_secondary AS ch_color_secondary,
            c.color_header_bg AS ch_color_header_bg, c.color_header_text AS ch_color_header_text,
            c.color_accent AS ch_color_accent, c.font_family AS ch_font_family,
            c.is_active AS ch_is_active, c.created_at AS ch_created_at, c.updated_at AS ch_updated_at,
            v.id AS v_id, v.name AS v_name, v.venue_type AS v_venue_type,
            v.host_guest_id AS v_host_guest_id, v.address AS v_address,
            v.neighborhood AS v_neighborhood, v.city AS v_city,
            v.google_maps_link AS v_google_maps_link, v.capacity_min AS v_capacity_min,
            v.capacity_max AS v_capacity_max, v.description AS v_description,
            v.photo_url AS v_photo_url, v.is_public AS v_is_public, v.is_active AS v_is_active,
            v.created_at AS v_created_at, v.updated_at AS v_updated_at
     FROM dinners d
     JOIN chapters c ON c.id = d.chapter_id
     JOIN venues v ON v.id = d.venue_id
     WHERE d.id = $1`,
    [dinnerId],
  );
  if (!rows[0]) return null;
  const r = rows[0] as Record<string, unknown>;
  const dinner: Dinner = {
    id: r.id as number,
    chapter_id: r.chapter_id as number,
    venue_id: r.venue_id as number,
    title: r.title as string,
    starts_at: r.starts_at as Date,
    total_seats: r.total_seats as number,
    price_cents: r.price_cents as number,
    host_payout_cents: r.host_payout_cents as number | null,
    menu: r.menu as string | null,
    description: r.description as string | null,
    parking_note: r.parking_note as string | null,
    booking_cutoff_at: r.booking_cutoff_at as Date | null,
    allows_couples: r.allows_couples as boolean,
    status: r.status as Dinner['status'],
    created_at: r.created_at as Date,
    updated_at: r.updated_at as Date,
  };
  const chapter: Chapter = {
    id: r.ch_id as number,
    slug: r.chapter_slug as string,
    short_name: r.ch_short_name as string,
    school_name: r.ch_school_name as string,
    display_name: r.ch_display_name as string,
    tagline: r.ch_tagline as string | null,
    from_display_name: r.ch_from_display_name as string,
    color_primary: r.ch_color_primary as string,
    color_secondary: r.ch_color_secondary as string,
    color_header_bg: r.ch_color_header_bg as string,
    color_header_text: r.ch_color_header_text as string,
    color_accent: r.ch_color_accent as string,
    font_family: r.ch_font_family as string,
    is_active: r.ch_is_active as boolean,
    created_at: r.ch_created_at as Date,
    updated_at: r.ch_updated_at as Date,
  };
  const venue: Venue = {
    id: r.v_id as number,
    name: r.v_name as string,
    venue_type: r.v_venue_type as Venue['venue_type'],
    host_guest_id: r.v_host_guest_id as number | null,
    address: r.v_address as string | null,
    neighborhood: r.v_neighborhood as string | null,
    city: r.v_city as string | null,
    google_maps_link: r.v_google_maps_link as string | null,
    capacity_min: r.v_capacity_min as number,
    capacity_max: r.v_capacity_max as number,
    description: r.v_description as string | null,
    photo_url: r.v_photo_url as string | null,
    is_public: r.v_is_public as boolean,
    is_active: r.v_is_active as boolean,
    created_at: r.v_created_at as Date,
    updated_at: r.v_updated_at as Date,
  };
  return { dinner, chapter, venue };
}

async function sendPostDinnerBody(opts: {
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

  const dinnerCache = new Map<number, DinnerBundle | null>();
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
      const chapterPageUrl = `${base}/alumni/${chapter.slug}`;

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

function parseArgs(): { dryRun: boolean; dinnerId?: number; limit?: number } {
  const args = process.argv.slice(2);
  const opts: { dryRun: boolean; dinnerId?: number; limit?: number } = { dryRun: false };
  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--dry-run') {
      opts.dryRun = true;
    } else if (args[i] === '--dinner-id' && args[i + 1]) {
      opts.dinnerId = parseInt(args[++i], 10);
    } else if (args[i] === '--limit' && args[i + 1]) {
      opts.limit = parseInt(args[++i], 10);
    }
  }
  return opts;
}

export async function main(): Promise<JobSummary> {
  const opts = parseArgs();
  console.log('[send-post-dinner] starting with opts:', opts);
  const summary = await runCronJob('send_post_dinner', sendPostDinnerBody, opts);
  console.log('[send-post-dinner] summary:', summary);
  return summary;
}

if (require.main === module) {
  main()
    .then(() => process.exit(0))
    .catch((err) => {
      console.error('[send-post-dinner] fatal:', err);
      process.exit(1);
    });
}
