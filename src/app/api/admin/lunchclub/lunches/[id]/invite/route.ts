import { NextResponse } from 'next/server';
import { getCurrentAdmin } from '@/lib/auth/admin';
import {
  createInvitedBooking,
  getBookingContext,
  getLunch,
  listActiveMembersForTable,
  listBookingsForLunch,
} from '@/lib/lunchclub/data';
import { buildInviteSms } from '@/lib/lunchclub/sms-templates';
import { sendSms } from '@/lib/sms/quo';

export const runtime = 'nodejs';

async function requireSuper() {
  const a = await getCurrentAdmin();
  if (!a || a.chapter_id !== null) return null;
  return a;
}

function baseUrl(): string {
  return process.env.NEXT_PUBLIC_BASE_URL ?? 'https://con-vive.com';
}

export async function POST(
  _req: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  if (!(await requireSuper())) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }
  const { id } = await ctx.params;
  const lunchId = Number(id);
  if (!Number.isInteger(lunchId)) {
    return NextResponse.json({ error: 'invalid_id' }, { status: 400 });
  }
  const lunch = await getLunch(lunchId);
  if (!lunch) return NextResponse.json({ error: 'not_found' }, { status: 404 });

  const [members, existing] = await Promise.all([
    listActiveMembersForTable(lunch.standing_table_id),
    listBookingsForLunch(lunchId),
  ]);
  const existingSignupIds = new Set(existing.map((b) => b.signup_id));

  let bookingsCreated = 0;
  let smsSent = 0;
  let smsErrors = 0;

  for (const m of members) {
    if (existingSignupIds.has(m.signup_id)) continue;
    const seats = (m.seats === 2 ? 2 : 1) as 1 | 2;
    const booking = await createInvitedBooking(lunchId, m.signup_id, m.id, seats);
    bookingsCreated++;
    const fresh = await getBookingContext(booking.id);
    if (!fresh) continue;
    const sms = buildInviteSms(fresh, baseUrl());
    if (!sms.to) continue;
    const sres = await sendSms(sms);
    if (sres.ok) smsSent++;
    else {
      smsErrors++;
      console.error('[lunchclub:invite] sms failed', {
        bookingId: booking.id,
        error: sres.error,
      });
    }
  }

  return NextResponse.json({
    ok: true,
    bookings_created: bookingsCreated,
    sms_sent: smsSent,
    sms_errors: smsErrors,
  });
}
