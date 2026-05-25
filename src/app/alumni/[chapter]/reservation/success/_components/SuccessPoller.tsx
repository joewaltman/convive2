'use client';

import { useEffect, useState } from 'react';

interface SuccessPollerProps {
  sessionId: string;
  chapterSlug: string;
}

export function SuccessPoller({ sessionId, chapterSlug }: SuccessPollerProps) {
  const [attempts, setAttempts] = useState(0);
  const [error, setError] = useState(false);

  useEffect(() => {
    if (attempts >= 10) {
      setError(true);
      return;
    }

    const timer = setTimeout(async () => {
      // Refresh the page to re-check reservation status
      window.location.reload();
    }, 500);

    setAttempts((prev) => prev + 1);

    return () => clearTimeout(timer);
  }, [attempts]);

  if (error) {
    return (
      <>
        <div className="w-16 h-16 rounded-full mx-auto mb-6 flex items-center justify-center bg-warm-gray/20">
          <svg width="32" height="32" viewBox="0 0 32 32" fill="none">
            <circle
              cx="16"
              cy="16"
              r="12"
              stroke="currentColor"
              strokeWidth="2"
              className="text-warm-gray"
            />
            <path
              d="M16 10V16"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              className="text-warm-gray"
            />
            <circle cx="16" cy="21" r="1.5" fill="currentColor" className="text-warm-gray" />
          </svg>
        </div>
        <h2 className="heading-2 mb-4">Processing your payment</h2>
        <p className="body-base text-body mb-6">
          Your payment is being processed. This may take a moment. Please check your email for confirmation, or contact us if you do not receive it within a few minutes.
        </p>
        <a
          href={`/alumni/${chapterSlug}`}
          className="inline-block body-base text-terracotta hover:underline"
        >
          Back to dinners
        </a>
      </>
    );
  }

  return (
    <>
      {/* Loading spinner */}
      <div className="w-16 h-16 mx-auto mb-6">
        <svg
          className="animate-spin"
          viewBox="0 0 64 64"
          fill="none"
          style={{ color: 'var(--chapter-accent)' }}
        >
          <circle
            cx="32"
            cy="32"
            r="28"
            stroke="currentColor"
            strokeWidth="4"
            strokeOpacity="0.2"
          />
          <path
            d="M32 4C17.088 4 5 16.088 5 31"
            stroke="currentColor"
            strokeWidth="4"
            strokeLinecap="round"
          />
        </svg>
      </div>
      <h2 className="heading-2 mb-4">Confirming your reservation</h2>
      <p className="body-base text-body">
        Please wait while we confirm your payment...
      </p>
    </>
  );
}
