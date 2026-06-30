export type WhoFor = 'self' | 'other';
export type SoloOrWith = 'solo' | 'with';
export type SignupSource = 'organic' | 'reactivation';
export type SignupStatus = 'new' | 'contacted' | 'invited' | 'seated';
export type SignupArm = 'A' | 'C' | null;

export interface SignupRow {
  id: number;
  prospect_token: string | null;
  who_for: string;
  buyer_name: string | null;
  buyer_email: string | null;
  buyer_phone: string | null;
  buyer_relationship: string | null;
  first_name: string | null;
  last_name: string | null;
  email: string | null;
  phone: string | null;
  zip_code: string | null;
  weekday_availability: string[];
  age_range: string | null;
  life_stage: string | null;
  solo_or_with: string | null;
  companion_name: string | null;
  comfort_notes: string | null;
  dietary_restrictions: string[];
  dietary_notes: string | null;
  q_career: string | null;
  q_chapter: string | null;
  q_curious: string | null;
  q_surprising: string | null;
  q_best_gathering: string | null;
  q_hopes: string | null;
  q_anything_else: string | null;
  source: 'organic' | 'reactivation';
  arm: 'A' | 'C' | null;
  status: SignupStatus;
  admin_note: string | null;
  created_at: Date;
}

export interface ProspectRow {
  id: number;
  token: string;
  first_name: string | null;
  last_name: string | null;
  email: string | null;
  phone_clean: string | null;
  signed_up: boolean;
  contacted_at: Date | null;
  created_at: Date;
}

export interface ProspectPrefill {
  token: string;
  first_name: string | null;
  last_name: string | null;
  email: string | null;
  phone: string | null;
  zip_code: string | null;
  age_range: string | null;
  dietary_restrictions: string[];
  dietary_notes: string | null;
  q_career: string | null;
  q_curious: string | null;
  q_surprising: string | null;
}

export type TableStatus = 'forming' | 'active' | 'paused';
export type MemberStatus = 'active' | 'released';
export type LunchStatus = 'tentative' | 'confirmed' | 'cancelled' | 'completed';
export type BookingStatus = 'invited' | 'checkout_pending' | 'paid' | 'cancelled' | 'refunded';

export interface StandingTableRow {
  id: number;
  name: string;
  day_of_week: number;
  area: string | null;
  default_venue: string | null;
  default_address: string | null;
  status: TableStatus;
  created_at: Date;
}

export interface TableMemberRow {
  id: number;
  standing_table_id: number;
  signup_id: number;
  seats: number;
  status: MemberStatus;
  consecutive_unpaid: number;
  joined_at: Date;
}

export interface LunchRow {
  id: number;
  standing_table_id: number;
  venue: string;
  address: string;
  lunch_date: string; // ISO date 'YYYY-MM-DD' as returned from pg DATE
  start_time: string; // 'HH:MM:SS'
  starts_at: Date;
  price_cents: number;
  total_seats: number;
  booking_cutoff_at: Date;
  menu: string | null;
  status: LunchStatus;
  non_pay_processed_at: Date | null;
  created_at: Date;
}

export interface BookingRow {
  id: number;
  lunch_id: number;
  signup_id: number;
  table_member_id: number | null;
  seats: number;
  status: BookingStatus;
  magic_token: string;
  stripe_session_id: string | null;
  stripe_payment_intent_id: string | null;
  refund_id: string | null;
  amount_cents: number | null;
  invited_at: Date;
  paid_at: Date | null;
  reminder_sent_at: Date | null;
  nudge_sent_at: Date | null;
  cancelled_at: Date | null;
  refunded_at: Date | null;
  created_at: Date;
}

export interface SignupSummary {
  id: number;
  first_name: string | null;
  last_name: string | null;
  phone: string | null;
  email: string | null;
}

export interface BookingWithContext {
  booking: BookingRow;
  lunch: LunchRow;
  standingTable: StandingTableRow;
  signup: SignupSummary;
}

export interface TableMemberWithSignup extends TableMemberRow {
  signup: SignupSummary;
}

export interface BookingWithSignup extends BookingRow {
  signup: SignupSummary;
}

export interface SignupInput {
  prospect_token: string | null;
  source: SignupSource;
  arm: string | null;

  who_for: WhoFor;
  buyer_name: string | null;
  buyer_email: string | null;
  buyer_phone: string | null;
  buyer_relationship: string | null;

  first_name: string;
  last_name: string | null;
  email: string;
  phone: string;
  zip_code: string | null;
  weekday_availability: string[];
  age_range: string | null;
  life_stage: string | null;
  solo_or_with: SoloOrWith | null;
  companion_name: string | null;
  comfort_notes: string | null;
  dietary_restrictions: string[];
  dietary_notes: string | null;
  q_career: string | null;
  q_chapter: string | null;
  q_curious: string | null;
  q_surprising: string | null;
  q_best_gathering: string | null;
  q_hopes: string | null;
  q_anything_else: string | null;
}
