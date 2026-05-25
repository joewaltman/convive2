import { NextResponse } from 'next/server';
import { getCurrentGuest, createGuestSession } from '@/lib/auth/guest';
import { getGuestByEmail, createGuest, type GuestInput } from '@/lib/guests';
import { joinWaitlist } from '@/lib/waitlist';
import { getDinnerWithRelations } from '@/lib/dinners';
import { sendEmail, chapterFrom, replyTo } from '@/lib/email';
import WaitlistJoined from '@/emails/waitlist-joined';
import type { Guest } from '@/lib/types';

interface ProfileBody {
  first_name?: unknown;
  last_name?: unknown;
  what_do_you_do?: unknown;
  dietary_restrictions?: unknown;
  dietary_notes?: unknown;
}

function asString(v: unknown): string {
  return typeof v === 'string' ? v.trim() : '';
}
function asNullableString(v: unknown): string | null {
  if (typeof v !== 'string') return null;
  const t = v.trim();
  return t.length === 0 ? null : t;
}
function asStringArray(v: unknown): string[] {
  if (!Array.isArray(v)) return [];
  return v.filter((x): x is string => typeof x === 'string').map((s) => s.trim()).filter(Boolean);
}

export async function POST(req: Request) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'invalid_json' }, { status: 400 });
  }
  const b = body as {
    dinner_id?: unknown;
    email?: unknown;
    profile?: ProfileBody;
  };

  const dinnerId = typeof b.dinner_id === 'number' ? b.dinner_id : parseInt(String(b.dinner_id ?? ''), 10);
  if (!Number.isFinite(dinnerId) || dinnerId <= 0) {
    return NextResponse.json({ error: 'dinner_id_required' }, { status: 400 });
  }
  const profile = (b.profile ?? {}) as ProfileBody;

  let guest: Guest | null = await getCurrentGuest();
  if (!guest) {
    const email = asString(b.email);
    if (!email) return NextResponse.json({ error: 'email_required' }, { status: 400 });
    const existing = await getGuestByEmail(email);
    if (existing) {
      return NextResponse.json({ needsCode: true, email }, { status: 401 });
    }
    const firstName = asString(profile.first_name);
    const lastName = asString(profile.last_name);
    if (!firstName || !lastName) {
      return NextResponse.json({ error: 'profile_required' }, { status: 400 });
    }
    const input: GuestInput = {
      email,
      first_name: firstName,
      last_name: lastName,
      what_do_you_do: asNullableString(profile.what_do_you_do),
      dietary_restrictions: asStringArray(profile.dietary_restrictions),
      dietary_notes: asNullableString(profile.dietary_notes),
    };
    guest = await createGuest(input);
    await createGuestSession(guest.id);
  }

  const relations = await getDinnerWithRelations(dinnerId);
  if (!relations) {
    return NextResponse.json({ error: 'dinner_not_found' }, { status: 404 });
  }
  const { dinner, chapter } = relations;

  const result = await joinWaitlist({
    dinnerId,
    chapterId: dinner.chapter_id,
    guestId: guest.id,
  });

  if (!result.alreadyOnWaitlist) {
    await sendEmail({
      from: chapterFrom({ from_display_name: chapter.from_display_name }),
      to: guest.email,
      replyTo: replyTo(),
      subject: `You're on the waitlist — ${dinner.title}`,
      react: WaitlistJoined({
        chapterDisplayName: chapter.display_name,
        chapterAccent: chapter.color_accent,
        dinnerTitle: dinner.title,
        dinnerStartsAt: dinner.starts_at,
      }),
    });
  }

  return NextResponse.json({ ok: true, already: result.alreadyOnWaitlist });
}
