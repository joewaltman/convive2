'use client';

import { Suspense, useState, type FormEvent } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';

export default function AdminVerifyPage() {
  return (
    <Suspense fallback={null}>
      <AdminVerifyForm />
    </Suspense>
  );
}

function AdminVerifyForm() {
  const router = useRouter();
  const sp = useSearchParams();
  const initialEmail = sp.get('email') ?? '';
  const [email, setEmail] = useState(initialEmail);
  const [code, setCode] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const res = await fetch('/api/admin/auth/verify-code', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ email: email.trim(), code: code.trim() }),
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        setError(j.error ?? 'verify_failed');
        setSubmitting(false);
        return;
      }
      router.push('/admin');
    } catch (err) {
      setError((err as Error).message);
      setSubmitting(false);
    }
  }

  return (
    <div className="max-w-sm mx-auto py-12">
      <h1 className="text-2xl font-semibold mb-6">Enter your code</h1>
      <p className="text-sm text-neutral-600 mb-4">
        We sent a 6-digit code to your email.
      </p>
      <form onSubmit={onSubmit} className="space-y-4">
        <label className="block">
          <span className="block text-sm mb-1">Email</span>
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full border border-neutral-300 rounded px-3 py-2 text-sm"
          />
        </label>
        <label className="block">
          <span className="block text-sm mb-1">Code</span>
          <input
            type="text"
            inputMode="numeric"
            pattern="\d{6}"
            maxLength={6}
            required
            value={code}
            onChange={(e) => setCode(e.target.value)}
            className="w-full border border-neutral-300 rounded px-3 py-2 text-sm tracking-widest text-center"
            placeholder="123456"
            autoFocus
          />
        </label>
        {error ? <p className="text-sm text-red-600">{error}</p> : null}
        <button
          type="submit"
          disabled={submitting}
          className="w-full bg-neutral-900 text-white px-4 py-2 rounded text-sm disabled:opacity-50 cursor-pointer"
        >
          {submitting ? 'Verifying…' : 'Verify and sign in'}
        </button>
      </form>
    </div>
  );
}
