import { NextResponse } from 'next/server';
import { requestGuestCode, sendGuestCodeForChapter } from '@/lib/auth/guest';
import { getChapterBySlug } from '@/lib/chapters';

export async function POST(req: Request) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'invalid_json' }, { status: 400 });
  }
  const b = body as { email?: unknown; chapterSlug?: unknown };
  const email = typeof b.email === 'string' ? b.email.trim() : '';
  const chapterSlug = typeof b.chapterSlug === 'string' ? b.chapterSlug.trim() : '';
  if (!email) return NextResponse.json({ error: 'email_required' }, { status: 400 });
  if (chapterSlug) {
    const chapter = await getChapterBySlug(chapterSlug);
    if (chapter) {
      await sendGuestCodeForChapter(email, chapter.from_display_name);
      return NextResponse.json({ sent: true });
    }
  }
  await requestGuestCode(email);
  return NextResponse.json({ sent: true });
}
