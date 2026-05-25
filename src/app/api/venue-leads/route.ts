import { NextResponse } from 'next/server';
import { createVenueLead } from '@/lib/leads';
import { sendEmail, platformFrom, replyTo, joeNotificationEmail } from '@/lib/email';
import VenueLeadNotification from '@/emails/venue-lead-notification';

function asString(v: unknown): string {
  return typeof v === 'string' ? v.trim() : '';
}
function asNullableString(v: unknown): string | null {
  if (typeof v !== 'string') return null;
  const t = v.trim();
  return t.length === 0 ? null : t;
}
function asNullableNumber(v: unknown): number | null {
  if (typeof v === 'number' && Number.isFinite(v)) return v;
  if (typeof v === 'string' && v.trim() !== '') {
    const n = parseInt(v.trim(), 10);
    return Number.isFinite(n) ? n : null;
  }
  return null;
}

export async function POST(req: Request) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'invalid_json' }, { status: 400 });
  }
  const b = body as Record<string, unknown>;

  const contactName = asString(b.contact_name);
  const contactEmail = asString(b.contact_email);
  if (!contactName || !contactEmail) {
    return NextResponse.json({ error: 'missing_required_fields' }, { status: 400 });
  }

  const venueName = asNullableString(b.venue_name);
  const venueType = asNullableString(b.venue_type);
  const neighborhood = asNullableString(b.neighborhood);
  const capacity = asNullableNumber(b.capacity);
  const notes = asNullableString(b.notes);

  await createVenueLead({
    contact_name: contactName,
    contact_email: contactEmail,
    venue_name: venueName,
    venue_type: venueType,
    neighborhood,
    capacity,
    notes,
  });

  await sendEmail({
    from: platformFrom(),
    to: joeNotificationEmail(),
    replyTo: replyTo(),
    subject: `[Con-Vive] New venue lead: ${venueName ?? '(unnamed)'}`,
    react: VenueLeadNotification({
      contactName,
      contactEmail,
      venueName,
      venueType,
      neighborhood,
      capacity,
      notes,
    }),
  });

  return NextResponse.json({ ok: true });
}
