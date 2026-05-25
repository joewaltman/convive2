export interface Chapter {
  id: number;
  slug: string;
  short_name: string;
  school_name: string;
  display_name: string;
  tagline: string | null;
  from_display_name: string;
  color_primary: string;
  color_secondary: string;
  color_header_bg: string;
  color_header_text: string;
  color_accent: string;
  font_family: string;
  is_active: boolean;
  created_at: Date;
  updated_at: Date;
}

export interface Guest {
  id: number;
  email: string;
  first_name: string;
  last_name: string;
  what_do_you_do: string | null;
  dietary_restrictions: string[];
  dietary_notes: string | null;
  email_unsubscribed_at: Date | null;
  created_at: Date;
  updated_at: Date;
}

export type VenueType = 'restaurant' | 'event_space' | 'home';

export interface Venue {
  id: number;
  name: string;
  venue_type: VenueType;
  host_guest_id: number | null;
  address: string | null;
  neighborhood: string | null;
  city: string | null;
  google_maps_link: string | null;
  capacity_min: number;
  capacity_max: number;
  description: string | null;
  photo_url: string | null;
  is_public: boolean;
  is_active: boolean;
  created_at: Date;
  updated_at: Date;
}

export type DinnerStatus = 'draft' | 'published' | 'sold_out' | 'cancelled' | 'completed';

export interface Dinner {
  id: number;
  chapter_id: number;
  venue_id: number;
  title: string;
  starts_at: Date;
  total_seats: number;
  price_cents: number;
  host_payout_cents: number | null;
  menu: string | null;
  description: string | null;
  parking_note: string | null;
  booking_cutoff_at: Date | null;
  allows_couples: boolean;
  status: DinnerStatus;
  created_at: Date;
  updated_at: Date;
}

export type ReservationStatus = 'pending' | 'confirmed' | 'cancelled';

export interface Reservation {
  id: number;
  guest_id: number;
  dinner_id: number;
  chapter_id: number;
  grad_year: number;
  major: string | null;
  brings_partner: boolean;
  seat_count: number;
  status: ReservationStatus;
  amount_paid_cents: number | null;
  stripe_checkout_session_id: string | null;
  stripe_payment_intent_id: string | null;
  confirm_token: string;
  cancel_token: string;
  calendar_token: string;
  pending_expires_at: Date | null;
  waitlist_entry_id: number | null;
  booked_at: Date | null;
  confirmed_at: Date | null;
  cancelled_at: Date | null;
  reminder_sent_at: Date | null;
  post_dinner_sent_at: Date | null;
  created_at: Date;
  updated_at: Date;
}

export type WaitlistStatus = 'pending' | 'promoted' | 'expired' | 'cancelled';

export interface WaitlistEntry {
  id: number;
  dinner_id: number;
  chapter_id: number;
  guest_id: number;
  status: WaitlistStatus;
  promoted_at: Date | null;
  notified_at: Date | null;
  created_at: Date;
  updated_at: Date;
}

export interface JobSummary {
  ok?: boolean;
  skipped?: boolean;
  reason?: string;
  processed?: number;
  errors?: number;
  details?: unknown;
  [k: string]: unknown;
}
