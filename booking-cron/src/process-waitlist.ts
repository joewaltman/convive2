import { query, withClient } from './lib/db';
import { runCronJob } from './lib/runCron';
import { sendEmail, chapterFrom, replyTo } from './lib/email';
import WaitlistPromoted from './emails/waitlist-promoted';
import WaitlistExpired from './emails/waitlist-expired';
import type { JobSummary, Chapter, Dinner, Venue, Guest, Reservation } from './lib/types';

interface DinnerBundle {
  dinner: Dinner;
  chapter: Chapter;
  venue: Venue;
}

interface ExpiredPromotedEntry {
  entry_id: number;
  dinner_id: number;
  reservation_id: number;
}

function dollars(cents: number): string {
  return (cents / 100).toFixed(2);
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

async function getGuestById(guestId: number): Promise<Guest | null> {
  const rows = await query<Guest>(
    `SELECT * FROM guests WHERE id = $1`,
    [guestId],
  );
  return rows[0] ?? null;
}

async function getReservationById(reservationId: number): Promise<Reservation | null> {
  const rows = await query<Reservation>(
    `SELECT * FROM reservations WHERE id = $1`,
    [reservationId],
  );
  return rows[0] ?? null;
}

async function findExpiredPromoted(): Promise<ExpiredPromotedEntry[]> {
  return query<ExpiredPromotedEntry>(
    `SELECT w.id AS entry_id, w.dinner_id, r.id AS reservation_id
     FROM waitlist_entries w
     JOIN reservations r ON r.waitlist_entry_id = w.id
     WHERE w.status = 'promoted'
       AND w.notified_at < NOW() - INTERVAL '24 hours'
       AND r.status = 'pending'`,
  );
}

interface NextPromotion {
  guestId: number;
  newReservationId: number;
  entryId: number;
}

function generateToken(): string {
  return Math.random().toString(36).slice(2) + Math.random().toString(36).slice(2);
}

async function expirePromotedEntry(entryId: number): Promise<{ nextPromotion: NextPromotion | null } | null> {
  return withClient(async (client) => {
    await client.query('BEGIN');

    // Mark waitlist entry expired
    const updated = await client.query(
      `UPDATE waitlist_entries SET status = 'expired', updated_at = NOW()
       WHERE id = $1 AND status = 'promoted'
       RETURNING dinner_id, guest_id`,
      [entryId],
    );
    if (updated.rowCount === 0) {
      await client.query('ROLLBACK');
      return null;
    }
    const { dinner_id, guest_id: expiredGuestId } = updated.rows[0];

    // Cancel the linked pending reservation
    await client.query(
      `UPDATE reservations SET status = 'cancelled', cancelled_at = NOW(), updated_at = NOW()
       WHERE waitlist_entry_id = $1 AND status = 'pending'`,
      [entryId],
    );

    // Find the next pending waitlist entry for this dinner
    const nextEntry = await client.query(
      `SELECT id, guest_id FROM waitlist_entries
       WHERE dinner_id = $1 AND status = 'pending'
       ORDER BY created_at ASC
       LIMIT 1`,
      [dinner_id],
    );

    let nextPromotion: NextPromotion | null = null;

    if (nextEntry.rows.length > 0) {
      const { id: nextEntryId, guest_id: nextGuestId } = nextEntry.rows[0];

      // Get dinner details for seat_count default
      const dinnerRow = await client.query(
        `SELECT chapter_id FROM dinners WHERE id = $1`,
        [dinner_id],
      );
      const chapterId = dinnerRow.rows[0]?.chapter_id;

      // Mark next entry as promoted
      await client.query(
        `UPDATE waitlist_entries SET status = 'promoted', promoted_at = NOW(), notified_at = NOW(), updated_at = NOW()
         WHERE id = $1`,
        [nextEntryId],
      );

      // Create pending reservation for the promoted entry
      const confirmToken = generateToken();
      const cancelToken = generateToken();
      const calendarToken = generateToken();

      // Get guest profile for grad_year and major
      const guestProfile = await client.query(
        `SELECT g.id FROM guests g WHERE g.id = $1`,
        [nextGuestId],
      );
      // Default values if guest profile not found
      const gradYear = new Date().getFullYear();

      const newRes = await client.query(
        `INSERT INTO reservations (
           guest_id, dinner_id, chapter_id, grad_year, major, brings_partner,
           seat_count, status, confirm_token, cancel_token, calendar_token,
           pending_expires_at, waitlist_entry_id
         ) VALUES ($1, $2, $3, $4, NULL, FALSE, 1, 'pending', $5, $6, $7, NOW() + INTERVAL '24 hours', $8)
         RETURNING id`,
        [nextGuestId, dinner_id, chapterId, gradYear, confirmToken, cancelToken, calendarToken, nextEntryId],
      );

      nextPromotion = {
        guestId: nextGuestId,
        newReservationId: newRes.rows[0].id,
        entryId: nextEntryId,
      };
    }

    await client.query('COMMIT');
    return { nextPromotion };
  });
}

async function processWaitlistBody(opts: {
  dryRun: boolean;
  dinnerId?: number;
  limit?: number;
}): Promise<JobSummary> {
  const all = await findExpiredPromoted();
  let candidates = opts.dinnerId ? all.filter((e) => e.dinner_id === opts.dinnerId) : all;
  if (opts.limit && Number.isFinite(opts.limit) && opts.limit > 0) {
    candidates = candidates.slice(0, opts.limit);
  }

  let expired = 0;
  let promoted = 0;
  let errors = 0;

  const base = process.env.NEXT_PUBLIC_BASE_URL ?? 'https://con-vive.com';

  for (const cand of candidates) {
    try {
      if (opts.dryRun) {
        expired++;
        continue;
      }

      // Look up original waitlist guest BEFORE we expire (for the "expired" email).
      const origRow = (
        await query<{ guest_id: number }>(
          `SELECT guest_id FROM waitlist_entries WHERE id = $1`,
          [cand.entry_id],
        )
      )[0];
      const origGuestId = origRow?.guest_id ?? null;

      const result = await expirePromotedEntry(cand.entry_id);
      if (!result) continue;

      expired++;

      const bundle = await getDinnerWithRelations(cand.dinner_id);
      if (!bundle) continue;
      const { dinner, chapter } = bundle;

      // Notify original waitlist guest that their hold expired
      if (origGuestId) {
        const origGuest = await getGuestById(origGuestId);
        if (origGuest && !origGuest.email_unsubscribed_at) {
          try {
            await sendEmail({
              from: chapterFrom(chapter),
              to: origGuest.email,
              replyTo: replyTo(),
              subject: `Your waitlist spot expired: ${dinner.title}`,
              react: WaitlistExpired({
                chapterDisplayName: chapter.display_name,
                chapterAccent: chapter.color_accent,
                dinnerTitle: dinner.title,
              }),
            });
          } catch (err) {
            console.error('[process-waitlist] expired-email', err);
            errors++;
          }
        }
      }

      if (result.nextPromotion) {
        const next = result.nextPromotion;
        const newRes = await getReservationById(next.newReservationId);
        const newGuest = await getGuestById(next.guestId);
        if (newRes && newGuest && !newGuest.email_unsubscribed_at) {
          const claimUrl = `${base}/booking/claim/${newRes.confirm_token}`;
          try {
            await sendEmail({
              from: chapterFrom(chapter),
              to: newGuest.email,
              replyTo: replyTo(),
              subject: `A seat opened up: ${dinner.title}`,
              react: WaitlistPromoted({
                chapterDisplayName: chapter.display_name,
                chapterAccent: chapter.color_accent,
                dinnerTitle: dinner.title,
                dinnerStartsAt: dinner.starts_at,
                priceDollars: dollars(dinner.price_cents),
                claimUrl,
              }),
            });
            promoted++;
          } catch (err) {
            console.error('[process-waitlist] promoted-email', err);
            errors++;
          }
        }
      }
    } catch (err) {
      console.error('[process-waitlist]', err);
      errors++;
    }
  }

  return { expired, promoted, errors };
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
  console.log('[process-waitlist] starting with opts:', opts);
  const summary = await runCronJob('process_waitlist', processWaitlistBody, opts);
  console.log('[process-waitlist] summary:', summary);
  return summary;
}

if (require.main === module) {
  main()
    .then(() => process.exit(0))
    .catch((err) => {
      console.error('[process-waitlist] fatal:', err);
      process.exit(1);
    });
}
