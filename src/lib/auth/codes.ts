import { query } from '@/lib/db';
import { generateNumericCode } from '@/lib/tokens';

export interface AuthCodeRow {
  id: number;
  email: string;
  code: string;
  purpose: 'guest' | 'admin';
  expires_at: Date;
  used_at: Date | null;
  created_at: Date;
}

export async function markPriorCodesUsed(email: string, purpose: 'guest' | 'admin'): Promise<void> {
  await query(
    `UPDATE auth_codes SET used_at = NOW()
     WHERE LOWER(email) = LOWER($1) AND purpose = $2 AND used_at IS NULL`,
    [email.trim(), purpose],
  );
}

export async function createAuthCode(email: string, purpose: 'guest' | 'admin'): Promise<string> {
  const code = generateNumericCode();
  await query(
    `INSERT INTO auth_codes (email, code, purpose, expires_at)
     VALUES ($1, $2, $3, NOW() + INTERVAL '10 minutes')`,
    [email.trim(), code, purpose],
  );
  return code;
}

export async function verifyAuthCode(
  email: string,
  code: string,
  purpose: 'guest' | 'admin',
): Promise<boolean> {
  const rows = await query<AuthCodeRow>(
    `SELECT id, email, code, purpose, expires_at, used_at, created_at
     FROM auth_codes
     WHERE LOWER(email) = LOWER($1) AND purpose = $2 AND code = $3
       AND used_at IS NULL AND expires_at > NOW()
     ORDER BY created_at DESC LIMIT 1`,
    [email.trim(), purpose, code.trim()],
  );
  if (!rows.length) return false;
  await query(`UPDATE auth_codes SET used_at = NOW() WHERE id = $1`, [rows[0].id]);
  return true;
}
