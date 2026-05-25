import { NextResponse } from 'next/server';
import { createChapterLead } from '@/lib/leads';
import { sendEmail, platformFrom, replyTo, joeNotificationEmail } from '@/lib/email';
import ChapterLeadNotification from '@/emails/chapter-lead-notification';

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
  const chapterName = asString(b.chapter_name);
  if (!contactName || !contactEmail || !chapterName) {
    return NextResponse.json({ error: 'missing_required_fields' }, { status: 400 });
  }

  const contactRole = asNullableString(b.contact_role);
  const approximateSize = asNullableNumber(b.approximate_size);
  const goals = asNullableString(b.goals);

  await createChapterLead({
    contact_name: contactName,
    contact_email: contactEmail,
    contact_role: contactRole,
    chapter_name: chapterName,
    approximate_size: approximateSize,
    goals,
  });

  await sendEmail({
    from: platformFrom(),
    to: joeNotificationEmail(),
    replyTo: replyTo(),
    subject: `[Con-Vive] New chapter lead: ${chapterName}`,
    react: ChapterLeadNotification({
      contactName,
      contactEmail,
      contactRole,
      chapterName,
      approximateSize,
      goals,
    }),
  });

  return NextResponse.json({ ok: true });
}
