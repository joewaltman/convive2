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
