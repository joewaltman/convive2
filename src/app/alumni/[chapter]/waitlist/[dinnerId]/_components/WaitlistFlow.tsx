'use client';

import { useState, type FormEvent } from 'react';
import type { Chapter, Guest } from '@/lib/types';

type FlowState = 'EMAIL' | 'CODE' | 'PROFILE' | 'CONFIRM';

interface WaitlistFlowProps {
  chapter: Chapter;
  dinnerId: number;
  guest: Guest | null;
}

interface ProfileData {
  first_name: string;
  last_name: string;
  what_do_you_do: string;
  dietary_restrictions: string[];
}

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

export function WaitlistFlow({ chapter, dinnerId, guest }: WaitlistFlowProps) {
  const initialState: FlowState = guest ? 'CONFIRM' : 'EMAIL';

  const [flowState, setFlowState] = useState<FlowState>(initialState);
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [profile, setProfile] = useState<ProfileData>({
    first_name: guest?.first_name || '',
    last_name: guest?.last_name || '',
    what_do_you_do: guest?.what_do_you_do || '',
    dietary_restrictions: guest?.dietary_restrictions || [],
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [alreadyOnWaitlist, setAlreadyOnWaitlist] = useState(false);

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
        await fetch('/api/auth/request-code', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: email.trim(), chapterSlug: chapter.slug }),
        });
        setFlowState('CODE');
      } else {
        setFlowState('PROFILE');
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

      setProfile({
        first_name: data.guest.first_name || '',
        last_name: data.guest.last_name || '',
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

    setFlowState('CONFIRM');
  }

  async function handleConfirmSubmit(e: FormEvent) {
    e.preventDefault();
    setError('');
    setIsSubmitting(true);

    try {
      const body: Record<string, unknown> = {
        dinner_id: dinnerId,
      };

      // Include email and profile if not logged in
      if (!guest) {
        body.email = email.trim();
        body.profile = {
          first_name: profile.first_name.trim(),
          last_name: profile.last_name.trim(),
          what_do_you_do: profile.what_do_you_do.trim() || null,
          dietary_restrictions: profile.dietary_restrictions,
        };
      }

      const res = await fetch('/api/waitlist/join', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const data = await res.json();

      if (data.needsCode) {
        setEmail(data.email);
        await fetch('/api/auth/request-code', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: data.email, chapterSlug: chapter.slug }),
        });
        setFlowState('CODE');
        setIsSubmitting(false);
        return;
      }

      if (!res.ok) {
        throw new Error(data.error || 'Something went wrong');
      }

      if (data.already) {
        setAlreadyOnWaitlist(true);
      }
      setSuccess(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong. Please try again.');
    } finally {
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

  const primaryButtonStyle = {
    backgroundColor: 'var(--chapter-accent)',
  };

  if (success) {
    return (
      <div className="text-center py-8">
        <div
          className="w-16 h-16 rounded-full mx-auto mb-6 flex items-center justify-center"
          style={{ backgroundColor: 'var(--chapter-accent)' }}
        >
          <svg width="32" height="32" viewBox="0 0 32 32" fill="none">
            <path
              d="M8 16L14 22L24 10"
              stroke="white"
              strokeWidth="3"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </div>
        <h2 className="heading-2 mb-4">
          {alreadyOnWaitlist ? "You're already on the waitlist" : "You're on the waitlist"}
        </h2>
        <p className="body-base text-body">
          {alreadyOnWaitlist
            ? "We already have you down. We will email you if a spot opens up."
            : "We will email you if a spot opens up. The claim window is 24 hours."}
        </p>
      </div>
    );
  }

  return (
    <div className="max-w-md mx-auto">
      {/* EMAIL state */}
      {flowState === 'EMAIL' && (
        <form onSubmit={handleEmailSubmit} className="space-y-4">
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

      {/* CODE state */}
      {flowState === 'CODE' && (
        <form onSubmit={handleCodeSubmit} className="space-y-4">
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

      {/* PROFILE state */}
      {flowState === 'PROFILE' && (
        <form onSubmit={handleProfileSubmit} className="space-y-4">
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

          <div>
            <label htmlFor="what_do_you_do" className="block body-sm font-medium text-ink mb-1">
              What do you do?
            </label>
            <textarea
              id="what_do_you_do"
              value={profile.what_do_you_do}
              onChange={(e) => setProfile({ ...profile, what_do_you_do: e.target.value })}
              rows={2}
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
            Continue
          </button>
        </form>
      )}

      {/* CONFIRM state */}
      {flowState === 'CONFIRM' && (
        <form onSubmit={handleConfirmSubmit} className="space-y-6">
          <div className="border border-border rounded-sm p-4">
            <p className="body-base text-ink mb-2">
              <strong>{profile.first_name} {profile.last_name}</strong>
            </p>
            <p className="body-sm text-warm-gray">
              {guest ? guest.email : email}
            </p>
          </div>

          {error && <p className="body-sm text-terracotta">{error}</p>}

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full px-6 py-3 rounded-sm body-base font-medium text-white transition-opacity hover:opacity-90 disabled:opacity-50"
            style={primaryButtonStyle}
          >
            {isSubmitting ? 'Joining...' : 'Join the waitlist'}
          </button>
        </form>
      )}
    </div>
  );
}
