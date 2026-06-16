import { query, withClient } from '@/lib/db';
import type {
  ProspectPrefill,
  ProspectRow,
  SignupInput,
  SignupRow,
  SignupStatus,
} from './types';

interface ProspectPrefillRow {
  token: string;
  first_name: string | null;
  last_name: string | null;
  email: string | null;
  phone_clean: string | null;
  zip_code: string | null;
  age_range: string | null;
  dietary_restrictions: string[] | null;
  dietary_notes: string | null;
  what_do_you_do: string | null;
  curious_about: string | null;
  surprising_knowledge: string | null;
}

export async function getProspectByToken(token: string): Promise<ProspectPrefill | null> {
  if (typeof token !== 'string') return null;
  const t = token.trim();
  if (t.length === 0) return null;

  const rows = await query<ProspectPrefillRow>(
    `SELECT token, first_name, last_name, email, phone_clean, zip_code, age_range,
            dietary_restrictions, dietary_notes, what_do_you_do, curious_about,
            surprising_knowledge
       FROM lunchclub.prospects
      WHERE token = $1`,
    [t],
  );
  if (rows.length === 0) return null;
  const r = rows[0];
  return {
    token: r.token,
    first_name: r.first_name,
    last_name: r.last_name,
    email: r.email,
    phone: r.phone_clean,
    zip_code: r.zip_code,
    age_range: r.age_range,
    dietary_restrictions: r.dietary_restrictions ?? [],
    dietary_notes: r.dietary_notes,
    q_career: r.what_do_you_do,
    q_curious: r.curious_about,
    q_surprising: r.surprising_knowledge,
  };
}

export async function getDistinctAgeRanges(): Promise<string[]> {
  const rows = await query<{ age_range: string }>(
    `SELECT DISTINCT age_range
       FROM lunchclub.prospects
      WHERE age_range IS NOT NULL AND btrim(age_range) <> ''
      ORDER BY age_range`,
  );
  return rows.map((r) => r.age_range);
}

export async function getDistinctDietaryRestrictions(): Promise<string[]> {
  const rows = await query<{ value: string }>(
    `SELECT DISTINCT unnest(dietary_restrictions) AS value
       FROM lunchclub.prospects
      WHERE dietary_restrictions IS NOT NULL
      ORDER BY value`,
  );
  return rows.map((r) => r.value).filter((s) => s && s.trim().length > 0);
}

export async function createSignup(
  input: SignupInput,
): Promise<{ id: number; markedProspectSignedUp: boolean }> {
  return withClient(async (client) => {
    try {
      await client.query('BEGIN');

      const insertSql = `
        INSERT INTO lunchclub.signups (
          prospect_token,
          who_for, buyer_name, buyer_email, buyer_phone, buyer_relationship,
          first_name, last_name, email, phone, zip_code,
          weekday_availability, age_range, life_stage, solo_or_with, companion_name,
          comfort_notes, dietary_restrictions, dietary_notes,
          q_career, q_chapter, q_curious, q_surprising, q_best_gathering, q_hopes,
          q_anything_else,
          source, arm, status
        ) VALUES (
          $1,
          $2, $3, $4, $5, $6,
          $7, $8, $9, $10, $11,
          $12, $13, $14, $15, $16,
          $17, $18, $19,
          $20, $21, $22, $23, $24, $25,
          $26,
          $27, $28, 'new'
        )
        RETURNING id
      `;
      const params: unknown[] = [
        input.prospect_token,
        input.who_for,
        input.buyer_name,
        input.buyer_email,
        input.buyer_phone,
        input.buyer_relationship,
        input.first_name,
        input.last_name,
        input.email,
        input.phone,
        input.zip_code,
        input.weekday_availability,
        input.age_range,
        input.life_stage,
        input.solo_or_with,
        input.companion_name,
        input.comfort_notes,
        input.dietary_restrictions,
        input.dietary_notes,
        input.q_career,
        input.q_chapter,
        input.q_curious,
        input.q_surprising,
        input.q_best_gathering,
        input.q_hopes,
        input.q_anything_else,
        input.source,
        input.arm,
      ];
      const res = await client.query<{ id: number }>(insertSql, params);
      const id = res.rows[0].id;

      let markedProspectSignedUp = false;
      if (input.prospect_token) {
        const upd = await client.query(
          `UPDATE lunchclub.prospects SET signed_up = true WHERE token = $1`,
          [input.prospect_token],
        );
        markedProspectSignedUp = (upd.rowCount ?? 0) > 0;
      }

      await client.query('COMMIT');
      return { id, markedProspectSignedUp };
    } catch (err) {
      try {
        await client.query('ROLLBACK');
      } catch {
        /* ignore */
      }
      throw err;
    }
  });
}

