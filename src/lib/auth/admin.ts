import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { query } from '@/lib/db';
import { generateUrlSafeToken, sha256Hex } from '@/lib/tokens';
import { markPriorCodesUsed, createAuthCode, verifyAuthCode } from './codes';
import { sendEmail, platformFrom, replyTo } from '@/lib/email';
import MagicCodeAdmin from '@/emails/magic-code-admin';
import { checkAndRecord, codeRequestKey } from './rate-limit';
import type { AdminUser } from '@/lib/types';

const COOKIE = 'cv_admin_session';
const MAX_AGE_SECONDS = 60 * 60 * 24 * 14; // 14 days for admin sessions

function adminAllowlist(): Set<string> {
  const raw = process.env.ADMIN_EMAILS ?? '';
  return new Set(
    raw
      .split(',')
      .map((s) => s.trim().toLowerCase())
      .filter(Boolean),
  );
}

async function isAllowedAdmin(email: string): Promise<boolean> {
  const e = email.toLowerCase().trim();
  if (adminAllowlist().has(e)) return true;
  const rows = await query<{ id: number }>(
    `SELECT id FROM admin_users WHERE LOWER(email) = $1 AND is_active = true`,
    [e],
  );
  return rows.length > 0;
}

async function ensureAdminUser(email: string): Promise<void> {
  const e = email.toLowerCase().trim();
  if (!adminAllowlist().has(e)) return;
  await query(
    `INSERT INTO admin_users (email, chapter_id, is_active)
     VALUES ($1, NULL, true)
     ON CONFLICT (email) DO NOTHING`,
    [e],
  );
}

/**
 * Always returns { sent: true } to prevent email enumeration.
 * Only actually sends if email is allowed.
 */
export async function requestAdminCode(email: string): Promise<{ sent: true }> {
  const trimmed = email.trim();
  if (!trimmed) return { sent: true };
  if (!checkAndRecord(codeRequestKey('admin', trimmed))) return { sent: true };
  if (!(await isAllowedAdmin(trimmed))) return { sent: true };
  await ensureAdminUser(trimmed);
  await markPriorCodesUsed(trimmed, 'admin');
  const code = await createAuthCode(trimmed, 'admin');
  await sendEmail({
    from: platformFrom(),
    to: trimmed,
    replyTo: replyTo(),
    subject: `Your Con-Vive admin sign-in code: ${code}`,
    react: MagicCodeAdmin({ code }),
  });
  return { sent: true };
}

export async function verifyAdminCode(email: string, code: string): Promise<AdminUser | null> {
  const ok = await verifyAuthCode(email, code, 'admin');
  if (!ok) return null;
  const rows = await query<AdminUser>(
    `SELECT id, email, display_name, chapter_id, is_active, created_at, last_login_at
     FROM admin_users WHERE LOWER(email) = LOWER($1) AND is_active = true`,
    [email.trim()],
  );
  const admin = rows[0];
  if (!admin) return null;
  await query(`UPDATE admin_users SET last_login_at = NOW() WHERE id = $1`, [admin.id]);
  return admin;
}

export async function createAdminSession(adminUserId: number): Promise<string> {
  const token = generateUrlSafeToken();
  const hash = sha256Hex(token);
  await query(
    `INSERT INTO admin_sessions (admin_user_id, token_hash, expires_at)
     VALUES ($1, $2, NOW() + INTERVAL '14 days')`,
    [adminUserId, hash],
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

export async function getCurrentAdmin(): Promise<AdminUser | null> {
  const c = await cookies();
  const token = c.get(COOKIE)?.value;
  if (!token) return null;
  const hash = sha256Hex(token);
  const rows = await query<AdminUser & { session_id: number }>(
    `SELECT a.id, a.email, a.display_name, a.chapter_id, a.is_active, a.created_at, a.last_login_at,
       s.id AS session_id
     FROM admin_sessions s
     JOIN admin_users a ON a.id = s.admin_user_id
     WHERE s.token_hash = $1 AND s.expires_at > NOW() AND a.is_active = true`,
    [hash],
  );
  const row = rows[0];
  if (!row) return null;
  query(`UPDATE admin_sessions SET last_used_at = NOW() WHERE id = $1`, [row.session_id]).catch(() => {});
  const { session_id: _sid, ...admin } = row as AdminUser & { session_id: number };
  return admin as AdminUser;
}

export async function clearAdminSession(): Promise<void> {
  const c = await cookies();
  const token = c.get(COOKIE)?.value;
  if (token) {
    await query(`DELETE FROM admin_sessions WHERE token_hash = $1`, [sha256Hex(token)]);
  }
  c.delete(COOKIE);
}

export async function requireAdmin(): Promise<AdminUser> {
  const a = await getCurrentAdmin();
  if (!a) redirect('/admin/login');
  return a;
}

export async function requireSuperAdmin(): Promise<AdminUser> {
  const a = await requireAdmin();
  if (a.chapter_id !== null) {
    throw new Error('Super admin required');
  }
  return a;
}
