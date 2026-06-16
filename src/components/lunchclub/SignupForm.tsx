'use client';

import { useMemo, useState, type FormEvent } from 'react';
import { Field } from './Field';
import { CheckboxGroup } from './CheckboxGroup';
import { RadioGroup } from './RadioGroup';
import { ThankYouPanel } from './ThankYouPanel';
import type { ProspectPrefill } from '@/lib/lunchclub/types';

export interface SignupFormProps {
  source: 'organic' | 'reactivation';
  prefill: ProspectPrefill | null;
  hideWhoFor?: boolean;
  ageRangeOptions: string[];
  dietaryOptions: string[];
}

type State = 'idle' | 'submitting' | 'success' | 'error';

interface FormShape {
  who_for: 'self' | 'other';
  buyer_name: string;
  buyer_email: string;
  buyer_phone: string;
  buyer_relationship: string;

  first_name: string;
  last_name: string;
  email: string;
  phone: string;
  zip_code: string;
  weekday_availability: string[];
  age_range: string;
  life_stage: string;
  solo_or_with: 'solo' | 'with' | '';
  companion_name: string;

  comfort_notes: string;
  dietary_restrictions: string[];
  dietary_notes: string;

  q_career: string;
  q_chapter: string;
  q_curious: string;
  q_surprising: string;
  q_best_gathering: string;
  q_hopes: string;
  q_anything_else: string;
}

const OTHER_DIETARY = 'Other';

const WEEKDAY_OPTIONS = [
  { value: 'mon', label: 'Monday' },
  { value: 'tue', label: 'Tuesday' },
  { value: 'wed', label: 'Wednesday' },
  { value: 'thu', label: 'Thursday' },
  { value: 'fri', label: 'Friday' },
];

const inputCls =
  'w-full px-4 min-h-[52px] border border-border rounded-sm bg-white body-base text-ink focus:outline-none focus:ring-2 focus:ring-terracotta/50 aria-[invalid=true]:border-terracotta';
const textareaCls =
  'w-full px-4 py-3 min-h-[120px] border border-border rounded-sm bg-white body-base text-ink focus:outline-none focus:ring-2 focus:ring-terracotta/50 aria-[invalid=true]:border-terracotta';

function friendlyError(code: string | null): string {
  if (code === 'rate_limited') {
    return "Looks like that already went through. Hang tight and we'll be in touch.";
  }
  if (code === 'invalid_input') {
    return 'Please check the highlighted fields and try again.';
  }
  return 'Something went wrong on our end. Please try again in a moment.';
}

