'use client';

import { useState, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import type { Chapter, Dinner, DinnerStatus, Venue } from '@/lib/types';

const STATUSES: DinnerStatus[] = ['draft', 'published', 'sold_out', 'cancelled', 'completed'];

interface FormState {
  chapter_id: string;
  venue_id: string;
  title: string;
  starts_at: string; // "YYYY-MM-DDTHH:mm" LA local (datetime-local input format)
  total_seats: string;
  price_cents: string;
  host_payout_cents: string;
  menu: string;
  description: string;
  chef_name: string;
  about_chef: string;
  parking_note: string;
  booking_cutoff_at: string;
  allows_couples: boolean;
  status: DinnerStatus;
}

function formatLALocalInput(d: Date): string {
  // Get the parts as LA local, formatted for <input type="datetime-local">
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Los_Angeles',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).formatToParts(d);
  const m: Record<string, string> = {};
  for (const p of parts) m[p.type] = p.value;
  // Intl can render hour as "24" at midnight; normalize to "00".
  const hour = m.hour === '24' ? '00' : m.hour;
  return `${m.year}-${m.month}-${m.day}T${hour}:${m.minute}`;
}

function defaultStartsAt(): string {
  // Today at 6:00 PM in LA local time.
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Los_Angeles',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(new Date());
  const m: Record<string, string> = {};
  for (const p of parts) m[p.type] = p.value;
  return `${m.year}-${m.month}-${m.day}T18:00`;
}

function initial(dinner?: Dinner): FormState {
  return {
    chapter_id: dinner ? String(dinner.chapter_id) : '',
    venue_id: dinner ? String(dinner.venue_id) : '',
    title: dinner?.title ?? '',
    starts_at: dinner ? formatLALocalInput(dinner.starts_at) : defaultStartsAt(),
    total_seats: dinner ? String(dinner.total_seats) : '8',
    price_cents: dinner ? String(dinner.price_cents) : '0',
    host_payout_cents: dinner?.host_payout_cents != null ? String(dinner.host_payout_cents) : '',
    menu: dinner?.menu ?? '',
    description: dinner?.description ?? '',
    chef_name: dinner?.chef_name ?? '',
    about_chef: dinner?.about_chef ?? '',
    parking_note: dinner?.parking_note ?? '',
    booking_cutoff_at: dinner?.booking_cutoff_at ? formatLALocalInput(dinner.booking_cutoff_at) : '',
    allows_couples: dinner?.allows_couples ?? true,
    status: dinner?.status ?? 'draft',
  };
}

export default function DinnerForm({
  dinner,
  chapters,
  venues,
}: {
  dinner?: Dinner;
  chapters: Chapter[];
  venues: Venue[];
}) {
  const router = useRouter();
  const [form, setForm] = useState<FormState>(() => initial(dinner));
  const [submitting, setSubmitting] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function setField<K extends keyof FormState>(k: K, v: FormState[K]) {
    setForm((f) => ({ ...f, [k]: v }));
  }

  function onVenueChange(idStr: string) {
    setForm((f) => {
      const next: FormState = { ...f, venue_id: idStr };
      const v = venues.find((x) => String(x.id) === idStr);
      if (v) {
        if (f.chef_name.trim() === '' && v.chef_name) next.chef_name = v.chef_name;
        if (f.about_chef.trim() === '' && v.about_chef) next.about_chef = v.about_chef;
      }
      return next;
    });
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    const body = {
      chapter_id: form.chapter_id ? parseInt(form.chapter_id, 10) : null,
      venue_id: form.venue_id ? parseInt(form.venue_id, 10) : null,
      title: form.title,
      starts_at: form.starts_at,
      total_seats: form.total_seats ? parseInt(form.total_seats, 10) : null,
      price_cents: form.price_cents ? parseInt(form.price_cents, 10) : null,
      host_payout_cents: form.host_payout_cents ? parseInt(form.host_payout_cents, 10) : null,
      menu: form.menu,
      description: form.description,
      chef_name: form.chef_name,
      about_chef: form.about_chef,
      parking_note: form.parking_note,
      booking_cutoff_at: form.booking_cutoff_at || null,
      allows_couples: form.allows_couples,
      status: form.status,
    };
    const url = dinner ? `/api/admin/dinners/${dinner.id}` : '/api/admin/dinners';
    const method = dinner ? 'PATCH' : 'POST';
    const res = await fetch(url, {
      method,
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(body),
    });
    if (!res.ok) {
      const j = await res.json().catch(() => ({}));
      setError(j.error ?? 'save_failed');
      setSubmitting(false);
      return;
    }
    setSubmitting(false);
    if (dinner) router.refresh();
    else {
      const j = await res.json();
      router.push(`/admin/dinners/${j.dinner.id}`);
    }
  }

  async function onDelete() {
    if (!dinner) return;
    if (!confirm('Delete this dinner? This will cascade-delete reservations.')) return;
    setDeleting(true);
    const res = await fetch(`/api/admin/dinners/${dinner.id}`, { method: 'DELETE' });
    if (!res.ok) {
      const j = await res.json().catch(() => ({}));
      setError(j.error ?? 'delete_failed');
      setDeleting(false);
      return;
    }
    router.push('/admin/dinners');
  }

  return (
    <form onSubmit={onSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-4 max-w-3xl">
      <label className="block">
        <span className="block text-sm mb-1">Chapter *</span>
        <select
          required
          value={form.chapter_id}
          onChange={(e) => setField('chapter_id', e.target.value)}
          className="w-full border border-neutral-300 rounded px-3 py-2 text-sm"
        >
          <option value="">Select chapter</option>
          {chapters.map((c) => (
            <option key={c.id} value={c.id}>{c.display_name}</option>
          ))}
        </select>
      </label>

      <label className="block">
        <span className="block text-sm mb-1">Venue *</span>
        <select
          required
          value={form.venue_id}
          onChange={(e) => onVenueChange(e.target.value)}
          className="w-full border border-neutral-300 rounded px-3 py-2 text-sm"
        >
          <option value="">Select venue</option>
          {venues.map((v) => (
            <option key={v.id} value={v.id}>{v.name} ({v.venue_type})</option>
          ))}
        </select>
      </label>

      <label className="block md:col-span-2">
        <span className="block text-sm mb-1">Title *</span>
        <input
          type="text"
          required
          value={form.title}
          onChange={(e) => setField('title', e.target.value)}
          className="w-full border border-neutral-300 rounded px-3 py-2 text-sm"
        />
      </label>

      <label className="block">
        <span className="block text-sm mb-1">Starts at (LA local) *</span>
        <input
          type="datetime-local"
          required
          value={form.starts_at}
          onChange={(e) => setField('starts_at', e.target.value)}
          className="w-full border border-neutral-300 rounded px-3 py-2 text-sm"
        />
      </label>

      <label className="block">
        <span className="block text-sm mb-1">Booking cutoff (LA local; optional)</span>
        <input
          type="datetime-local"
          value={form.booking_cutoff_at}
          onChange={(e) => setField('booking_cutoff_at', e.target.value)}
          className="w-full border border-neutral-300 rounded px-3 py-2 text-sm"
        />
      </label>

      <label className="block">
        <span className="block text-sm mb-1">Total seats *</span>
        <input
          type="number"
          required
          min={1}
          value={form.total_seats}
          onChange={(e) => setField('total_seats', e.target.value)}
          className="w-full border border-neutral-300 rounded px-3 py-2 text-sm"
        />
      </label>

      <label className="block">
        <span className="block text-sm mb-1">Price (cents) *</span>
        <input
          type="number"
          required
          min={0}
          value={form.price_cents}
          onChange={(e) => setField('price_cents', e.target.value)}
          className="w-full border border-neutral-300 rounded px-3 py-2 text-sm"
        />
      </label>

      <label className="block">
        <span className="block text-sm mb-1">Host payout (cents; optional)</span>
        <input
          type="number"
          min={0}
          value={form.host_payout_cents}
          onChange={(e) => setField('host_payout_cents', e.target.value)}
          className="w-full border border-neutral-300 rounded px-3 py-2 text-sm"
        />
      </label>

      <label className="block">
        <span className="block text-sm mb-1">Status</span>
        <select
          value={form.status}
          onChange={(e) => setField('status', e.target.value as DinnerStatus)}
          className="w-full border border-neutral-300 rounded px-3 py-2 text-sm"
        >
          {STATUSES.map((s) => (
            <option key={s} value={s}>{s}</option>
          ))}
        </select>
      </label>

      <label className="block md:col-span-2">
        <span className="block text-sm mb-1">Menu</span>
        <textarea
          rows={3}
          value={form.menu}
          onChange={(e) => setField('menu', e.target.value)}
          className="w-full border border-neutral-300 rounded px-3 py-2 text-sm"
        />
      </label>

      <label className="block md:col-span-2">
        <span className="block text-sm mb-1">Description</span>
        <textarea
          rows={3}
          value={form.description}
          onChange={(e) => setField('description', e.target.value)}
          className="w-full border border-neutral-300 rounded px-3 py-2 text-sm"
        />
      </label>

      <label className="block md:col-span-2">
        <span className="block text-sm mb-1">Chef name (override)</span>
        <input
          type="text"
          value={form.chef_name}
          onChange={(e) => setField('chef_name', e.target.value)}
          className="w-full border border-neutral-300 rounded px-3 py-2 text-sm"
        />
        <span className="block text-xs text-neutral-500 mt-1">
          Leave blank to use the venue default.
        </span>
      </label>

      <label className="block md:col-span-2">
        <span className="block text-sm mb-1">About the chef (override)</span>
        <textarea
          rows={3}
          value={form.about_chef}
          onChange={(e) => setField('about_chef', e.target.value)}
          className="w-full border border-neutral-300 rounded px-3 py-2 text-sm"
        />
        <span className="block text-xs text-neutral-500 mt-1">
          Leave blank to use the venue default.
        </span>
      </label>

      <label className="block md:col-span-2">
        <span className="block text-sm mb-1">Parking note</span>
        <textarea
          rows={2}
          value={form.parking_note}
          onChange={(e) => setField('parking_note', e.target.value)}
          className="w-full border border-neutral-300 rounded px-3 py-2 text-sm"
        />
      </label>

      <label className="flex items-center gap-2 text-sm md:col-span-2">
        <input
          type="checkbox"
          checked={form.allows_couples}
          onChange={(e) => setField('allows_couples', e.target.checked)}
        />
        Allows couples
      </label>

      {error ? <p className="text-sm text-red-600 md:col-span-2">{error}</p> : null}

      <div className="md:col-span-2 flex gap-3">
        <button
          type="submit"
          disabled={submitting}
          className="bg-neutral-900 text-white px-4 py-2 rounded text-sm disabled:opacity-50"
        >
          {submitting ? 'Saving…' : dinner ? 'Save' : 'Create dinner'}
        </button>
        {dinner ? (
          <button
            type="button"
            onClick={onDelete}
            disabled={deleting}
            className="border border-red-300 text-red-700 px-4 py-2 rounded text-sm disabled:opacity-50"
          >
            {deleting ? 'Deleting…' : 'Delete'}
          </button>
        ) : null}
      </div>
    </form>
  );
}
