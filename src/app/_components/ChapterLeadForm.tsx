'use client';

import { useState, type FormEvent } from 'react';

type FormState = 'idle' | 'submitting' | 'success' | 'error';

export function ChapterLeadForm() {
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
      contact_role: formData.get('contact_role')?.toString().trim() ?? '',
      chapter_name: formData.get('chapter_name')?.toString().trim() ?? '',
      approximate_size: formData.get('approximate_size')?.toString().trim() ?? '',
    };

    try {
      const res = await fetch('/api/chapter-leads', {
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
        <label htmlFor="contact_name" className="block body-sm font-medium text-ink mb-1">
          Your name <span className="text-terracotta">*</span>
        </label>
        <input
          type="text"
          id="contact_name"
          name="contact_name"
          required
          className="w-full px-3 py-2 border border-border rounded-sm bg-white body-base focus:outline-none focus:ring-2 focus:ring-terracotta/50"
        />
      </div>

      <div>
        <label htmlFor="contact_email" className="block body-sm font-medium text-ink mb-1">
          Email <span className="text-terracotta">*</span>
        </label>
        <input
          type="email"
          id="contact_email"
          name="contact_email"
          required
          className="w-full px-3 py-2 border border-border rounded-sm bg-white body-base focus:outline-none focus:ring-2 focus:ring-terracotta/50"
        />
      </div>

      <div>
        <label htmlFor="contact_role" className="block body-sm font-medium text-ink mb-1">
          Your role <span className="text-terracotta">*</span>
        </label>
        <input
          type="text"
          id="contact_role"
          name="contact_role"
          required
          placeholder="e.g., Chapter President, Events Chair"
          className="w-full px-3 py-2 border border-border rounded-sm bg-white body-base focus:outline-none focus:ring-2 focus:ring-terracotta/50"
        />
      </div>

      <div>
        <label htmlFor="chapter_name" className="block body-sm font-medium text-ink mb-1">
          Chapter or organization name <span className="text-terracotta">*</span>
        </label>
        <input
          type="text"
          id="chapter_name"
          name="chapter_name"
          required
          className="w-full px-3 py-2 border border-border rounded-sm bg-white body-base focus:outline-none focus:ring-2 focus:ring-terracotta/50"
        />
      </div>

      <div>
        <label htmlFor="approximate_size" className="block body-sm font-medium text-ink mb-1">
          Approximate active members
        </label>
        <input
          type="number"
          id="approximate_size"
          name="approximate_size"
          min="0"
          className="w-full px-3 py-2 border border-border rounded-sm bg-white body-base focus:outline-none focus:ring-2 focus:ring-terracotta/50"
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