export function SignupForm({
  prefill,
  hideWhoFor,
  ageRangeOptions,
  dietaryOptions,
}: SignupFormProps) {
  const initial: FormShape = useMemo(() => {
    return {
      who_for: 'self',
      buyer_name: '',
      buyer_email: '',
      buyer_phone: '',
      buyer_relationship: '',

      first_name: prefill?.first_name ?? '',
      last_name: prefill?.last_name ?? '',
      email: prefill?.email ?? '',
      phone: prefill?.phone ?? '',
      zip_code: prefill?.zip_code ?? '',
      weekday_availability: [],
      age_range: prefill?.age_range ?? '',
      life_stage: '',
      solo_or_with: '',
      companion_name: '',

      comfort_notes: '',
      dietary_restrictions: prefill?.dietary_restrictions ?? [],
      dietary_notes: prefill?.dietary_notes ?? '',

      q_career: prefill?.q_career ?? '',
      q_chapter: '',
      q_curious: prefill?.q_curious ?? '',
      q_surprising: prefill?.q_surprising ?? '',
      q_best_gathering: '',
      q_hopes: '',
      q_anything_else: '',
    };
  }, [prefill]);

  const [form, setForm] = useState<FormShape>(initial);
  const [state, setState] = useState<State>('idle');
  const [errorCode, setErrorCode] = useState<string | null>(null);
  const [errorField, setErrorField] = useState<string | null>(null);

  const ageOptions = useMemo(() => {
    const set = new Set<string>(ageRangeOptions ?? []);
    if (form.age_range) set.add(form.age_range);
    return Array.from(set);
  }, [ageRangeOptions, form.age_range]);

  const dietaryFinal = useMemo(() => {
    const set = new Set<string>(dietaryOptions ?? []);
    for (const v of form.dietary_restrictions) set.add(v);
    set.delete(OTHER_DIETARY);
    const list = Array.from(set);
    list.push(OTHER_DIETARY);
    return list.map((v) => ({ value: v, label: v }));
  }, [dietaryOptions, form.dietary_restrictions]);

  function update<K extends keyof FormShape>(key: K, value: FormShape[K]) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setState('submitting');
    setErrorCode(null);
    setErrorField(null);

    const payload: Record<string, unknown> = {
      prospect_token: prefill?.token ?? null,
      who_for: hideWhoFor ? 'self' : form.who_for,
      buyer_name: form.buyer_name || null,
      buyer_email: form.buyer_email || null,
      buyer_phone: form.buyer_phone || null,
      buyer_relationship: form.buyer_relationship || null,
      first_name: form.first_name,
      last_name: form.last_name || null,
      email: form.email,
      phone: form.phone,
      zip_code: form.zip_code || null,
      weekday_availability: form.weekday_availability,
      age_range: form.age_range || null,
      life_stage: form.life_stage || null,
      solo_or_with: form.solo_or_with || null,
      companion_name: form.companion_name || null,
      comfort_notes: form.comfort_notes || null,
      dietary_restrictions: form.dietary_restrictions,
      dietary_notes: form.dietary_notes || null,
      q_career: form.q_career || null,
      q_chapter: form.q_chapter || null,
      q_curious: form.q_curious || null,
      q_surprising: form.q_surprising || null,
      q_best_gathering: form.q_best_gathering || null,
      q_hopes: form.q_hopes || null,
      q_anything_else: form.q_anything_else || null,
    };

    try {
      const res = await fetch('/api/lunchclub/signups', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = (await res.json().catch(() => ({}))) as {
        ok?: boolean;
        error?: string;
        field?: string;
      };
      if (!res.ok || !data.ok) {
        setErrorCode(data.error ?? 'server_error');
        setErrorField(data.field ?? null);
        setState('error');
        return;
      }
      setState('success');
    } catch {
      setErrorCode('server_error');
      setState('error');
    }
  }

  if (state === 'success') {
    return <ThankYouPanel firstName={form.first_name} />;
  }

  const showWhoFor = !hideWhoFor;
  const showBuyer = showWhoFor && form.who_for === 'other';
  const showCompanion = form.solo_or_with === 'with';
  const errBanner =
    state === 'error' ? (
      <div
        className="border border-terracotta bg-terracotta/10 px-4 py-3 rounded-sm body-base text-terracotta"
        role="alert"
      >
        {friendlyError(errorCode)}
      </div>
    ) : null;

  const fe = (name: string) =>
    errorField === name && errorCode === 'invalid_input'
      ? 'Please check this field.'
      : null;

  return (
    <form onSubmit={handleSubmit} className="space-y-10" noValidate>
      {errBanner}

      {showWhoFor ? (
        <section className="space-y-4">
          <h2 className="heading-2">Who is this for?</h2>
          <Field id="who_for" label="Who is this signup for?" required error={fe('who_for')}>
            <RadioGroup
              name="who_for"
              value={form.who_for}
              onChange={(v) => update('who_for', v as 'self' | 'other')}
              options={[
                { value: 'self', label: 'Myself' },
                { value: 'other', label: 'Someone else' },
              ]}
            />
          </Field>

          {showBuyer ? (
            <div className="space-y-6 pt-2">
              <Field
                id="buyer_name"
                label="Your name"
                required
                error={fe('buyer_name')}
              >
                <input
                  id="buyer_name"
                  type="text"
                  value={form.buyer_name}
                  onChange={(e) => update('buyer_name', e.target.value)}
                  className={inputCls}
                  aria-invalid={errorField === 'buyer_name' || undefined}
                  required
                />
              </Field>
              <Field
                id="buyer_email"
                label="Your email"
                required
                error={fe('buyer_email')}
              >
                <input
                  id="buyer_email"
                  type="email"
                  value={form.buyer_email}
                  onChange={(e) => update('buyer_email', e.target.value)}
                  className={inputCls}
                  aria-invalid={errorField === 'buyer_email' || undefined}
                  required
                />
              </Field>
              <Field id="buyer_phone" label="Your phone" error={fe('buyer_phone')}>
                <input
                  id="buyer_phone"
                  type="tel"
                  value={form.buyer_phone}
                  onChange={(e) => update('buyer_phone', e.target.value)}
                  className={inputCls}
                />
              </Field>
              <Field
                id="buyer_relationship"
                label="Your relationship to them"
                error={fe('buyer_relationship')}
              >
                <input
                  id="buyer_relationship"
                  type="text"
                  value={form.buyer_relationship}
                  onChange={(e) => update('buyer_relationship', e.target.value)}
                  className={inputCls}
                />
              </Field>
            </div>
          ) : null}
        </section>
      ) : null}

      <section className="space-y-6">
        <h2 className="heading-2">The basics</h2>

        <Field id="first_name" label="First name" required error={fe('first_name')}>
          <input
            id="first_name"
            type="text"
            value={form.first_name}
            onChange={(e) => update('first_name', e.target.value)}
            className={inputCls}
            aria-invalid={errorField === 'first_name' || undefined}
            required
          />
        </Field>

        <Field id="last_name" label="Last name" error={fe('last_name')}>
          <input
            id="last_name"
            type="text"
            value={form.last_name}
            onChange={(e) => update('last_name', e.target.value)}
            className={inputCls}
          />
        </Field>

        <Field id="email" label="Email" required error={fe('email')}>
          <input
            id="email"
            type="email"
            value={form.email}
            onChange={(e) => update('email', e.target.value)}
            className={inputCls}
            aria-invalid={errorField === 'email' || undefined}
            required
          />
        </Field>

        <Field id="phone" label="Phone" required error={fe('phone')}>
          <input
            id="phone"
            type="tel"
            value={form.phone}
            onChange={(e) => update('phone', e.target.value)}
            className={inputCls}
            aria-invalid={errorField === 'phone' || undefined}
            required
          />
        </Field>

        <Field id="zip_code" label="ZIP code" error={fe('zip_code')}>
          <input
            id="zip_code"
            type="text"
            value={form.zip_code}
            onChange={(e) => update('zip_code', e.target.value)}
            className={inputCls}
          />
        </Field>

        <Field
          id="weekday_availability"
          label="Which weekdays could work for lunch?"
          required
          error={fe('weekday_availability')}
          hint="Pick at least one."
        >
          <CheckboxGroup
            name="weekday_availability"
            options={WEEKDAY_OPTIONS}
            values={form.weekday_availability}
            onChange={(next) => update('weekday_availability', next)}
            ariaInvalid={errorField === 'weekday_availability'}
            layout="grid"
          />
        </Field>

        <Field id="age_range" label="Age range" error={fe('age_range')}>
          <select
            id="age_range"
            value={form.age_range}
            onChange={(e) => update('age_range', e.target.value)}
            className={inputCls}
          >
            <option value="">Choose one</option>
            {ageOptions.map((opt) => (
              <option key={opt} value={opt}>
                {opt}
              </option>
            ))}
          </select>
        </Field>

        <Field id="life_stage" label="Life stage" error={fe('life_stage')}>
          <input
            id="life_stage"
            type="text"
            value={form.life_stage}
            onChange={(e) => update('life_stage', e.target.value)}
            className={inputCls}
          />
        </Field>

        <Field id="solo_or_with" label="Coming solo or with someone?" error={fe('solo_or_with')}>
          <RadioGroup
            name="solo_or_with"
            value={form.solo_or_with || null}
            onChange={(v) => update('solo_or_with', v as 'solo' | 'with')}
            options={[
              { value: 'solo', label: 'Solo' },
              { value: 'with', label: 'With someone' },
            ]}
          />
        </Field>

        {showCompanion ? (
          <Field id="companion_name" label="Who are you bringing?" error={fe('companion_name')}>
            <input
              id="companion_name"
              type="text"
              value={form.companion_name}
              onChange={(e) => update('companion_name', e.target.value)}
              className={inputCls}
            />
          </Field>
        ) : null}
      </section>

      <section className="space-y-6">
        <h2 className="heading-2">Comfort and food</h2>

        <Field
          id="comfort_notes"
          label="Anything that would help you feel comfortable at lunch?"
          error={fe('comfort_notes')}
        >
          <textarea
            id="comfort_notes"
            value={form.comfort_notes}
            onChange={(e) => update('comfort_notes', e.target.value)}
            className={textareaCls}
            rows={3}
          />
        </Field>

        <Field
          id="dietary_restrictions"
          label="Any dietary restrictions?"
          error={fe('dietary_restrictions')}
        >
          <CheckboxGroup
            name="dietary_restrictions"
            options={dietaryFinal}
            values={form.dietary_restrictions}
            onChange={(next) => update('dietary_restrictions', next)}
          />
        </Field>

        <Field
          id="dietary_notes"
          label="Notes on food (allergies, preferences, anything else)"
          error={fe('dietary_notes')}
        >
          <textarea
            id="dietary_notes"
            value={form.dietary_notes}
            onChange={(e) => update('dietary_notes', e.target.value)}
            className={textareaCls}
            rows={3}
          />
        </Field>
      </section>

      <section className="space-y-6">
        <h2 className="heading-2">About you</h2>

        <Field id="q_career" label="What do you do, or what did you do?" error={fe('q_career')}>
          <textarea
            id="q_career"
            value={form.q_career}
            onChange={(e) => update('q_career', e.target.value)}
            className={textareaCls}
            rows={3}
          />
        </Field>

        <Field
          id="q_chapter"
          label="What chapter of life are you in right now?"
          error={fe('q_chapter')}
        >
          <textarea
            id="q_chapter"
            value={form.q_chapter}
            onChange={(e) => update('q_chapter', e.target.value)}
            className={textareaCls}
            rows={3}
          />
        </Field>

        <Field
          id="q_curious"
          label="What are you curious about these days?"
          error={fe('q_curious')}
        >
          <textarea
            id="q_curious"
            value={form.q_curious}
            onChange={(e) => update('q_curious', e.target.value)}
            className={textareaCls}
            rows={3}
          />
        </Field>

        <Field
          id="q_surprising"
          label="Tell us something surprising you know a lot about."
          error={fe('q_surprising')}
        >
          <textarea
            id="q_surprising"
            value={form.q_surprising}
            onChange={(e) => update('q_surprising', e.target.value)}
            className={textareaCls}
            rows={3}
          />
        </Field>

        <Field
          id="q_best_gathering"
          label="Think of the best small gathering you have ever been to. What made it work?"
          error={fe('q_best_gathering')}
        >
          <textarea
            id="q_best_gathering"
            value={form.q_best_gathering}
            onChange={(e) => update('q_best_gathering', e.target.value)}
            className={textareaCls}
            rows={3}
          />
        </Field>

        <Field
          id="q_hopes"
          label="What would make this lunch worth your time?"
          error={fe('q_hopes')}
        >
          <textarea
            id="q_hopes"
            value={form.q_hopes}
            onChange={(e) => update('q_hopes', e.target.value)}
            className={textareaCls}
            rows={3}
          />
        </Field>
      </section>

      <section className="space-y-6">
        <h2 className="heading-2">Anything else?</h2>
        <Field
          id="q_anything_else"
          label="Anything else we should know?"
          error={fe('q_anything_else')}
        >
          <textarea
            id="q_anything_else"
            value={form.q_anything_else}
            onChange={(e) => update('q_anything_else', e.target.value)}
            className={textareaCls}
            rows={3}
          />
        </Field>
      </section>

      <button
        type="submit"
        disabled={state === 'submitting'}
        className="w-full bg-terracotta text-white px-6 py-4 rounded-sm body-lg font-medium hover:bg-terracotta-dark transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {state === 'submitting' ? 'Sending...' : 'Send it in'}
      </button>
    </form>
  );
}
