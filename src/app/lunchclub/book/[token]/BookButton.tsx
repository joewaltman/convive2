'use client';

import { useState } from 'react';

export default function BookButton({ token }: { token: string }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function go() {
    setError(null);
    setLoading(true);
    try {
      const res = await fetch(`/api/lunchclub/book/${token}/checkout`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: '{}',
      });
      const data = (await res.json()) as { checkout_url?: string; error?: string };
      if (!res.ok || !data.checkout_url) {
        setError(messageForError(data.error) ?? 'Something went wrong.');
        setLoading(false);
        return;
      }
      window.location.href = data.checkout_url;
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
      setLoading(false);
    }
  }

  return (
    <div>
      <button
        type="button"
        onClick={go}
        disabled={loading}
        className="bg-ink text-bone px-5 py-2 rounded text-base hover:opacity-90 disabled:opacity-60"
      >
        {loading ? 'Loading...' : 'Reserve my seat'}
      </button>
      {error ? <p className="text-red-700 text-sm mt-2">{error}</p> : null}
    </div>
  );
}

function messageForError(code: string | undefined): string | null {
  switch (code) {
    case 'invalid_token':
      return 'This link is no longer valid.';
    case 'already_paid':
      return 'You are already confirmed.';
    case 'cancelled':
      return 'This reservation was cancelled.';
    case 'lunch_cancelled':
      return 'This lunch was cancelled.';
    case 'closed':
      return 'Booking has closed for this lunch.';
    default:
      return null;
  }
}
