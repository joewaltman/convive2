import { normalizePhone } from './phone';
import type { SignupInput, SoloOrWith, WhoFor } from './types';

const WEEKDAYS = new Set(['mon', 'tue', 'wed', 'thu', 'fri']);
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export type ValidationResult =
  | { ok: true; value: SignupInput }
  | { ok: false; code: 'invalid_input'; field: string };

function fail(field: string): ValidationResult {
  return { ok: false, code: 'invalid_input', field };
}

function asTrimmedString(v: unknown): string | null {
  if (typeof v !== 'string') return null;
  const t = v.trim();
  return t.length === 0 ? null : t;
}

function asStringArray(v: unknown): string[] {
  if (!Array.isArray(v)) return [];
  return v
    .filter((x): x is string => typeof x === 'string')
    .map((s) => s.trim())
    .filter((s) => s.length > 0);
}

function asWhoFor(v: unknown): WhoFor | null {
  return v === 'self' || v === 'other' ? v : null;
}

function asSoloOrWith(v: unknown): SoloOrWith | null {
  return v === 'solo' || v === 'with' ? v : null;
}

export function validateSignupBody(raw: unknown): ValidationResult {
  if (!raw || typeof raw !== 'object') return fail('body');
  const b = raw as Record<string, unknown>;

  const whoFor = asWhoFor(b.who_for);
  if (!whoFor) return fail('who_for');

  let buyerName: string | null = null;
  let buyerEmail: string | null = null;
  let buyerPhone: string | null = null;
  let buyerRelationship: string | null = null;

  if (whoFor === 'other') {
    buyerName = asTrimmedString(b.buyer_name);
    if (!buyerName) return fail('buyer_name');
    buyerEmail = asTrimmedString(b.buyer_email);
    if (!buyerEmail || !EMAIL_RE.test(buyerEmail)) return fail('buyer_email');
    const rawBuyerPhone = asTrimmedString(b.buyer_phone);
    if (rawBuyerPhone) {
      const normalized = normalizePhone(rawBuyerPhone);
      buyerPhone = normalized ?? rawBuyerPhone;
    }
    buyerRelationship = asTrimmedString(b.buyer_relationship);
  }

  const firstName = asTrimmedString(b.first_name);
  if (!firstName) return fail('first_name');
  const lastName = asTrimmedString(b.last_name);

  const email = asTrimmedString(b.email);
  if (!email || !EMAIL_RE.test(email)) return fail('email');

  const phone = normalizePhone(b.phone);
  if (!phone) return fail('phone');

  const zipCode = asTrimmedString(b.zip_code);

  const rawWeekdays = asStringArray(b.weekday_availability).map((s) => s.toLowerCase());
  const weekdays = rawWeekdays.filter((d) => WEEKDAYS.has(d));
  if (weekdays.length < 1) return fail('weekday_availability');

  const ageRange = asTrimmedString(b.age_range);
  const lifeStage = asTrimmedString(b.life_stage);
  const soloOrWith = asSoloOrWith(b.solo_or_with);
  const companionName = asTrimmedString(b.companion_name);

  const comfortNotes = asTrimmedString(b.comfort_notes);
  const dietaryRestrictions = asStringArray(b.dietary_restrictions);
  const dietaryNotes = asTrimmedString(b.dietary_notes);

  const qCareer = asTrimmedString(b.q_career);
  const qChapter = asTrimmedString(b.q_chapter);
  const qCurious = asTrimmedString(b.q_curious);
  const qSurprising = asTrimmedString(b.q_surprising);
  const qBestGathering = asTrimmedString(b.q_best_gathering);
  const qHopes = asTrimmedString(b.q_hopes);
  const qAnythingElse = asTrimmedString(b.q_anything_else);

  const prospectToken = asTrimmedString(b.prospect_token);

  return {
    ok: true,
    value: {
      prospect_token: prospectToken,
      source: 'organic',
      arm: null,
      who_for: whoFor,
      buyer_name: buyerName,
      buyer_email: buyerEmail,
      buyer_phone: buyerPhone,
      buyer_relationship: buyerRelationship,
      first_name: firstName,
      last_name: lastName,
      email,
      phone,
      zip_code: zipCode,
      weekday_availability: weekdays,
      age_range: ageRange,
      life_stage: lifeStage,
      solo_or_with: soloOrWith,
      companion_name: companionName,
      comfort_notes: comfortNotes,
      dietary_restrictions: dietaryRestrictions,
      dietary_notes: dietaryNotes,
      q_career: qCareer,
      q_chapter: qChapter,
      q_curious: qCurious,
      q_surprising: qSurprising,
      q_best_gathering: qBestGathering,
      q_hopes: qHopes,
      q_anything_else: qAnythingElse,
    },
  };
}
