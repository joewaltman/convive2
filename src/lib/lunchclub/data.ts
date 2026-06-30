import { query, withClient } from '@/lib/db';
import { generateUrlSafeToken } from '@/lib/tokens';
import type {
  BookingRow,
  BookingStatus,
  BookingWithContext,
  BookingWithSignup,
  LunchRow,
  LunchStatus,
  ProspectPrefill,
  ProspectRow,
  SignupInput,
  SignupRow,
  SignupStatus,
  StandingTableRow,
  TableStatus,
  TableMemberRow,
  TableMemberWithSignup,
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

// ---------------------------------------------------------------------------
// Standing tables
// ---------------------------------------------------------------------------

const STANDING_TABLE_COLUMNS = `id, name, day_of_week, area, default_venue,
  default_address, status, created_at`;

export interface CreateStandingTableInput {
  name: string;
  day_of_week: number;
  area: string | null;
  default_venue: string | null;
  default_address: string | null;
}

export async function createStandingTable(
  input: CreateStandingTableInput,
): Promise<StandingTableRow> {
  const rows = await query<StandingTableRow>(
    `INSERT INTO lunchclub.standing_tables
       (name, day_of_week, area, default_venue, default_address)
     VALUES ($1, $2, $3, $4, $5)
     RETURNING ${STANDING_TABLE_COLUMNS}`,
    [
      input.name,
      input.day_of_week,
      input.area,
      input.default_venue,
      input.default_address,
    ],
  );
  return rows[0];
}

export async function listStandingTables(
  filters: { status?: TableStatus } = {},
): Promise<StandingTableRow[]> {
  const params: unknown[] = [];
  const conds: string[] = [];
  if (filters.status) {
    params.push(filters.status);
    conds.push(`status = $${params.length}`);
  }
  const where = conds.length ? `WHERE ${conds.join(' AND ')}` : '';
  return query<StandingTableRow>(
    `SELECT ${STANDING_TABLE_COLUMNS}
       FROM lunchclub.standing_tables
       ${where}
       ORDER BY day_of_week ASC, name ASC`,
    params,
  );
}

export async function getStandingTable(id: number): Promise<StandingTableRow | null> {
  const rows = await query<StandingTableRow>(
    `SELECT ${STANDING_TABLE_COLUMNS} FROM lunchclub.standing_tables WHERE id = $1`,
    [id],
  );
  return rows[0] ?? null;
}

export interface UpdateStandingTableInput {
  name?: string;
  day_of_week?: number;
  area?: string | null;
  default_venue?: string | null;
  default_address?: string | null;
  status?: TableStatus;
}

export async function updateStandingTable(
  id: number,
  patch: UpdateStandingTableInput,
): Promise<StandingTableRow | null> {
  const sets: string[] = [];
  const params: unknown[] = [];
  for (const k of [
    'name',
    'day_of_week',
    'area',
    'default_venue',
    'default_address',
    'status',
  ] as const) {
    if (patch[k] !== undefined) {
      params.push(patch[k]);
      sets.push(`${k} = $${params.length}`);
    }
  }
  if (sets.length === 0) return getStandingTable(id);
  params.push(id);
  const rows = await query<StandingTableRow>(
    `UPDATE lunchclub.standing_tables
        SET ${sets.join(', ')}
      WHERE id = $${params.length}
      RETURNING ${STANDING_TABLE_COLUMNS}`,
    params,
  );
  return rows[0] ?? null;
}

// ---------------------------------------------------------------------------
// Table members
// ---------------------------------------------------------------------------

const TABLE_MEMBER_COLUMNS = `id, standing_table_id, signup_id, seats, status,
  consecutive_unpaid, joined_at`;

interface TableMemberJoinedRow extends TableMemberRow {
  s_id: number;
  s_first: string | null;
  s_last: string | null;
  s_phone: string | null;
  s_email: string | null;
}

function joinedMemberRow(r: TableMemberJoinedRow): TableMemberWithSignup {
  return {
    id: r.id,
    standing_table_id: r.standing_table_id,
    signup_id: r.signup_id,
    seats: r.seats,
    status: r.status,
    consecutive_unpaid: r.consecutive_unpaid,
    joined_at: r.joined_at,
    signup: {
      id: r.s_id,
      first_name: r.s_first,
      last_name: r.s_last,
      phone: r.s_phone,
      email: r.s_email,
    },
  };
}

export async function listTableMembers(
  standingTableId: number,
): Promise<TableMemberWithSignup[]> {
  const rows = await query<TableMemberJoinedRow>(
    `SELECT m.id, m.standing_table_id, m.signup_id, m.seats, m.status,
            m.consecutive_unpaid, m.joined_at,
            s.id AS s_id, s.first_name AS s_first, s.last_name AS s_last,
            s.phone AS s_phone, s.email AS s_email
       FROM lunchclub.table_members m
       JOIN lunchclub.signups s ON s.id = m.signup_id
      WHERE m.standing_table_id = $1
      ORDER BY m.status ASC, m.joined_at ASC`,
    [standingTableId],
  );
  return rows.map(joinedMemberRow);
}

export async function listActiveMembersForTable(
  standingTableId: number,
): Promise<TableMemberWithSignup[]> {
  const rows = await query<TableMemberJoinedRow>(
    `SELECT m.id, m.standing_table_id, m.signup_id, m.seats, m.status,
            m.consecutive_unpaid, m.joined_at,
            s.id AS s_id, s.first_name AS s_first, s.last_name AS s_last,
            s.phone AS s_phone, s.email AS s_email
       FROM lunchclub.table_members m
       JOIN lunchclub.signups s ON s.id = m.signup_id
      WHERE m.standing_table_id = $1 AND m.status = 'active'
      ORDER BY m.joined_at ASC`,
    [standingTableId],
  );
  return rows.map(joinedMemberRow);
}

export async function seatMemberAtTable(
  standingTableId: number,
  signupId: number,
  seats: 1 | 2,
): Promise<TableMemberRow> {
  return withClient(async (client) => {
    try {
      await client.query('BEGIN');
      const res = await client.query<TableMemberRow>(
        `INSERT INTO lunchclub.table_members (standing_table_id, signup_id, seats)
         VALUES ($1, $2, $3)
         ON CONFLICT (standing_table_id, signup_id) DO UPDATE
            SET seats = EXCLUDED.seats,
                status = 'active'
         RETURNING ${TABLE_MEMBER_COLUMNS}`,
        [standingTableId, signupId, seats],
      );
      await client.query(
        `UPDATE lunchclub.signups SET status = 'seated' WHERE id = $1`,
        [signupId],
      );
      await client.query('COMMIT');
      return res.rows[0];
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

export async function releaseMember(id: number): Promise<TableMemberRow | null> {
  const rows = await query<TableMemberRow>(
    `UPDATE lunchclub.table_members
        SET status = 'released'
      WHERE id = $1
      RETURNING ${TABLE_MEMBER_COLUMNS}`,
    [id],
  );
  return rows[0] ?? null;
}

export async function incrementConsecutiveUnpaid(memberId: number): Promise<number> {
  const rows = await query<{ consecutive_unpaid: number }>(
    `UPDATE lunchclub.table_members
        SET consecutive_unpaid = consecutive_unpaid + 1
      WHERE id = $1
      RETURNING consecutive_unpaid`,
    [memberId],
  );
  return rows[0]?.consecutive_unpaid ?? 0;
}

export async function resetConsecutiveUnpaid(memberId: number | null): Promise<void> {
  if (!memberId) return;
  await query(
    `UPDATE lunchclub.table_members SET consecutive_unpaid = 0 WHERE id = $1`,
    [memberId],
  );
}

export async function listMembersNeedingCheckin(): Promise<TableMemberRow[]> {
  return query<TableMemberRow>(
    `SELECT ${TABLE_MEMBER_COLUMNS}
       FROM lunchclub.table_members
      WHERE status = 'active' AND consecutive_unpaid >= 2
      ORDER BY consecutive_unpaid DESC, joined_at ASC`,
  );
}

// ---------------------------------------------------------------------------
// Lunches
// ---------------------------------------------------------------------------

const LUNCH_COLUMNS = `id, standing_table_id, venue, address,
  to_char(lunch_date, 'YYYY-MM-DD') AS lunch_date,
  to_char(start_time, 'HH24:MI:SS') AS start_time,
  starts_at, price_cents, total_seats, booking_cutoff_at, menu, status,
  non_pay_processed_at, created_at`;

export interface CreateLunchInput {
  standing_table_id: number;
  venue: string;
  address: string;
  lunch_date: string; // 'YYYY-MM-DD'
  start_time: string; // 'HH:MM' or 'HH:MM:SS'
  price_cents: number;
  total_seats?: number;
  menu?: string | null;
  booking_cutoff_at?: Date;
}

export async function createLunch(input: CreateLunchInput): Promise<LunchRow> {
  const totalSeats = input.total_seats ?? 6;
  if (input.booking_cutoff_at) {
    const rows = await query<LunchRow>(
      `INSERT INTO lunchclub.lunches
         (standing_table_id, venue, address, lunch_date, start_time,
          price_cents, total_seats, booking_cutoff_at, menu)
       VALUES ($1, $2, $3, $4::date, $5::time, $6, $7, $8, $9)
       RETURNING ${LUNCH_COLUMNS}`,
      [
        input.standing_table_id,
        input.venue,
        input.address,
        input.lunch_date,
        input.start_time,
        input.price_cents,
        totalSeats,
        input.booking_cutoff_at,
        input.menu ?? null,
      ],
    );
    return rows[0];
  }
  const rows = await query<LunchRow>(
    `INSERT INTO lunchclub.lunches
       (standing_table_id, venue, address, lunch_date, start_time,
        price_cents, total_seats, booking_cutoff_at, menu)
     VALUES ($1, $2, $3, $4::date, $5::time, $6, $7,
       (($4::date::timestamp + $5::time) AT TIME ZONE 'America/Los_Angeles') - INTERVAL '48 hours',
       $8)
     RETURNING ${LUNCH_COLUMNS}`,
    [
      input.standing_table_id,
      input.venue,
      input.address,
      input.lunch_date,
      input.start_time,
      input.price_cents,
      totalSeats,
      input.menu ?? null,
    ],
  );
  return rows[0];
}

export interface ListLunchFilters {
  tableId?: number;
  status?: LunchStatus;
  from?: string;
  to?: string;
}

export async function listLunches(filters: ListLunchFilters = {}): Promise<LunchRow[]> {
  const params: unknown[] = [];
  const conds: string[] = [];
  if (filters.tableId) {
    params.push(filters.tableId);
    conds.push(`standing_table_id = $${params.length}`);
  }
  if (filters.status) {
    params.push(filters.status);
    conds.push(`status = $${params.length}`);
  }
  if (filters.from) {
    params.push(filters.from);
    conds.push(`lunch_date >= $${params.length}::date`);
  }
  if (filters.to) {
    params.push(filters.to);
    conds.push(`lunch_date < $${params.length}::date`);
  }
  const where = conds.length ? `WHERE ${conds.join(' AND ')}` : '';
  return query<LunchRow>(
    `SELECT ${LUNCH_COLUMNS}
       FROM lunchclub.lunches
       ${where}
       ORDER BY lunch_date DESC, start_time DESC`,
    params,
  );
}

export async function getLunch(id: number): Promise<LunchRow | null> {
  const rows = await query<LunchRow>(
    `SELECT ${LUNCH_COLUMNS} FROM lunchclub.lunches WHERE id = $1`,
    [id],
  );
  return rows[0] ?? null;
}

export interface UpdateLunchInput {
  venue?: string;
  address?: string;
  lunch_date?: string;
  start_time?: string;
  price_cents?: number;
  total_seats?: number;
  menu?: string | null;
}

export async function updateLunch(
  id: number,
  patch: UpdateLunchInput,
): Promise<LunchRow | null> {
  return withClient(async (client) => {
    const existing = await client.query<LunchRow>(
      `SELECT ${LUNCH_COLUMNS} FROM lunchclub.lunches WHERE id = $1`,
      [id],
    );
    if (existing.rows.length === 0) return null;

    const sets: string[] = [];
    const params: unknown[] = [];
    const scheduleChanged =
      patch.lunch_date !== undefined || patch.start_time !== undefined;
    for (const k of [
      'venue',
      'address',
      'price_cents',
      'total_seats',
      'menu',
    ] as const) {
      if (patch[k] !== undefined) {
        params.push(patch[k]);
        sets.push(`${k} = $${params.length}`);
      }
    }
    if (patch.lunch_date !== undefined) {
      params.push(patch.lunch_date);
      sets.push(`lunch_date = $${params.length}::date`);
    }
    if (patch.start_time !== undefined) {
      params.push(patch.start_time);
      sets.push(`start_time = $${params.length}::time`);
    }
    if (scheduleChanged) {
      const newDate = patch.lunch_date ?? existing.rows[0].lunch_date;
      const newTime = patch.start_time ?? existing.rows[0].start_time;
      params.push(newDate);
      const dateIdx = params.length;
      params.push(newTime);
      const timeIdx = params.length;
      sets.push(
        `booking_cutoff_at = (($${dateIdx}::date::timestamp + $${timeIdx}::time) AT TIME ZONE 'America/Los_Angeles') - INTERVAL '48 hours'`,
      );
    }
    if (sets.length === 0) return existing.rows[0];
    params.push(id);
    const res = await client.query<LunchRow>(
      `UPDATE lunchclub.lunches
          SET ${sets.join(', ')}
        WHERE id = $${params.length}
        RETURNING ${LUNCH_COLUMNS}`,
      params,
    );
    return res.rows[0] ?? null;
  });
}

export async function markLunchStatus(
  id: number,
  status: LunchStatus,
): Promise<LunchRow | null> {
  const rows = await query<LunchRow>(
    `UPDATE lunchclub.lunches
        SET status = $1
      WHERE id = $2
      RETURNING ${LUNCH_COLUMNS}`,
    [status, id],
  );
  return rows[0] ?? null;
}

export async function markLunchNonPayProcessed(id: number): Promise<void> {
  await query(
    `UPDATE lunchclub.lunches SET non_pay_processed_at = now() WHERE id = $1`,
    [id],
  );
}

export async function countPaidSeats(lunchId: number): Promise<number> {
  const rows = await query<{ seats: string | null }>(
    `SELECT COALESCE(SUM(seats), 0)::text AS seats
       FROM lunchclub.bookings
      WHERE lunch_id = $1 AND status = 'paid'`,
    [lunchId],
  );
  return Number(rows[0]?.seats ?? 0);
}

// ---------------------------------------------------------------------------
// Bookings
// ---------------------------------------------------------------------------

const BOOKING_COLUMNS = `id, lunch_id, signup_id, table_member_id, seats, status,
  magic_token, stripe_session_id, stripe_payment_intent_id, refund_id,
  amount_cents, invited_at, paid_at, reminder_sent_at, nudge_sent_at,
  cancelled_at, refunded_at, created_at`;

interface BookingContextRow {
  b_id: number;
  b_lunch_id: number;
  b_signup_id: number;
  b_table_member_id: number | null;
  b_seats: number;
  b_status: BookingStatus;
  b_magic_token: string;
  b_stripe_session_id: string | null;
  b_stripe_payment_intent_id: string | null;
  b_refund_id: string | null;
  b_amount_cents: number | null;
  b_invited_at: Date;
  b_paid_at: Date | null;
  b_reminder_sent_at: Date | null;
  b_nudge_sent_at: Date | null;
  b_cancelled_at: Date | null;
  b_refunded_at: Date | null;
  b_created_at: Date;
  l_id: number;
  l_standing_table_id: number;
  l_venue: string;
  l_address: string;
  l_lunch_date: string;
  l_start_time: string;
  l_starts_at: Date;
  l_price_cents: number;
  l_total_seats: number;
  l_booking_cutoff_at: Date;
  l_menu: string | null;
  l_status: LunchStatus;
  l_non_pay_processed_at: Date | null;
  l_created_at: Date;
  t_id: number;
  t_name: string;
  t_day_of_week: number;
  t_area: string | null;
  t_default_venue: string | null;
  t_default_address: string | null;
  t_status: TableStatus;
  t_created_at: Date;
  s_id: number;
  s_first_name: string | null;
  s_last_name: string | null;
  s_phone: string | null;
  s_email: string | null;
}

function rowToContext(r: BookingContextRow): BookingWithContext {
  return {
    booking: {
      id: r.b_id,
      lunch_id: r.b_lunch_id,
      signup_id: r.b_signup_id,
      table_member_id: r.b_table_member_id,
      seats: r.b_seats,
      status: r.b_status,
      magic_token: r.b_magic_token,
      stripe_session_id: r.b_stripe_session_id,
      stripe_payment_intent_id: r.b_stripe_payment_intent_id,
      refund_id: r.b_refund_id,
      amount_cents: r.b_amount_cents,
      invited_at: r.b_invited_at,
      paid_at: r.b_paid_at,
      reminder_sent_at: r.b_reminder_sent_at,
      nudge_sent_at: r.b_nudge_sent_at,
      cancelled_at: r.b_cancelled_at,
      refunded_at: r.b_refunded_at,
      created_at: r.b_created_at,
    },
    lunch: {
      id: r.l_id,
      standing_table_id: r.l_standing_table_id,
      venue: r.l_venue,
      address: r.l_address,
      lunch_date: r.l_lunch_date,
      start_time: r.l_start_time,
      starts_at: r.l_starts_at,
      price_cents: r.l_price_cents,
      total_seats: r.l_total_seats,
      booking_cutoff_at: r.l_booking_cutoff_at,
      menu: r.l_menu,
      status: r.l_status,
      non_pay_processed_at: r.l_non_pay_processed_at,
      created_at: r.l_created_at,
    },
    standingTable: {
      id: r.t_id,
      name: r.t_name,
      day_of_week: r.t_day_of_week,
      area: r.t_area,
      default_venue: r.t_default_venue,
      default_address: r.t_default_address,
      status: r.t_status,
      created_at: r.t_created_at,
    },
    signup: {
      id: r.s_id,
      first_name: r.s_first_name,
      last_name: r.s_last_name,
      phone: r.s_phone,
      email: r.s_email,
    },
  };
}

const BOOKING_CONTEXT_SELECT = `
  SELECT
    b.id AS b_id, b.lunch_id AS b_lunch_id, b.signup_id AS b_signup_id,
    b.table_member_id AS b_table_member_id, b.seats AS b_seats,
    b.status AS b_status, b.magic_token AS b_magic_token,
    b.stripe_session_id AS b_stripe_session_id,
    b.stripe_payment_intent_id AS b_stripe_payment_intent_id,
    b.refund_id AS b_refund_id, b.amount_cents AS b_amount_cents,
    b.invited_at AS b_invited_at, b.paid_at AS b_paid_at,
    b.reminder_sent_at AS b_reminder_sent_at,
    b.nudge_sent_at AS b_nudge_sent_at,
    b.cancelled_at AS b_cancelled_at,
    b.refunded_at AS b_refunded_at, b.created_at AS b_created_at,
    l.id AS l_id, l.standing_table_id AS l_standing_table_id,
    l.venue AS l_venue, l.address AS l_address,
    to_char(l.lunch_date, 'YYYY-MM-DD') AS l_lunch_date,
    to_char(l.start_time, 'HH24:MI:SS') AS l_start_time,
    l.starts_at AS l_starts_at, l.price_cents AS l_price_cents,
    l.total_seats AS l_total_seats,
    l.booking_cutoff_at AS l_booking_cutoff_at,
    l.menu AS l_menu, l.status AS l_status,
    l.non_pay_processed_at AS l_non_pay_processed_at,
    l.created_at AS l_created_at,
    t.id AS t_id, t.name AS t_name, t.day_of_week AS t_day_of_week,
    t.area AS t_area, t.default_venue AS t_default_venue,
    t.default_address AS t_default_address, t.status AS t_status,
    t.created_at AS t_created_at,
    s.id AS s_id, s.first_name AS s_first_name, s.last_name AS s_last_name,
    s.phone AS s_phone, s.email AS s_email
  FROM lunchclub.bookings b
  JOIN lunchclub.lunches l ON l.id = b.lunch_id
  JOIN lunchclub.standing_tables t ON t.id = l.standing_table_id
  JOIN lunchclub.signups s ON s.id = b.signup_id
`;

export async function getBookingByToken(
  token: string,
): Promise<BookingWithContext | null> {
  if (typeof token !== 'string' || token.trim().length === 0) return null;
  const rows = await query<BookingContextRow>(
    `${BOOKING_CONTEXT_SELECT} WHERE b.magic_token = $1 LIMIT 1`,
    [token],
  );
  return rows[0] ? rowToContext(rows[0]) : null;
}

export async function getBookingContext(
  bookingId: number,
): Promise<BookingWithContext | null> {
  const rows = await query<BookingContextRow>(
    `${BOOKING_CONTEXT_SELECT} WHERE b.id = $1 LIMIT 1`,
    [bookingId],
  );
  return rows[0] ? rowToContext(rows[0]) : null;
}

export async function getBookingBySessionId(
  sessionId: string,
): Promise<BookingRow | null> {
  const rows = await query<BookingRow>(
    `SELECT ${BOOKING_COLUMNS} FROM lunchclub.bookings
      WHERE stripe_session_id = $1`,
    [sessionId],
  );
  return rows[0] ?? null;
}

export async function getBookingById(id: number): Promise<BookingRow | null> {
  const rows = await query<BookingRow>(
    `SELECT ${BOOKING_COLUMNS} FROM lunchclub.bookings WHERE id = $1`,
    [id],
  );
  return rows[0] ?? null;
}

export async function listBookingsForLunch(
  lunchId: number,
): Promise<BookingWithSignup[]> {
  const rows = await query<BookingRow & {
    s_id: number;
    s_first: string | null;
    s_last: string | null;
    s_phone: string | null;
    s_email: string | null;
  }>(
    `SELECT b.id, b.lunch_id, b.signup_id, b.table_member_id, b.seats, b.status,
            b.magic_token, b.stripe_session_id, b.stripe_payment_intent_id,
            b.refund_id, b.amount_cents, b.invited_at, b.paid_at,
            b.reminder_sent_at, b.nudge_sent_at, b.cancelled_at,
            b.refunded_at, b.created_at,
            s.id AS s_id, s.first_name AS s_first, s.last_name AS s_last,
            s.phone AS s_phone, s.email AS s_email
       FROM lunchclub.bookings b
       JOIN lunchclub.signups s ON s.id = b.signup_id
      WHERE b.lunch_id = $1
      ORDER BY b.created_at ASC`,
    [lunchId],
  );
  return rows.map((r) => ({
    id: r.id,
    lunch_id: r.lunch_id,
    signup_id: r.signup_id,
    table_member_id: r.table_member_id,
    seats: r.seats,
    status: r.status,
    magic_token: r.magic_token,
    stripe_session_id: r.stripe_session_id,
    stripe_payment_intent_id: r.stripe_payment_intent_id,
    refund_id: r.refund_id,
    amount_cents: r.amount_cents,
    invited_at: r.invited_at,
    paid_at: r.paid_at,
    reminder_sent_at: r.reminder_sent_at,
    nudge_sent_at: r.nudge_sent_at,
    cancelled_at: r.cancelled_at,
    refunded_at: r.refunded_at,
    created_at: r.created_at,
    signup: {
      id: r.s_id,
      first_name: r.s_first,
      last_name: r.s_last,
      phone: r.s_phone,
      email: r.s_email,
    },
  }));
}

export async function listBookingsForLunchByStatus(
  lunchId: number,
  statuses: BookingStatus[],
): Promise<BookingRow[]> {
  if (statuses.length === 0) return [];
  return query<BookingRow>(
    `SELECT ${BOOKING_COLUMNS} FROM lunchclub.bookings
      WHERE lunch_id = $1 AND status = ANY($2::text[])
      ORDER BY created_at ASC`,
    [lunchId, statuses],
  );
}

export async function listBookingsByLunchAndStatus(
  lunchId: number,
  status: BookingStatus,
): Promise<BookingRow[]> {
  return query<BookingRow>(
    `SELECT ${BOOKING_COLUMNS} FROM lunchclub.bookings
      WHERE lunch_id = $1 AND status = $2
      ORDER BY created_at ASC`,
    [lunchId, status],
  );
}

export async function createInvitedBooking(
  lunchId: number,
  signupId: number,
  tableMemberId: number | null,
  seats: 1 | 2,
): Promise<BookingRow> {
  const token = generateUrlSafeToken(24);
  const inserted = await query<BookingRow>(
    `INSERT INTO lunchclub.bookings
       (lunch_id, signup_id, table_member_id, seats, magic_token)
     VALUES ($1, $2, $3, $4, $5)
     ON CONFLICT (lunch_id, signup_id) DO NOTHING
     RETURNING ${BOOKING_COLUMNS}`,
    [lunchId, signupId, tableMemberId, seats, token],
  );
  if (inserted[0]) return inserted[0];
  const existing = await query<BookingRow>(
    `SELECT ${BOOKING_COLUMNS} FROM lunchclub.bookings
      WHERE lunch_id = $1 AND signup_id = $2`,
    [lunchId, signupId],
  );
  return existing[0];
}

export async function attachCheckoutSession(
  bookingId: number,
  sessionId: string,
): Promise<void> {
  await query(
    `UPDATE lunchclub.bookings
        SET stripe_session_id = $1,
            status = CASE WHEN status = 'invited' THEN 'checkout_pending' ELSE status END
      WHERE id = $2`,
    [sessionId, bookingId],
  );
}

export async function markBookingPaid(
  bookingId: number,
  args: { sessionId: string; paymentIntentId: string | null; amountCents: number },
): Promise<BookingRow | null> {
  const rows = await query<BookingRow>(
    `UPDATE lunchclub.bookings
        SET status = 'paid',
            paid_at = now(),
            stripe_session_id = COALESCE(stripe_session_id, $2),
            stripe_payment_intent_id = COALESCE(stripe_payment_intent_id, $3),
            amount_cents = $4
      WHERE id = $1 AND status <> 'paid'
      RETURNING ${BOOKING_COLUMNS}`,
    [bookingId, args.sessionId, args.paymentIntentId, args.amountCents],
  );
  return rows[0] ?? null;
}

export async function markBookingCancelled(
  bookingId: number,
): Promise<BookingRow | null> {
  const rows = await query<BookingRow>(
    `UPDATE lunchclub.bookings
        SET status = 'cancelled', cancelled_at = now()
      WHERE id = $1 AND status NOT IN ('cancelled','refunded')
      RETURNING ${BOOKING_COLUMNS}`,
    [bookingId],
  );
  return rows[0] ?? null;
}

export async function markBookingRefunded(
  bookingId: number,
  refundId: string,
): Promise<BookingRow | null> {
  const rows = await query<BookingRow>(
    `UPDATE lunchclub.bookings
        SET status = 'refunded',
            refund_id = $2,
            refunded_at = now(),
            cancelled_at = COALESCE(cancelled_at, now())
      WHERE id = $1 AND status <> 'refunded'
      RETURNING ${BOOKING_COLUMNS}`,
    [bookingId, refundId],
  );
  return rows[0] ?? null;
}

export async function listBookingsNeedingNudge(): Promise<BookingWithContext[]> {
  const rows = await query<BookingContextRow>(
    `${BOOKING_CONTEXT_SELECT}
      WHERE b.status = 'invited'
        AND b.nudge_sent_at IS NULL
        AND l.booking_cutoff_at BETWEEN now() + INTERVAL '23 hours'
                                    AND now() + INTERVAL '25 hours'
        AND l.status IN ('tentative','confirmed')`,
  );
  return rows.map(rowToContext);
}

export async function listBookingsNeedingReminder(): Promise<BookingWithContext[]> {
  const rows = await query<BookingContextRow>(
    `${BOOKING_CONTEXT_SELECT}
      WHERE b.status = 'paid'
        AND b.reminder_sent_at IS NULL
        AND l.starts_at >= ((date_trunc('day', timezone('America/Los_Angeles', now())) + INTERVAL '1 day') AT TIME ZONE 'America/Los_Angeles')
        AND l.starts_at <  ((date_trunc('day', timezone('America/Los_Angeles', now())) + INTERVAL '2 days') AT TIME ZONE 'America/Los_Angeles')
        AND l.status IN ('confirmed','tentative')`,
  );
  return rows.map(rowToContext);
}

export async function stampNudgeSent(bookingId: number): Promise<void> {
  await query(
    `UPDATE lunchclub.bookings SET nudge_sent_at = now() WHERE id = $1`,
    [bookingId],
  );
}

export async function stampReminderSent(bookingId: number): Promise<void> {
  await query(
    `UPDATE lunchclub.bookings SET reminder_sent_at = now() WHERE id = $1`,
    [bookingId],
  );
}

// Monthly loop helpers ------------------------------------------------------

export async function listLunchesPastDateNeedingProcessing(): Promise<LunchRow[]> {
  return query<LunchRow>(
    `SELECT ${LUNCH_COLUMNS}
       FROM lunchclub.lunches
      WHERE non_pay_processed_at IS NULL
        AND lunch_date < (timezone('America/Los_Angeles', now()))::date
        AND status IN ('confirmed','cancelled')
      ORDER BY lunch_date ASC`,
  );
}

export async function listOverdueLunchesForBelowFloor(): Promise<LunchRow[]> {
  return query<LunchRow>(
    `SELECT ${LUNCH_COLUMNS}
       FROM lunchclub.lunches
      WHERE status IN ('tentative','confirmed')
        AND now() >= booking_cutoff_at`,
  );
}

export async function getMemberPaidForLunch(
  lunchId: number,
  signupId: number,
): Promise<boolean> {
  const rows = await query<{ exists: boolean }>(
    `SELECT EXISTS(
       SELECT 1 FROM lunchclub.bookings
        WHERE lunch_id = $1 AND signup_id = $2 AND status = 'paid'
     ) AS exists`,
    [lunchId, signupId],
  );
  return rows[0]?.exists === true;
}

export async function getLatestLunchForTable(
  standingTableId: number,
): Promise<LunchRow | null> {
  const rows = await query<LunchRow>(
    `SELECT ${LUNCH_COLUMNS}
       FROM lunchclub.lunches
      WHERE standing_table_id = $1
      ORDER BY lunch_date DESC
      LIMIT 1`,
    [standingTableId],
  );
  return rows[0] ?? null;
}

export async function findLunchForTableOnDate(
  standingTableId: number,
  lunchDate: string,
): Promise<LunchRow | null> {
  const rows = await query<LunchRow>(
    `SELECT ${LUNCH_COLUMNS}
       FROM lunchclub.lunches
      WHERE standing_table_id = $1 AND lunch_date = $2::date`,
    [standingTableId, lunchDate],
  );
  return rows[0] ?? null;
}

export async function listUnseatedSignups(): Promise<SignupRow[]> {
  return query<SignupRow>(
    `SELECT ${SIGNUP_COLUMNS}
       FROM lunchclub.signups
      WHERE status <> 'seated'
        AND NOT EXISTS (
          SELECT 1 FROM lunchclub.table_members m
           WHERE m.signup_id = lunchclub.signups.id AND m.status = 'active'
        )
      ORDER BY created_at DESC`,
  );
}
