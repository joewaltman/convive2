'use client';

import { useState, type FormEvent } from 'react';

type FormState = 'idle' | 'submitting' | 'success' | 'error';

export function VenueLeadForm() {
  const [state, setState] = useState<FormState>('idle');
  const [errorMessage, setErrorMessage] = useState('');

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setState('submitting');
    setErrorMessage('');

    const form = e.currentTarget;
    const formData = new FormData(form);

    const body = {
      contact_name: formData.get('contact_name')?.toString().trim() ?? '',
      contact_email: formData.get('contact_email')?.toString().trim() ?? '',
      venue_name: formData.get('venue_name')?.toString().trim() ?? '',
      venue_type: formData.get('venue_type')?.toString().trim() ?? '',
      neighborhood: formData.get('neighborhood')?.toString().trim() ?? '',
      capacity: formData.get('capacity')?.toString().trim() ?? '',
      notes: formData.get('notes')?.toString().trim() ?? '',
    };

    try {
      const res = await fetch('/api/venue-leads', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || 'Something went wrong. Please try again.');
      }

      setState('success');
      form.reset();
    } catch (err) {
      setState('error');
      setErrorMessage(err instanceof Error ? err.message : 'Something went wrong.');
    }
  }

  if (state === 'success') {
    return (
      <div className="py-8 text-center">
        <p className="heading-3 mb-2">Thank you.</p>
        <p className="body-base text-body">
          We received your inquiry and will be in touch soon.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label htmlFor="venue_contact_name" className="block body-sm font-medium text-ink mb-1">
          Your name <span className="text-terracotta">*</span>
        </label>
        <input
          type="text"
          id="venue_contact_name"
          name="contact_name"
          required
          className="w-full px-3 py-2 border border-border rounded-sm bg-white body-base focus:outline-none focus:ring-2 focus:ring-terracotta/50"
        />
      </div>

      <div>
        <label htmlFor="venue_contact_email" className="block body-sm font-medium text-ink mb-1">
          Email <span className="text-terracotta">*</span>
        </label>
        <input
          type="email"
          id="venue_contact_email"
          name="contact_email"
          required
          className="w-full px-3 py-2 border border-border rounded-sm bg-white body-base focus:outline-none focus:ring-2 focus:ring-terracotta/50"
        />
      </div>

      <div>
        <label htmlFor="venue_name" className="block body-sm font-medium text-ink mb-1">
          Venue name
        </label>
        <input
          type="text"
          id="venue_name"
          name="venue_name"
          className="w-full px-3 py-2 border border-border rounded-sm bg-white body-base focus:outline-none focus:ring-2 focus:ring-terracotta/50"
        />
      </div>

      <div>
        <label htmlFor="venue_type" className="block body-sm font-medium text-ink mb-1">
          Venue type
        </label>
        <select
          id="venue_type"
          name="venue_type"
          className="w-full px-3 py-2 border border-border rounded-sm bg-white body-base focus:outline-none focus:ring-2 focus:ring-terracotta/50"
        >
          <option value="">Select type</option>
          <option value="Restaurant">Restaurant</option>
          <option value="Private event space">Private event space</option>
          <option value="Banquet hall">Banquet hall</option>
          <option value="Other">Other</option>
        </select>
      </div>

      <div>
        <label htmlFor="venue_neighborhood" className="block body-sm font-medium text-ink mb-1">
          Neighborhood or city
        </label>
        <input
          type="text"
          id="venue_neighborhood"
          name="neighborhood"
          className="w-full px-3 py-2 border border-border rounded-sm bg-white body-base focus:outline-none focus:ring-2 focus:ring-terracotta/50"
        />
      </div>

      <div>
        <label htmlFor="venue_capacity" className="block body-sm font-medium text-ink mb-1">
          Private dining capacity
        </label>
        <input
          type="number"
          id="venue_capacity"
          name="capacity"
          min="0"
          className="w-full px-3 py-2 border border-border rounded-sm bg-white body-base focus:outline-none focus:ring-2 focus:ring-terracotta/50"
        />
      </div>

      <div>
        <label htmlFor="venue_notes" className="block body-sm font-medium text-ink mb-1">
          Anything else?
        </label>
        <textarea
          id="venue_notes"
          name="notes"
          rows={3}
          className="w-full px-3 py-2 border border-border rounded-sm bg-white body-base focus:outline-none focus:ring-2 focus:ring-terracotta/50 resize-none"
        />
      </div>

      {state === 'error' && (
        <p className="body-sm text-terracotta">{errorMessage}</p>
      )}

      <button
        type="submit"
        disabled={state === 'submitting'}
        className="w-full bg-terracotta text-white px-6 py-3 rounded-sm body-base font-medium hover:bg-terracotta-dark transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {state === 'submitting' ? 'Sending...' : 'Submit'}
      </button>
    </form>
  );
}
