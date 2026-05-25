'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

interface ConfirmCancelProps {
  reservationId: number;
  cancelToken: string;
  dinnerTitle: string;
  chapterDisplayName: string;
  dinnerDateFormatted: string;
  venueName: string;
  wasPaid: boolean;
}

export default function ConfirmCancel({
  reservationId,
  cancelToken,
  dinnerTitle,
  chapterDisplayName,
  dinnerDateFormatted,
  venueName,
  wasPaid,
}: ConfirmCancelProps) {
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  async function handleCancel() {
    setError(null);
    setSubmitting(true);
    try {
      const res = await fetch(`/api/reservations/${reservationId}/cancel`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ cancel_token: cancelToken }),
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        setError(j.error ?? 'Failed to cancel reservation');
        setSubmitting(false);
        return;
      }
      setSuccess(true);
    } catch (err) {
      setError((err as Error).message);
      setSubmitting(false);
    }
  }

  if (success) {
    return (
      <div className="min-h-screen bg-bone flex items-center justify-center px-4">
        <div className="w-full max-w-md bg-surface border border-border rounded-lg p-8 text-center">
          <h1 className="heading-2 mb-4">Reservation cancelled</h1>
          <p className="body-base text-warm-gray mb-6">
            Your reservation for the {chapterDisplayName} dinner has been cancelled.
          </p>
          {wasPaid && (
            <p className="body-sm text-warm-gray mb-6">
              If you paid for this reservation, a refund will be processed manually within 2 business days.
            </p>
          )}
          <button
            onClick={() => router.push('/my-dinners')}
            className="inline-block bg-terracotta hover:bg-terracotta-dark text-white px-6 py-3 rounded body-base font-medium transition-colors cursor-pointer"
          >
            View my dinners
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-bone flex items-center justify-center px-4">
      <div className="w-full max-w-md bg-surface border border-border rounded-lg p-8">
        <h1 className="heading-2 mb-4 text-center">Cancel your reservation?</h1>

        <div className="mb-6 p-4 bg-bone rounded border border-border">
          <p className="eyebrow mb-1">{chapterDisplayName}</p>
          <p className="heading-3 mb-2">{dinnerTitle}</p>
          <p className="body-sm text-warm-gray">{venueName}</p>
          <p className="body-sm text-ink">{dinnerDateFormatted}</p>
        </div>

        <p className="body-sm text-warm-gray text-center mb-6">
          {wasPaid
            ? 'If you cancel, your seat will be released. A refund will be processed manually within 2 business days.'
            : 'If you cancel, your seat will be released and someone else may claim it.'}
        </p>

        {error ? <p className="body-sm text-terracotta text-center mb-4">{error}</p> : null}

        <div className="space-y-3">
          <button
            onClick={handleCancel}
            disabled={submitting}
            className="w-full bg-terracotta hover:bg-terracotta-dark text-white px-4 py-3 rounded body-base font-medium disabled:opacity-50 cursor-pointer transition-colors"
          >
            {submitting ? 'Cancelling...' : 'Confirm cancellation'}
          </button>
          <button
            onClick={() => router.push('/my-dinners')}
            disabled={submitting}
            className="w-full border border-border bg-bone text-ink px-4 py-3 rounded body-base font-medium hover:bg-surface cursor-pointer transition-colors"
          >
            Keep my reservation
          </button>
        </div>
      </div>
    </div>
  );
}
