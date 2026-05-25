'use client';

import { useState, type FormEvent } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';

type Step = 'email' | 'code';

export default function LoginPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const nextUrl = searchParams.get('next') ?? '/my-dinners';

  const [step, setStep] = useState<Step>('email');
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleEmailSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const res = await fetch('/api/auth/request-code', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ email: email.trim(), purpose: 'guest' }),
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        setError(j.error ?? 'Failed to send code');
        setSubmitting(false);
        return;
      }
      setStep('code');
      setSubmitting(false);
    } catch (err) {
      setError((err as Error).message);
      setSubmitting(false);
    }
  }

  async function handleCodeSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const res = await fetch('/api/auth/verify-code', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ email: email.trim(), code: code.trim(), purpose: 'guest' }),
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        setError(j.error === 'invalid_code' ? 'Invalid or expired code' : (j.error ?? 'Verification failed'));
        setSubmitting(false);
        return;
      }
      router.push(nextUrl);
    } catch (err) {
      setError((err as Error).message);
      setSubmitting(false);
    }
  }

  return (
    <div className="min-h-screen bg-bone flex items-center justify-center px-4">
      <div className="w-full max-w-md bg-surface border border-border rounded-lg p-8">
        <h1 className="heading-2 mb-2 text-center">Sign in to view your dinners</h1>
        <p className="body-sm text-warm-gray text-center mb-6">
          {step === 'email'
            ? 'Enter your email and we will send you a sign-in code.'
            : 'We sent a 6-digit code to your email.'}
        </p>

        {step === 'email' ? (
          <form onSubmit={handleEmailSubmit} className="space-y-4">
            <label className="block">
              <span className="block body-sm text-ink mb-1">Email</span>
              <input
                type="email"
                autoFocus
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full border border-border bg-bone rounded px-3 py-2 body-base text-ink focus:outline-none focus:ring-2 focus:ring-terracotta"
                placeholder="you@example.com"
              />
            </label>
            {error ? <p className="body-sm text-terracotta">{error}</p> : null}
            <button
              type="submit"
              disabled={submitting}
              className="w-full bg-terracotta hover:bg-terracotta-dark text-white px-4 py-3 rounded body-base font-medium disabled:opacity-50 cursor-pointer transition-colors"
            >
              {submitting ? 'Sending...' : 'Send sign-in code'}
            </button>
          </form>
        ) : (
          <form onSubmit={handleCodeSubmit} className="space-y-4">
            <label className="block">
              <span className="block body-sm text-ink mb-1">Email</span>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full border border-border bg-bone rounded px-3 py-2 body-base text-ink focus:outline-none focus:ring-2 focus:ring-terracotta"
              />
            </label>
            <label className="block">
              <span className="block body-sm text-ink mb-1">Code</span>
              <input
                type="text"
                inputMode="numeric"
                pattern="\d{6}"
                maxLength={6}
                required
                value={code}
                onChange={(e) => setCode(e.target.value)}
                className="w-full border border-border bg-bone rounded px-3 py-2 body-base text-ink text-center tracking-widest focus:outline-none focus:ring-2 focus:ring-terracotta"
                placeholder="123456"
                autoFocus
              />
            </label>
            {error ? <p className="body-sm text-terracotta">{error}</p> : null}
            <button
              type="submit"
              disabled={submitting}
              className="w-full bg-terracotta hover:bg-terracotta-dark text-white px-4 py-3 rounded body-base font-medium disabled:opacity-50 cursor-pointer transition-colors"
            >
              {submitting ? 'Verifying...' : 'Verify and sign in'}
            </button>
            <button
              type="button"
              onClick={() => {
                setStep('email');
                setCode('');
                setError(null);
              }}
              className="w-full text-warm-gray body-sm hover:text-ink cursor-pointer"
            >
              Use a different email
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
