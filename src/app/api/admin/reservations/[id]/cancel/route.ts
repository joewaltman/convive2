import { NextResponse } from 'next/server';
import { requireSuperAdmin } from '@/lib/auth/admin';
import { cancelReservation, getReservationById } from '@/lib/reservations';
import { getDinnerWithRelations } from '@/lib/dinners';
import { getGuestById } from '@/lib/guests';
import {
  sendEmail,
  chapterFrom,
  platformFrom,
  replyTo,
  joeNotificationEmail,
} from '@/lib/email';
import ReservationCancellation from '@/emails/reservation-cancellation';
import ReservationCancelledNotifyJoe from '@/emails/reservation-cancelled-notify-joe';
import WaitlistPromoted from '@/emails/waitlist-promoted';

function parseId(s: string): number | null {
  const n = parseInt(s, 10);
  return Number.isFinite(n) && n > 0 ? n : null;
}

function dollars(cents: number | null): string | null {
  if (cents === null) return null;
  return (cents / 100).toFixed(2);
}

export async function POST(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  await requireSuperAdmin();
  const { id } = await ctx.params;
  const n = parseId(id);
  if (n === null) return NextResponse.json({ error: 'invalid_id' }, { status: 400 });

  const existing = await getReservationById(n);
  if (!existing) return NextResponse.json({ error: 'not_found' }, { status: 404 });

  const result = await cancelReservation(n);
  if (!result) return NextResponse.json({ error: 'not_found' }, { status: 404 });

  const bundle = await getDinnerWithRelations(existing.dinner_id);
  const guest = await getGuestById(existing.guest_id);

  if (bundle && guest) {
    const { dinner, chapter } = bundle;
    const wasPaid =
      (result.cancelled.amount_paid_cents ?? 0) > 0 || result.cancelled.status === 'cancelled';
    try {
      await sendEmail({
        from: chapterFrom(chapter),
        to: guest.email,
        replyTo: replyTo(),
        subject: `Cancellation: ${dinner.title}`,
        react: ReservationCancellation({
          chapterDisplayName: chapter.display_name,
          chapterAccent: chapter.color_accent,
          dinnerTitle: dinner.title,
          dinnerStartsAt: dinner.starts_at,
          wasPaid: (result.cancelled.amount_paid_cents ?? 0) > 0,
        }),
      });
    } catch (err) {
      console.error('[admin cancel] guest email', err);
    }

    try {
      await sendEmail({
        from: platformFrom(),
        to: joeNotificationEmail(),
        replyTo: replyTo(),
        subject: `Cancellation #${result.cancelled.id} — ${chapter.short_name} — ${dinner.title}`,
        react: ReservationCancelledNotifyJoe({
          reservationId: result.cancelled.id,
          guestEmail: guest.email,
          guestName: `${guest.first_name} ${guest.last_name}`.trim(),
          chapterDisplayName: chapter.display_name,
          dinnerTitle: dinner.title,
          dinnerStartsAt: dinner.starts_at,
          amountPaidDollars: dollars(result.cancelled.amount_paid_cents),
          wasPromoted: !!result.promoted,
        }),
      });
    } catch (err) {
      console.error('[admin cancel] joe email', err);
    }

    // Notify promoted waitlist guest
    if (result.promoted) {
      try {
        const promotedGuest = await getGuestById(result.promoted.guestId);
        if (promotedGuest && !promotedGuest.email_unsubscribed_at) {
          const base = process.env.NEXT_PUBLIC_BASE_URL ?? 'https://con-vive.com';
          const claimUrl = `${base}/booking/claim/${result.promoted.newReservation.confirm_token}`;
          await sendEmail({
            from: chapterFrom(chapter),
            to: promotedGuest.email,
            replyTo: replyTo(),
            subject: `A seat opened up: ${dinner.title}`,
            react: WaitlistPromoted({
              chapterDisplayName: chapter.display_name,
              chapterAccent: chapter.color_accent,
              dinnerTitle: dinner.title,
              dinnerStartsAt: dinner.starts_at,
              priceDollars: ((dinner.price_cents) / 100).toFixed(2),
              claimUrl,
            }),
          });
        }
      } catch (err) {
        console.error('[admin cancel] waitlist promoted email', err);
      }
    }
    void wasPaid;
  }

  return NextResponse.json({ ok: true, cancelled: result.cancelled, promoted: result.promoted ?? null });
}
