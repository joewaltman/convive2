'use client';

import { useEffect, useState, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import type { Venue, VenueType } from '@/lib/types';
import { VenuePhotoField } from './VenuePhotoField';

interface VenueFormState {
  name: string;
  venue_type: VenueType;
  host_guest_id: string;
  host_guest_email_query: string;
  address: string;
  neighborhood: string;
  city: string;
  google_maps_link: string;
  capacity_min: string;
  capacity_max: string;
  description: string;
  photo_url: string;
  is_public: boolean;
  is_active: boolean;
}

function initial(venue?: Venue): VenueFormState {
  return {
    name: venue?.name ?? '',
    venue_type: venue?.venue_type ?? 'restaurant',
    host_guest_id: venue?.host_guest_id != null ? String(venue.host_guest_id) : '',
    host_guest_email_query: '',
    address: venue?.address ?? '',
    neighborhood: venue?.neighborhood ?? '',
    city: venue?.city ?? '',
    google_maps_link: venue?.google_maps_link ?? '',
    capacity_min: String(venue?.capacity_min ?? 6),
    capacity_max: String(venue?.capacity_max ?? 12),
    description: venue?.description ?? '',
    photo_url: venue?.photo_url ?? '',
    is_public: venue?.is_public ?? true,
    is_active: venue?.is_active ?? true,
  };
}

interface GuestSearchResult {
  id: number;
  email: string;
  first_name: string;
  last_name: string;
}

export default function VenueForm({ venue }: { venue?: Venue }) {
  const router = useRouter();
  const [form, setForm] = useState<VenueFormState>(() => initial(venue));
  const [submitting, setSubmitting] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [guestResults, setGuestResults] = useState<GuestSearchResult[]>([]);
  const [searching, setSearching] = useState(false);

  function setField<K extends keyof VenueFormState>(k: K, v: VenueFormState[K]) {
    setForm((f) => ({ ...f, [k]: v }));
  }

  useEffect(() => {
    const q = form.host_guest_email_query.trim();
    if (q.length < 2) {
      setGuestResults([]);
      return;
    }
    let cancelled = false;
    setSearching(true);
    const t = setTimeout(async () => {
      try {
        const res = await fetch(`/api/admin/guests?q=${encodeURIComponent(q)}`);
        const j = await res.json();
        if (!cancelled) setGuestResults(j.guests ?? []);
      } catch {
        if (!cancelled) setGuestResults([]);
      } finally {
        if (!cancelled) setSearching(false);
      }
    }, 300);
    return () => {
      cancelled = true;
      clearTimeout(t);
    };
  }, [form.host_guest_email_query]);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    const body = {
      name: form.name,
      venue_type: form.venue_type,
      host_guest_id: form.host_guest_id ? parseInt(form.host_guest_id, 10) : null,
      address: form.address,
      neighborhood: form.neighborhood,
      city: form.city,
      google_maps_link: form.google_maps_link,
      capacity_min: form.capacity_min ? parseInt(form.capacity_min, 10) : 6,
      capacity_max: form.capacity_max ? parseInt(form.capacity_max, 10) : 12,
      description: form.description,
      photo_url: form.photo_url,
      is_public: form.is_public,
      is_active: form.is_active,
    };
    const url = venue ? `/api/admin/venues/${venue.id}` : '/api/admin/venues';
    const method = venue ? 'PATCH' : 'POST';
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
    if (venue) router.refresh();
    else router.push('/admin/venues');
  }

  async function onDelete() {
    if (!venue) return;
    if (!confirm('Delete this venue?')) return;
    setDeleting(true);
    const res = await fetch(`/api/admin/venues/${venue.id}`, { method: 'DELETE' });
    if (!res.ok) {
      const j = await res.json().catch(() => ({}));
      setError(j.error ?? 'delete_failed');
      setDeleting(false);
      return;
    }
    router.push('/admin/venues');
  }

  return (
    <form onSubmit={onSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-4 max-w-3xl">
      <Text label="Name" value={form.name} onChange={(v) => setField('name', v)} required />
      <label className="block">
        <span className="block text-sm mb-1">Venue type *</span>
        <select
          value={form.venue_type}
          onChange={(e) => setField('venue_type', e.target.value as VenueType)}
          className="w-full border border-neutral-300 rounded px-3 py-2 text-sm"
        >
          <option value="restaurant">restaurant</option>
          <option value="event_space">event_space</option>
          <option value="home">home</option>
        </select>
      </label>

      {form.venue_type === 'home' ? (
        <div className="md:col-span-2 border border-neutral-200 rounded p-3 bg-neutral-50">
          <span className="block text-sm font-medium mb-2">Host guest</span>
          <div className="flex flex-col gap-2 md:flex-row md:items-center">
            <input
              type="text"
              placeholder="Search guests by email"
              value={form.host_guest_email_query}
              onChange={(e) => setField('host_guest_email_query', e.target.value)}
              className="flex-1 border border-neutral-300 rounded px-3 py-2 text-sm"
            />
            <input
              type="number"
              placeholder="Guest ID"
              value={form.host_guest_id}
              onChange={(e) => setField('host_guest_id', e.target.value)}
              className="w-32 border border-neutral-300 rounded px-3 py-2 text-sm"
            />
          </div>
          {searching ? <p className="text-xs text-neutral-500 mt-2">Searching…</p> : null}
          {guestResults.length > 0 ? (
            <ul className="mt-2 border border-neutral-200 rounded bg-white max-h-40 overflow-y-auto">
              {guestResults.map((g) => (
                <li key={g.id}>
                  <button
                    type="button"
                    onClick={() => {
                      setField('host_guest_id', String(g.id));
                      setField('host_guest_email_query', g.email);
                      setGuestResults([]);
                    }}
                    className="w-full text-left text-sm px-3 py-2 hover:bg-neutral-100"
                  >
                    {g.first_name} {g.last_name} ({g.email}) — id {g.id}
                  </button>
                </li>
              ))}
            </ul>
          ) : null}
        </div>
      ) : null}

      <Text label="Address" value={form.address} onChange={(v) => setField('address', v)} />
      <Text label="Neighborhood" value={form.neighborhood} onChange={(v) => setField('neighborhood', v)} />
      <Text label="City" value={form.city} onChange={(v) => setField('city', v)} />
      <Text label="Google Maps link" value={form.google_maps_link} onChange={(v) => setField('google_maps_link', v)} />
      <Text label="Capacity min" value={form.capacity_min} onChange={(v) => setField('capacity_min', v)} />
      <Text label="Capacity max" value={form.capacity_max} onChange={(v) => setField('capacity_max', v)} />
      <div className="md:col-span-2">
        <VenuePhotoField value={form.photo_url} onChange={(v) => setField('photo_url', v)} />
      </div>
      <label className="block md:col-span-2">
        <span className="block text-sm mb-1">Description</span>
        <textarea
          value={form.description}
          onChange={(e) => setField('description', e.target.value)}
          rows={3}
          className="w-full border border-neutral-300 rounded px-3 py-2 text-sm"
        />
      </label>
      <label className="flex items-center gap-2 text-sm">
        <input type="checkbox" checked={form.is_public} onChange={(e) => setField('is_public', e.target.checked)} />
        Public
      </label>
      <label className="flex items-center gap-2 text-sm">
        <input type="checkbox" checked={form.is_active} onChange={(e) => setField('is_active', e.target.checked)} />
        Active
      </label>

      {error ? <p className="text-sm text-red-600 md:col-span-2">{error}</p> : null}

      <div className="md:col-span-2 flex gap-3">
        <button
          type="submit"
          disabled={submitting}
          className="bg-neutral-900 text-white px-4 py-2 rounded text-sm disabled:opacity-50"
        >
          {submitting ? 'Saving…' : venue ? 'Save' : 'Create venue'}
        </button>
        {venue ? (
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

function Text({
  label,
  value,
  onChange,
  required,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  required?: boolean;
}) {
  return (
    <label className="block">
      <span className="block text-sm mb-1">{label}{required ? ' *' : ''}</span>
      <input
        type="text"
        required={required}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full border border-neutral-300 rounded px-3 py-2 text-sm"
      />
    </label>
  );
}
