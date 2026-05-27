'use client';

import { useState, type FormEvent } from 'react';

interface ClaimFormProps {
  reservationId: number;
  chapterSlug: string;
  price: string;
}

export function ClaimForm({ reservationId, chapterSlug, price }: ClaimFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError('');
    setIsSubmitting(true);

    try {
      const res = await fetch(`/api/reservations/${reservationId}/checkout`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });
      const rawText = await res.text();
      let data: Record<string, unknown> = {};
      if (rawText) {
        try {
          data = JSON.parse(rawText) as Record<string, unknown>;
        } catch {
          throw new Error(
            `Server error (HTTP ${res.status}). Please try again, and contact us if the problem persists.`,
          );
        }
      } else if (!res.ok) {
        throw new Error(
          `Server error (HTTP ${res.status}). Please try again, and contact us if the problem persists.`,
        );
      }

      if (!res.ok) {
        if (data.error === 'expired') {
          setError('The claim window has expired. The seat has been offered to the next person.');
        } else {
          const msg = typeof data.error === 'string' ? data.error : 'Something went wrong';
          throw new Error(msg);
        }
        setIsSubmitting(false);
        return;
      }

      if (typeof data.checkout_url === 'string') {
        window.location.href = data.checkout_url;
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong. Please try again.');
      setIsSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {error && (
        <div className="bg-terracotta/10 border border-terracotta/20 rounded-sm p-4">
          <p className="body-sm text-terracotta">{error}</p>
        </div>
      )}

      <button
        type="submit"
        disabled={isSubmitting}
        className="w-full px-8 py-4 rounded-sm body-base font-medium text-white transition-opacity hover:opacity-90 disabled:opacity-50"
        style={{ backgroundColor: 'var(--chapter-accent)' }}
      >
        {isSubmitting ? 'Processing...' : `Pay ${price} and claim your seat`}
      </button>
    </form>
  );
}
