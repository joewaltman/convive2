import { query } from '@/lib/db';
import { findExpiredPromoted, expirePromotedEntry } from '@/lib/waitlist';
import { getDinnerWithRelations } from '@/lib/dinners';
import { getGuestById } from '@/lib/guests';
import { getReservationById } from '@/lib/reservations';
import { sendEmail, chapterFrom, replyTo } from '@/lib/email';
import WaitlistPromoted from '@/emails/waitlist-promoted';
import WaitlistExpired from '@/emails/waitlist-expired';
import type { JobSummary } from '@/lib/types';

function dollars(cents: number): string {
  return (cents / 100).toFixed(2);
}

export async function processWaitlistBody(opts: {
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
