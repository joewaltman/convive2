'use client';

import { useState, type FormEvent } from 'react';
import type { Chapter, Dinner, Venue, Guest } from '@/lib/types';

type FlowState =
  | 'EMAIL'
  | 'EXISTING_GUEST_CODE'
  | 'NEW_GUEST_PROFILE'
  | 'CONFIRM';

interface DinnerWithVenue extends Dinner {
  venue?: Venue;
  chapter?: Chapter;
}

interface BookingFlowProps {
  chapter: Chapter;
  dinner: DinnerWithVenue;
  guest: Guest | null;
}

interface ProfileData {
  first_name: string;
  last_name: string;
  grad_year: string;
  major: string;
  what_do_you_do: string;
  dietary_restrictions: string[];
}

const GRAD_YEARS: number[] = (() => {
  const current = new Date().getFullYear();
  const max = current + 6; // covers current undergrads still anticipating graduation
  const min = 1940;
  const years: number[] = [];
  for (let y = max; y >= min; y--) years.push(y);
  return years;
})();

const DIETARY_OPTIONS = [
  'vegetarian',
  'vegan',
  'gluten-free',
  'dairy-free',
  'nut allergy',
  'shellfish allergy',
  'no pork',
  'no beef',
  'kosher',
  'halal',
];

export function BookingFlow({ chapter, dinner, guest }: BookingFlowProps) {
  // If guest is logged in, skip to CONFIRM
  const initialState: FlowState = guest ? 'CONFIRM' : 'EMAIL';

  const [flowState, setFlowState] = useState<FlowState>(initialState);
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [profile, setProfile] = useState<ProfileData>({
    first_name: guest?.first_name || '',
    last_name: guest?.last_name || '',
    grad_year: '',
    major: '',
    what_do_you_do: guest?.what_do_you_do || '',
    dietary_restrictions: guest?.dietary_restrictions || [],
  });
  const [bringsPartner, setBringsPartner] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [currentGuest, setCurrentGuest] = useState<Guest | null>(guest);

  const price = (dinner.price_cents / 100).toLocaleString('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  });

  const totalSeats = bringsPartner ? 2 : 1;
  const totalPrice = (dinner.price_cents * totalSeats / 100).toLocaleString('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  });

  async function handleEmailSubmit(e: FormEvent) {
    e.preventDefault();
    setError('');
    setIsSubmitting(true);

    try {
      const res = await fetch('/api/auth/lookup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim() }),
      });
      const data = await res.json();

      if (data.exists) {
        // Request code
        await fetch('/api/auth/request-code', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: email.trim(), chapterSlug: chapter.slug }),
        });
        setFlowState('EXISTING_GUEST_CODE');
      } else {
        setFlowState('NEW_GUEST_PROFILE');
      }
    } catch {
      setError('Something went wrong. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleCodeSubmit(e: FormEvent) {
    e.preventDefault();
    setError('');
    setIsSubmitting(true);

    try {
      const res = await fetch('/api/auth/verify-code', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim(), code: code.trim() }),
      });
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Invalid code');
      }

      setCurrentGuest(data.guest);
      setProfile({
        first_name: data.guest.first_name || '',
        last_name: data.guest.last_name || '',
        grad_year: '',
        major: '',
        what_do_you_do: data.guest.what_do_you_do || '',
        dietary_restrictions: data.guest.dietary_restrictions || [],
      });
      setFlowState('CONFIRM');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Invalid code. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleProfileSubmit(e: FormEvent) {
    e.preventDefault();
    setError('');

    if (!profile.first_name.trim() || !profile.last_name.trim()) {
      setError('Please enter your first and last name.');
      return;
    }
    if (!profile.grad_year || isNaN(parseInt(profile.grad_year, 10))) {
      setError('Please enter a valid graduation year.');
      return;
    }

    setFlowState('CONFIRM');
  }

  async function handleConfirmSubmit(e: FormEvent) {
    e.preventDefault();
    setError('');
    setIsSubmitting(true);

    try {
      const body: Record<string, unknown> = {
        dinner_id: dinner.id,
        brings_partner: bringsPartner && dinner.allows_couples,
        profile: {
          first_name: profile.first_name.trim(),
          last_name: profile.last_name.trim(),
          grad_year: parseInt(profile.grad_year, 10),
          major: profile.major.trim() || null,
          what_do_you_do: profile.what_do_you_do.trim() || null,
          dietary_restrictions: profile.dietary_restrictions,
        },
      };

      // Include email if not logged in (new guest)
      if (!currentGuest) {
        body.email = email.trim();
      }

      const res = await fetch('/api/reservations/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const rawText = await res.text();
      let data: Record<string, unknown> = {};
      if (rawText) {
        try {
          data = JSON.parse(rawText) as Record<string, unknown>;
        } catch {
          // Non-JSON response (e.g. HTML error page from a 5xx). Surface a useful message.
          throw new Error(
            `Server error (HTTP ${res.status}). Please try again or contact support.`,
          );
        }
      } else if (!res.ok) {
        throw new Error(
          `Server error (HTTP ${res.status}). Please try again or contact support.`,
        );
      }

      if (data.fullForBooking) {
        // Redirect to waitlist
        window.location.href = `/alumni/${chapter.slug}/waitlist/${dinner.id}`;
        return;
      }

      if (data.needsCode) {
        // Existing guest that needs verification
        const emailFromServer = typeof data.email === 'string' ? data.email : '';
        setEmail(emailFromServer);
        await fetch('/api/auth/request-code', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: emailFromServer, chapterSlug: chapter.slug }),
        });
        setFlowState('EXISTING_GUEST_CODE');
        setIsSubmitting(false);
        return;
      }

      if (!res.ok) {
        const errMsg = typeof data.error === 'string' ? data.error : 'Something went wrong';
        throw new Error(errMsg);
      }

      if (typeof data.checkout_url === 'string') {
        window.location.href = data.checkout_url;
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong. Please try again.');
      setIsSubmitting(false);
    }
  }

  function toggleDietary(option: string) {
    setProfile((prev) => ({
      ...prev,
      dietary_restrictions: prev.dietary_restrictions.includes(option)
        ? prev.dietary_restrictions.filter((d) => d !== option)
        : [...prev.dietary_restrictions, option],
    }));
  }

  // Common button styles using chapter accent
  const primaryButtonStyle = {
    backgroundColor: 'var(--chapter-accent)',
  };

  return (
    <div className="max-w-md mx-auto">
      {/* Dinner summary */}
      <div className="bg-surface rounded-sm p-4 mb-8">
        <p className="eyebrow mb-1">{dinner.venue?.city || 'Location TBA'}</p>
        <h3
          className="heading-3 mb-2"
          style={{ color: 'var(--chapter-primary)' }}
        >
          {dinner.title}
        </h3>
        <p className="body-sm text-body">{price} per seat</p>
      </div>

      {/* EMAIL state */}
      {flowState === 'EMAIL' && (
        <form onSubmit={handleEmailSubmit} className="space-y-4">
          <h2 className="heading-2 mb-4">Enter your email to get started</h2>
          <div>
            <label htmlFor="email" className="block body-sm font-medium text-ink mb-1">
              Email
            </label>
            <input
              type="email"
              id="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="w-full px-3 py-2 border border-border rounded-sm bg-white body-base focus:outline-none focus:ring-2"
              style={{ '--tw-ring-color': 'var(--chapter-accent)' } as React.CSSProperties}
            />
          </div>
          {error && <p className="body-sm text-terracotta">{error}</p>}
          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full px-6 py-3 rounded-sm body-base font-medium text-white transition-opacity hover:opacity-90 disabled:opacity-50"
            style={primaryButtonStyle}
          >
            {isSubmitting ? 'Checking...' : 'Continue'}
          </button>
        </form>
      )}

      {/* EXISTING_GUEST_CODE state */}
      {flowState === 'EXISTING_GUEST_CODE' && (
        <form onSubmit={handleCodeSubmit} className="space-y-4">
          <h2 className="heading-2 mb-2">Enter your code</h2>
          <p className="body-base text-body mb-4">
            We sent a 6-digit code to {email}. Check your inbox.
          </p>
          <div>
            <label htmlFor="code" className="block body-sm font-medium text-ink mb-1">
              Code
            </label>
            <input
              type="text"
              id="code"
              value={code}
              onChange={(e) => setCode(e.target.value)}
              required
              maxLength={6}
              pattern="[0-9]{6}"
              className="w-full px-3 py-2 border border-border rounded-sm bg-white body-base text-center tracking-widest text-xl focus:outline-none focus:ring-2"
              style={{ '--tw-ring-color': 'var(--chapter-accent)' } as React.CSSProperties}
            />
          </div>
          {error && <p className="body-sm text-terracotta">{error}</p>}
          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full px-6 py-3 rounded-sm body-base font-medium text-white transition-opacity hover:opacity-90 disabled:opacity-50"
            style={primaryButtonStyle}
          >
            {isSubmitting ? 'Verifying...' : 'Verify'}
          </button>
          <button
            type="button"
            onClick={() => setFlowState('EMAIL')}
            className="w-full body-sm text-warm-gray hover:text-ink"
          >
            Use a different email
          </button>
        </form>
      )}

      {/* NEW_GUEST_PROFILE state */}
      {flowState === 'NEW_GUEST_PROFILE' && (
        <form onSubmit={handleProfileSubmit} className="space-y-4">
          <h2 className="heading-2 mb-4">Tell us about yourself</h2>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label htmlFor="first_name" className="block body-sm font-medium text-ink mb-1">
                First name <span className="text-terracotta">*</span>
              </label>
              <input
                type="text"
                id="first_name"
                value={profile.first_name}
                onChange={(e) => setProfile({ ...profile, first_name: e.target.value })}
                required
                className="w-full px-3 py-2 border border-border rounded-sm bg-white body-base focus:outline-none focus:ring-2"
              />
            </div>
            <div>
              <label htmlFor="last_name" className="block body-sm font-medium text-ink mb-1">
                Last name <span className="text-terracotta">*</span>
              </label>
              <input
                type="text"
                id="last_name"
                value={profile.last_name}
                onChange={(e) => setProfile({ ...profile, last_name: e.target.value })}
                required
                className="w-full px-3 py-2 border border-border rounded-sm bg-white body-base focus:outline-none focus:ring-2"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label htmlFor="grad_year" className="block body-sm font-medium text-ink mb-1">
                Graduation year <span className="text-terracotta">*</span>
              </label>
              <select
                id="grad_year"
                value={profile.grad_year}
                onChange={(e) => setProfile({ ...profile, grad_year: e.target.value })}
                required
                className="w-full px-3 py-2 border border-border rounded-sm bg-white body-base focus:outline-none focus:ring-2"
              >
                <option value="">Select year</option>
                {GRAD_YEARS.map((y) => (
                  <option key={y} value={y}>{y}</option>
                ))}
              </select>
            </div>
            <div>
              <label htmlFor="major" className="block body-sm font-medium text-ink mb-1">
                Major
              </label>
              <input
                type="text"
                id="major"
                value={profile.major}
                onChange={(e) => setProfile({ ...profile, major: e.target.value })}
                className="w-full px-3 py-2 border border-border rounded-sm bg-white body-base focus:outline-none focus:ring-2"
              />
            </div>
          </div>

          <div>
            <label htmlFor="what_do_you_do" className="block body-sm font-medium text-ink mb-1">
              What do you do?
            </label>
            <textarea
              id="what_do_you_do"
              value={profile.what_do_you_do}
              onChange={(e) => setProfile({ ...profile, what_do_you_do: e.target.value })}
              rows={2}
              placeholder="A short bio for your fellow diners"
              className="w-full px-3 py-2 border border-border rounded-sm bg-white body-base focus:outline-none focus:ring-2 resize-none"
            />
          </div>

          <div>
            <label className="block body-sm font-medium text-ink mb-2">
              Dietary restrictions
            </label>
            <div className="flex flex-wrap gap-2">
              {DIETARY_OPTIONS.map((option) => (
                <button
                  key={option}
                  type="button"
                  onClick={() => toggleDietary(option)}
                  className={`px-3 py-1 rounded-full body-sm border transition-colors ${
                    profile.dietary_restrictions.includes(option)
                      ? 'bg-ink text-white border-ink'
                      : 'bg-white text-body border-border hover:border-ink'
                  }`}
                >
                  {option}
                </button>
              ))}
            </div>
          </div>

          {error && <p className="body-sm text-terracotta">{error}</p>}

          <button
            type="submit"
            className="w-full px-6 py-3 rounded-sm body-base font-medium text-white transition-opacity hover:opacity-90"
            style={primaryButtonStyle}
          >
            Continue to review
          </button>
        </form>
      )}

      {/* CONFIRM state */}
      {flowState === 'CONFIRM' && (
        <form onSubmit={handleConfirmSubmit} className="space-y-6">
          <h2 className="heading-2 mb-4">Review and pay</h2>

          {/* Profile summary (editable) */}
          <div className="border border-border rounded-sm p-4 space-y-3">
            <div className="flex justify-between items-center">
              <span className="body-sm text-warm-gray">Name</span>
              <span className="body-base text-ink">
                {profile.first_name} {profile.last_name}
              </span>
            </div>
            {profile.grad_year && (
              <div className="flex justify-between items-center">
                <span className="body-sm text-warm-gray">Class of</span>
                <span className="body-base text-ink">{profile.grad_year}</span>
              </div>
            )}
            {profile.major && (
              <div className="flex justify-between items-center">
                <span className="body-sm text-warm-gray">Major</span>
                <span className="body-base text-ink">{profile.major}</span>
              </div>
            )}
            {profile.dietary_restrictions.length > 0 && (
              <div className="flex justify-between items-start">
                <span className="body-sm text-warm-gray">Dietary</span>
                <span className="body-base text-ink text-right">
                  {profile.dietary_restrictions.join(', ')}
                </span>
              </div>
            )}
            {!currentGuest && (
              <button
                type="button"
                onClick={() => setFlowState('NEW_GUEST_PROFILE')}
                className="body-sm text-terracotta hover:underline"
              >
                Edit profile
              </button>
            )}
          </div>

          {/* Partner checkbox */}
          {dinner.allows_couples && (
            <div className="border border-border rounded-sm p-4">
              <label className="flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={bringsPartner}
                  onChange={(e) => setBringsPartner(e.target.checked)}
                  className="w-5 h-5 rounded border-border text-ink focus:ring-2 mr-3"
                />
                <span className="body-base text-ink">
                  I am bringing my partner (+{price})
                </span>
              </label>
            </div>
          )}

          {/* Grad year input (required for payment) */}
          {!profile.grad_year && (
            <div>
              <label htmlFor="confirm_grad_year" className="block body-sm font-medium text-ink mb-1">
                Graduation year <span className="text-terracotta">*</span>
              </label>
              <select
                id="confirm_grad_year"
                value={profile.grad_year}
                onChange={(e) => setProfile({ ...profile, grad_year: e.target.value })}
                required
                className="w-full px-3 py-2 border border-border rounded-sm bg-white body-base focus:outline-none focus:ring-2"
              >
                <option value="">Select year</option>
                {GRAD_YEARS.map((y) => (
                  <option key={y} value={y}>{y}</option>
                ))}
              </select>
            </div>
          )}

          {/* Total */}
          <div className="border-t border-border pt-4">
            <div className="flex justify-between items-center">
              <span className="body-lg font-semibold text-ink">Total</span>
              <span className="body-lg font-semibold text-ink">{totalPrice}</span>
            </div>
          </div>

          {error && <p className="body-sm text-terracotta">{error}</p>}

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full px-6 py-4 rounded-sm body-base font-medium text-white transition-opacity hover:opacity-90 disabled:opacity-50"
            style={primaryButtonStyle}
          >
            {isSubmitting ? 'Processing...' : `Pay ${totalPrice}`}
          </button>
        </form>
      )}
    </div>
  );
}
