'use client';

import Link from 'next/link';
import { useState } from 'react';
import { useRouter } from 'next/navigation';

interface Row {
  id: number;
  name: string;
  day: string;
  day_of_week: number;
  area: string;
  default_venue: string;
  default_address: string;
  status: 'forming' | 'active' | 'paused';
  active_members: number;
  seats_total: number;
}

const DAYS = [
  { v: 0, label: 'Sun' },
  { v: 1, label: 'Mon' },
  { v: 2, label: 'Tue' },
  { v: 3, label: 'Wed' },
  { v: 4, label: 'Thu' },
  { v: 5, label: 'Fri' },
  { v: 6, label: 'Sat' },
];

export default function TablesView({ rows }: { rows: Row[] }) {
  const router = useRouter();
  const [showForm, setShowForm] = useState(false);
  const [name, setName] = useState('');
  const [dayOfWeek, setDayOfWeek] = useState(2);
  const [area, setArea] = useState('');
  const [venue, setVenue] = useState('');
  const [address, setAddress] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<number | null>(null);

  async function createTable(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      const res = await fetch('/api/admin/lunchclub/tables', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          name: name.trim(),
          day_of_week: dayOfWeek,
          area: area.trim() || undefined,
          default_venue: venue.trim() || undefined,
          default_address: address.trim() || undefined,
        }),
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error(j.error ?? `HTTP ${res.status}`);
      }
      setName('');
      setArea('');
      setVenue('');
      setAddress('');
      setShowForm(false);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'failed');
    } finally {
      setSaving(false);
    }
  }

  async function updateStatus(id: number, status: 'forming' | 'active' | 'paused') {
    setBusyId(id);
    try {
      const res = await fetch(`/api/admin/lunchclub/tables/${id}`, {
        method: 'PATCH',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ status }),
      });
      if (!res.ok) throw new Error('failed');
      router.refresh();
    } catch {
      // no-op visible error; refresh on success only
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div>
      <div className="mb-4 flex items-center gap-3">
        <button
          type="button"
          onClick={() => setShowForm((v) => !v)}
          className="border border-neutral-300 px-3 py-1 rounded text-sm"
        >
          {showForm ? 'Cancel' : 'New standing table'}
        </button>
        <span className="text-xs text-neutral-500">{rows.length} table(s)</span>
      </div>

      {showForm ? (
        <form
          onSubmit={createTable}
          className="border border-neutral-200 rounded p-3 mb-4 grid grid-cols-1 md:grid-cols-2 gap-3"
        >
          <label className="block">
            <span className="block text-xs text-neutral-600 mb-1">Name</span>
            <input
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="border border-neutral-300 rounded px-2 py-1 text-sm w-full"
            />
          </label>
          <label className="block">
            <span className="block text-xs text-neutral-600 mb-1">Day of week</span>
            <select
              value={dayOfWeek}
              onChange={(e) => setDayOfWeek(Number(e.target.value))}
              className="border border-neutral-300 rounded px-2 py-1 text-sm w-full"
            >
              {DAYS.map((d) => (
                <option key={d.v} value={d.v}>
                  {d.label}
                </option>
              ))}
            </select>
          </label>
          <label className="block">
            <span className="block text-xs text-neutral-600 mb-1">Area (optional)</span>
            <input
              value={area}
              onChange={(e) => setArea(e.target.value)}
              className="border border-neutral-300 rounded px-2 py-1 text-sm w-full"
            />
          </label>
          <label className="block">
            <span className="block text-xs text-neutral-600 mb-1">Default venue (optional)</span>
            <input
              value={venue}
              onChange={(e) => setVenue(e.target.value)}
              className="border border-neutral-300 rounded px-2 py-1 text-sm w-full"
            />
          </label>
          <label className="block md:col-span-2">
            <span className="block text-xs text-neutral-600 mb-1">Default address (optional)</span>
            <input
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              className="border border-neutral-300 rounded px-2 py-1 text-sm w-full"
            />
          </label>
          <div className="md:col-span-2 flex items-center gap-3">
            <button
              type="submit"
              disabled={saving || !name.trim()}
              className="border border-neutral-300 px-3 py-1 rounded text-sm disabled:opacity-50"
            >
              {saving ? 'Saving…' : 'Create'}
            </button>
            {error ? <span className="text-xs text-red-700">Error: {error}</span> : null}
          </div>
        </form>
      ) : null}

      <div className="overflow-x-auto border border-neutral-200 rounded">
        <table className="w-full text-sm">
          <thead className="bg-neutral-50 border-b border-neutral-200">
            <tr>
              <th className="text-left px-3 py-2">Name</th>
              <th className="text-left px-3 py-2">Day</th>
              <th className="text-left px-3 py-2">Area</th>
              <th className="text-left px-3 py-2">Venue</th>
              <th className="text-left px-3 py-2">Members</th>
              <th className="text-left px-3 py-2">Status</th>
              <th className="text-right px-3 py-2"></th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-3 py-6 text-center text-neutral-500">
                  No standing tables yet.
                </td>
              </tr>
            ) : (
              rows.map((r) => (
                <tr key={r.id} className="border-b border-neutral-100 align-top">
                  <td className="px-3 py-2">
                    <div className="font-medium">{r.name}</div>
                  </td>
                  <td className="px-3 py-2">{r.day}</td>
                  <td className="px-3 py-2">{r.area || <span className="text-neutral-400">—</span>}</td>
                  <td className="px-3 py-2">
                    {r.default_venue || <span className="text-neutral-400">—</span>}
                    {r.default_address ? (
                      <div className="text-xs text-neutral-500">{r.default_address}</div>
                    ) : null}
                  </td>
                  <td className="px-3 py-2">
                    {r.active_members} active ({r.seats_total} seats)
                  </td>
                  <td className="px-3 py-2">
                    <select
                      value={r.status}
                      disabled={busyId === r.id}
                      onChange={(e) =>
                        updateStatus(r.id, e.target.value as 'forming' | 'active' | 'paused')
                      }
                      className="border border-neutral-300 rounded px-2 py-1 text-xs"
                    >
                      <option value="forming">forming</option>
                      <option value="active">active</option>
                      <option value="paused">paused</option>
                    </select>
                  </td>
                  <td className="px-3 py-2 text-right">
                    <Link
                      href={`/admin/lunchclub/tables/${r.id}`}
                      className="text-sm underline text-neutral-700"
                    >
                      Manage
                    </Link>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
