import { NextResponse } from 'next/server';
import { getCurrentGuest } from '@/lib/auth/guest';
import {
  cancelReservation,
  getReservationByCancelToken,
  getReservationById,
} from '@/lib/reservations';
import { getDinnerWithRelations } from '@/lib/dinners';
import { query } from '@/lib/db';
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

function baseUrl(): string {
  return process.env.NEXT_PUBLIC_BASE_URL ?? 'https://con-vive.com';
}

function dollars(cents: number | null | undefined): string | null {
  if (cents == null) return null;
  return (cents / 100).toFixed(2);
}

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const reservationId = parseInt(id, 10);
  if (!Number.isFinite(reservationId)) {
    return NextResponse.json({ error: 'invalid_id' }, { status: 400 });
  }

  let body: { cancel_token?: unknown } = {};
  try {
    body = (await req.json()) as { cancel_token?: unknown };
  } catch {
    // empty body is acceptable for session-authed cancel
  }
  const cancelToken =
    typeof body.cancel_token === 'string' ? body.cancel_token.trim() : '';

  // Auth: session OR matching cancel_token
  const target = await getReservationById(reservationId);
  if (!target) {
    return NextResponse.json({ error: 'not_found' }, { status: 404 });
  }

  let authorized = false;
  if (cancelToken) {
    const byToken = await getReservationByCancelToken(cancelToken);
    if (byToken && byToken.id === target.id) authorized = true;
  }
  if (!authorized) {
    const guest = await getCurrentGuest();
    if (guest && guest.id === target.guest_id) authorized = true;
  }
  if (!authorized) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const result = await cancelReservation(reservationId);
  if (!result) {
    return NextResponse.json({ error: 'not_found' }, { status: 404 });
  }
  const { cancelled, promoted } = result;

  const relations = await getDinnerWithRelations(cancelled.dinner_id);
  if (!relations) {
    return NextResponse.json({ ok: true, promoted: !!promoted });
  }
  const { dinner, chapter } = relations;

  // Lookup guest name + email
  const guestRows = await query<{ email: string; first_name: string; last_name: string }>(
    `SELECT email, first_name, last_name FROM guests WHERE id = $1`,
    [cancelled.guest_id],
  );
  const guest = guestRows[0];

  if (guest) {
    await sendEmail({
      from: chapterFrom({ from_display_name: chapter.from_display_name }),
      to: guest.email,
      replyTo: replyTo(),
      subject: `Your reservation is cancelled — ${dinner.title}`,
      react: ReservationCancellation({
        chapterDisplayName: chapter.display_name,
        chapterAccent: chapter.color_accent,
        dinnerTitle: dinner.title,
        dinnerStartsAt: dinner.starts_at,
        wasPaid: cancelled.amount_paid_cents != null && cancelled.amount_paid_cents > 0,
      }),
    });
  }

  await sendEmail({
    from: platformFrom(),
    to: joeNotificationEmail(),
    replyTo: replyTo(),
    subject: `[Con-Vive] Reservation cancelled #${cancelled.id}`,
    react: ReservationCancelledNotifyJoe({
      reservationId: cancelled.id,
      guestEmail: guest?.email ?? '(unknown)',
      guestName: guest ? `${guest.first_name} ${guest.last_name}` : '(unknown)',
      chapterDisplayName: chapter.display_name,
      dinnerTitle: dinner.title,
      dinnerStartsAt: dinner.starts_at,
      amountPaidDollars: dollars(cancelled.amount_paid_cents),
      wasPromoted: !!promoted,
    }),
  });

  if (promoted) {
    const promotedGuestRows = await query<{ email: string }>(
      `SELECT email FROM guests WHERE id = $1`,
      [promoted.guestId],
    );
    const promotedEmail = promotedGuestRows[0]?.email;
    if (promotedEmail) {
      const claimUrl = `${baseUrl()}/alumni/${chapter.slug}/claim/${promoted.newReservation.confirm_token}`;
      await sendEmail({
        from: chapterFrom({ from_display_name: chapter.from_display_name }),
        to: promotedEmail,
        replyTo: replyTo(),
        subject: `A seat opened up — claim it in 24 hours`,
        react: WaitlistPromoted({
          chapterDisplayName: chapter.display_name,
          chapterAccent: chapter.color_accent,
          dinnerTitle: dinner.title,
          dinnerStartsAt: dinner.starts_at,
          priceDollars: (dinner.price_cents / 100).toFixed(2),
          claimUrl,
        }),
      });
    }
  }

  return NextResponse.json({ ok: true, promoted: !!promoted });
}