const SIGNUP_COLUMNS = `
  id, prospect_token, who_for, buyer_name, buyer_email, buyer_phone, buyer_relationship,
  first_name, last_name, email, phone, zip_code,
  COALESCE(weekday_availability, ARRAY[]::text[]) AS weekday_availability,
  age_range, life_stage, solo_or_with, companion_name, comfort_notes,
  COALESCE(dietary_restrictions, ARRAY[]::text[]) AS dietary_restrictions,
  dietary_notes,
  q_career, q_chapter, q_curious, q_surprising, q_best_gathering, q_hopes, q_anything_else,
  source, arm, status, admin_note, created_at
`;

export interface SignupListFilters {
  source?: 'organic' | 'reactivation';
  status?: SignupStatus;
  arm?: 'A' | 'C' | 'none';
}

export async function listSignups(filters: SignupListFilters): Promise<SignupRow[]> {
  const params: unknown[] = [];
  const conds: string[] = [];
  if (filters.source) {
    params.push(filters.source);
    conds.push(`source = $${params.length}`);
  }
  if (filters.status) {
    params.push(filters.status);
    conds.push(`status = $${params.length}`);
  }
  if (filters.arm === 'none') {
    conds.push(`arm IS NULL`);
  } else if (filters.arm === 'A' || filters.arm === 'C') {
    params.push(filters.arm);
    conds.push(`arm = $${params.length}`);
  }
  const where = conds.length > 0 ? `WHERE ${conds.join(' AND ')}` : '';
  return query<SignupRow>(
    `SELECT ${SIGNUP_COLUMNS}
       FROM lunchclub.signups
       ${where}
       ORDER BY created_at DESC`,
    params,
  );
}

export interface ProspectListFilters {
  notContacted?: boolean;
  notSignedUp?: boolean;
}

export async function listProspects(filters: ProspectListFilters): Promise<ProspectRow[]> {
  const conds: string[] = [];
  if (filters.notContacted) conds.push(`contacted_at IS NULL`);
  if (filters.notSignedUp) conds.push(`signed_up = false`);
  const where = conds.length > 0 ? `WHERE ${conds.join(' AND ')}` : '';
  return query<ProspectRow>(
    `SELECT id, token, first_name, last_name, email, phone_clean, signed_up,
            contacted_at, created_at
       FROM lunchclub.prospects
       ${where}
       ORDER BY created_at DESC`,
  );
}

export async function updateSignupAdmin(
  id: number,
  patch: { status?: SignupStatus; arm?: 'A' | 'C' | null; admin_note?: string | null },
): Promise<SignupRow | null> {
  const sets: string[] = [];
  const params: unknown[] = [];
  if (patch.status !== undefined) {
    params.push(patch.status);
    sets.push(`status = $${params.length}`);
  }
  if (patch.arm !== undefined) {
    params.push(patch.arm);
    sets.push(`arm = $${params.length}`);
  }
  if (patch.admin_note !== undefined) {
    params.push(patch.admin_note);
    sets.push(`admin_note = $${params.length}`);
  }
  if (sets.length === 0) return null;
  params.push(id);
  const rows = await query<SignupRow>(
    `UPDATE lunchclub.signups
        SET ${sets.join(', ')}
      WHERE id = $${params.length}
      RETURNING ${SIGNUP_COLUMNS}`,
    params,
  );
  return rows[0] ?? null;
}

export async function setProspectContactedAt(id: number): Promise<boolean> {
  return withClient(async (client) => {
    const res = await client.query(
      `UPDATE lunchclub.prospects SET contacted_at = now() WHERE id = $1`,
      [id],
    );
    return (res.rowCount ?? 0) > 0;
  });
}

export async function setProspectsContactedAt(ids: number[]): Promise<number> {
  if (ids.length === 0) return 0;
  return withClient(async (client) => {
    const res = await client.query(
      `UPDATE lunchclub.prospects SET contacted_at = now() WHERE id = ANY($1::bigint[])`,
      [ids],
    );
    return res.rowCount ?? 0;
  });
}
