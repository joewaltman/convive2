import { NextResponse } from 'next/server';
import { requireSuperAdmin } from '@/lib/auth/admin';
import { getReservationById } from '@/lib/reservations';
import { getDinnerWithRelations } from '@/lib/dinners';
import { getGuestById } from '@/lib/guests';
import {
  generateGoogleCalendarUrl,
  generateOutlookUrl,
  generateIcsDownloadUrl,
} from '@/lib/calendar';
import { sendEmail, chapterFrom, replyTo } from '@/lib/email';
import ReservationConfirmation from '@/emails/reservation-confirmation';

function parseId(s: string): number | null {
  const n = parseInt(s, 10);
  return Number.isFinite(n) && n > 0 ? n : null;
}

function dollars(cents: number | null | undefined): string {
  if (cents == null) return '0.00';
  return (cents / 100).toFixed(2);
}

export async function POST(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  await requireSuperAdmin();
  const { id } = await ctx.params;
  const n = parseId(id);
  if (n === null) return NextResponse.json({ error: 'invalid_id' }, { status: 400 });

  const reservation = await getReservationById(n);
  if (!reservation) return NextResponse.json({ error: 'not_found' }, { status: 404 });
  if (reservation.status !== 'confirmed') {
    return NextResponse.json({ error: 'not_confirmed' }, { status: 400 });
  }
  const bundle = await getDinnerWithRelations(reservation.dinner_id);
  if (!bundle) return NextResponse.json({ error: 'dinner_not_found' }, { status: 404 });
  const guest = await getGuestById(reservation.guest_id);
  if (!guest) return NextResponse.json({ error: 'guest_not_found' }, { status: 404 });

  const { dinner, venue, chapter } = bundle;
  const fullAddress = [venue.address, venue.neighborhood, venue.city].filter(Boolean).join(', ');
  const base = process.env.NEXT_PUBLIC_BASE_URL ?? 'https://con-vive.com';
  const cancelUrl = `${base}/booking/cancel/${reservation.cancel_token}`;
  const calendarPayload = {
    title: `${chapter.display_name} dinner`,
    startsAt: dinner.starts_at,
    address: fullAddress,
    description: dinner.description ?? dinner.title,
  };

  await sendEmail({
    from: chapterFrom(chapter),
    to: guest.email,
    replyTo: replyTo(),
    subject: `Your reservation: ${dinner.title}`,
    react: ReservationConfirmation({
      chapterDisplayName: chapter.display_name,
      chapterAccent: chapter.color_accent,
      dinnerTitle: dinner.title,
      dinnerStartsAt: dinner.starts_at,
      venueName: venue.name,
      fullAddress,
      parkingNote: dinner.parking_note,
      menu: dinner.menu,
      bringsPartner: reservation.brings_partner,
      amountPaidDollars: dollars(reservation.amount_paid_cents),
      googleCalendarUrl: generateGoogleCalendarUrl(calendarPayload),
      outlookUrl: generateOutlookUrl(calendarPayload),
      icsUrl: generateIcsDownloadUrl(reservation.calendar_token),
      cancelUrl,
    }),
  });

  return NextResponse.json({ ok: true });
}
