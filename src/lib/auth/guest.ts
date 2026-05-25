import { cookies } from 'next/headers';
import { query } from '@/lib/db';
import { generateUrlSafeToken, sha256Hex } from '@/lib/tokens';
import { markPriorCodesUsed, createAuthCode, verifyAuthCode } from './codes';
import { sendEmail, chapterFrom, platformFrom, replyTo } from '@/lib/email';
import MagicCodeGuest from '@/emails/magic-code-guest';
import { checkAndRecord, codeRequestKey } from './rate-limit';
import { getGuestByEmail } from '@/lib/guests';
import type { Guest } from '@/lib/types';

const COOKIE = 'cv_session';
const MAX_AGE_SECONDS = 60 * 60 * 24 * 180;
const GUEST_COLS = `id, email, first_name, last_name, what_do_you_do, dietary_restrictions,
  dietary_notes, email_unsubscribed_at, created_at, updated_at`;

export async function requestGuestCode(email: string): Promise<{ sent: boolean; throttled?: boolean }> {
  const trimmed = email.trim();
  if (!trimmed) return { sent: false };
  if (!checkAndRecord(codeRequestKey('guest', trimmed))) {
    return { sent: true, throttled: true };
  }
  await markPriorCodesUsed(trimmed, 'guest');
  const code = await createAuthCode(trimmed, 'guest');
  // Per spec: chapter-tagged emails use chapter From; the magic-code email is platform-level
  // when requested outside a chapter context. Use the platform From by default.
  await sendEmail({
    from: platformFrom(),
    to: trimmed,
    replyTo: replyTo(),
    subject: `Your dinner sign-in code: ${code}`,
    react: MagicCodeGuest({ code }),
  });
  return { sent: true };
}

export async function verifyGuestCode(email: string, code: string): Promise<Guest | null> {
  const ok = await verifyAuthCode(email, code, 'guest');
  if (!ok) return null;
  const guest = await getGuestByEmail(email);
  return guest;
}

export async function createGuestSession(guestId: number): Promise<string> {
  const token = generateUrlSafeToken();
  const hash = sha256Hex(token);
  await query(
    `INSERT INTO guest_sessions (guest_id, token_hash, expires_at)
     VALUES ($1, $2, NOW() + INTERVAL '180 days')`,
    [guestId, hash],
  );
  const c = await cookies();
  c.set(COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: MAX_AGE_SECONDS,
  });
  return token;
}

export async function getCurrentGuest(): Promise<Guest | null> {
  const c = await cookies();
  const token = c.get(COOKIE)?.value;
  if (!token) return null;
  const hash = sha256Hex(token);
  const rows = await query<Guest & { session_id: number }>(
    `SELECT g.id, g.email, g.first_name, g.last_name, g.what_do_you_do, g.dietary_restrictions,
       g.dietary_notes, g.email_unsubscribed_at, g.created_at, g.updated_at, s.id AS session_id
     FROM guest_sessions s
     JOIN guests g ON g.id = s.guest_id
     WHERE s.token_hash = $1 AND s.expires_at > NOW()
     LIMIT 1`,
    [hash],
  );
  const row = rows[0];
  if (!row) return null;
  // Update last_used_at non-blocking
  query(`UPDATE guest_sessions SET last_used_at = NOW() WHERE id = $1`, [row.session_id]).catch(() => {});
  const { session_id: _sid, ...guest } = row as Guest & { session_id: number };
  return guest as Guest;
}

export async function clearGuestSession(): Promise<void> {
  const c = await cookies();
  const token = c.get(COOKIE)?.value;
  if (token) {
    await query(`DELETE FROM guest_sessions WHERE token_hash = $1`, [sha256Hex(token)]);
  }
  c.delete(COOKIE);
}

export async function requireGuest(): Promise<Guest> {
  const g = await getCurrentGuest();
  if (!g) throw new Error('Unauthorized');
  return g;
}

/**
 * Per-chapter From, when we have chapter context (booking flow).
 */
export async function sendGuestCodeForChapter(email: string, chapterFromDisplay: string): Promise<{ sent: boolean }> {
  const trimmed = email.trim();
  if (!checkAndRecord(codeRequestKey('guest', trimmed))) return { sent: true };
  await markPriorCodesUsed(trimmed, 'guest');
  const code = await createAuthCode(trimmed, 'guest');
  await sendEmail({
    from: chapterFrom({ from_display_name: chapterFromDisplay }),
    to: trimmed,
    replyTo: replyTo(),
    subject: `Your dinner sign-in code: ${code}`,
    react: MagicCodeGuest({ code }),
  });
  return { sent: true };
}

export { GUEST_COLS };
