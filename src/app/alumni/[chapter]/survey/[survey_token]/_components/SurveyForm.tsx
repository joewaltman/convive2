'use client';

import { useState, type FormEvent } from 'react';

interface SurveyFormProps {
  surveyToken: string;
}

type Rating = 1 | 2 | 3 | 4 | 5;

const RATING_LABELS: Record<Rating, string> = {
  1: 'Poor',
  2: 'Below average',
  3: 'Average',
  4: 'Good',
  5: 'Excellent',
};

export function SurveyForm({ surveyToken }: SurveyFormProps) {
  const [venueRating, setVenueRating] = useState<Rating | null>(null);
  const [foodRating, setFoodRating] = useState<Rating | null>(null);
  const [valueRating, setValueRating] = useState<Rating | null>(null);
  const [feedback, setFeedback] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [submitted, setSubmitted] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError('');
    if (venueRating === null || foodRating === null || valueRating === null) {
      setError('Please rate the venue, food, and value before submitting.');
      return;
    }
    setIsSubmitting(true);
    try {
      const res = await fetch(`/api/surveys/${encodeURIComponent(surveyToken)}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          venue_rating: venueRating,
          food_rating: foodRating,
          value_rating: valueRating,
          feedback: feedback.trim() || null,
        }),
      });
      if (!res.ok) {
        const data = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(typeof data.error === 'string' ? data.error : 'Something went wrong');
      }
      setSubmitted(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong. Please try again.');
      setIsSubmitting(false);
    }
  }

  if (submitted) {
    return (
      <div className="bg-surface border border-border rounded-sm p-6 text-center">
        <h2 className="heading-3 text-ink mb-2">Thanks for your feedback</h2>
        <p className="body-base text-body">We read every response.</p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-8">
      <RatingField
        label="The venue"
        helper="Atmosphere, comfort, noise level, service."
        value={venueRating}
        onChange={setVenueRating}
      />
      <RatingField
        label="The food"
        helper="Taste, quality, portion."
        value={foodRating}
        onChange={setFoodRating}
      />
      <RatingField
        label="The value"
        helper="Did the experience feel worth the price?"
        value={valueRating}
        onChange={setValueRating}
      />

      <div>
        <label htmlFor="feedback" className="block body-base font-medium text-ink mb-2">
          Anything else? <span className="text-warm-gray font-normal">(optional)</span>
        </label>
        <textarea
          id="feedback"
          rows={5}
          maxLength={2000}
          value={feedback}
          onChange={(e) => setFeedback(e.target.value)}
          placeholder="What worked, what didn't, what we should try next time."
          className="w-full px-3 py-2 rounded-sm border border-border focus:outline-none focus:ring-2 focus:ring-offset-1 body-base"
          style={{ backgroundColor: 'white' }}
        />
      </div>

      {error ? (
        <div className="bg-terracotta/10 border border-terracotta/20 rounded-sm p-4">
          <p className="body-sm text-terracotta">{error}</p>
        </div>
      ) : null}

      <button
        type="submit"
        disabled={isSubmitting}
        className="w-full px-8 py-4 rounded-sm body-base font-medium text-white transition-opacity hover:opacity-90 disabled:opacity-50"
        style={{ backgroundColor: 'var(--chapter-accent)' }}
      >
        {isSubmitting ? 'Submitting...' : 'Submit feedback'}
      </button>
    </form>
  );
}

function RatingField({
  label,
  helper,
  value,
  onChange,
}: {
  label: string;
  helper: string;
  value: Rating | null;
  onChange: (r: Rating) => void;
}) {
  return (
    <div>
      <p className="body-base font-medium text-ink">{label}</p>
      <p className="body-sm text-warm-gray mb-3">{helper}</p>
      <div className="flex gap-2" role="radiogroup" aria-label={label}>
        {([1, 2, 3, 4, 5] as Rating[]).map((n) => {
          const active = value === n;
          return (
            <button
              key={n}
              type="button"
              role="radio"
              aria-checked={active}
              aria-label={`${n} — ${RATING_LABELS[n]}`}
              onClick={() => onChange(n)}
              className={`w-12 h-12 rounded-sm border body-base font-semibold transition-colors ${
                active
                  ? 'text-white'
                  : 'border-border text-body hover:bg-surface'
              }`}
              style={
                active
                  ? {
                      backgroundColor: 'var(--chapter-accent)',
                      borderColor: 'var(--chapter-accent)',
                    }
                  : undefined
              }
            >
              {n}
            </button>
          );
        })}
      </div>
      {value !== null ? (
        <p className="body-sm text-warm-gray mt-2">{RATING_LABELS[value]}</p>
      ) : null}
    </div>
  );
}
