'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';

interface TableOption {
  id: number;
  name: string;
  default_venue: string;
  default_address: string;
}

export default function NewLunchForm({ tables }: { tables: TableOption[] }) {
  const router = useRouter();
  const [show, setShow] = useState(false);
  const [tableId, setTableId] = useState<string>('');
  const [venue, setVenue] = useState('');
  const [address, setAddress] = useState('');
  const [date, setDate] = useState('');
  const [time, setTime] = useState('12:00');
  const [priceDollars, setPriceDollars] = useState<string>('45');
  const [totalSeats, setTotalSeats] = useState<number>(6);
  const [menu, setMenu] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const selected = useMemo(
    () => tables.find((t) => String(t.id) === tableId) ?? null,
    [tableId, tables],
  );

  function onPickTable(v: string) {
    setTableId(v);
    const t = tables.find((x) => String(x.id) === v);
    if (t) {
      if (!venue) setVenue(t.default_venue);
      if (!address) setAddress(t.default_address);
    }
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const priceCents = Math.round(Number(priceDollars) * 100);
    if (!Number.isInteger(priceCents) || priceCents <= 0) {
      setError('invalid price');
      return;
    }
    setSaving(true);
    try {
      const res = await fetch('/api/admin/lunchclub/lunches', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          standing_table_id: Number(tableId),
          venue: venue.trim(),
          address: address.trim(),
          lunch_date: date,
          start_time: time,
          price_cents: priceCents,
          total_seats: totalSeats,
          menu: menu.trim() || undefined,
        }),
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error(j.error ?? `HTTP ${res.status}`);
      }
      setShow(false);
      setVenue('');
      setAddress('');
      setDate('');
      setMenu('');
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'failed');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="mb-4">
      <button
        type="button"
        onClick={() => setShow((v) => !v)}
        className="border border-neutral-300 px-3 py-1 rounded text-sm"
      >
        {show ? 'Cancel' : 'New lunch'}
      </button>
      {show ? (
        <form
          onSubmit={submit}
          className="border border-neutral-200 rounded p-3 mt-3 grid grid-cols-1 md:grid-cols-2 gap-3"
        >
          <label className="block">
            <span className="block text-xs text-neutral-600 mb-1">Table</span>
            <select
              required
              value={tableId}
              onChange={(e) => onPickTable(e.target.value)}
              className="border border-neutral-300 rounded px-2 py-1 text-sm w-full"
            >
              <option value="">— pick a table —</option>
              {tables.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name}
                </option>
              ))}
            </select>
            {selected?.default_venue ? (
              <div className="text-[10px] text-neutral-500 mt-1">
                default venue: {selected.default_venue}
              </div>
            ) : null}
          </label>
          <label className="block">
            <span className="block text-xs text-neutral-600 mb-1">Date (LA)</span>
            <input
              required
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="border border-neutral-300 rounded px-2 py-1 text-sm w-full"
            />
          </label>
          <label className="block">
            <span className="block text-xs text-neutral-600 mb-1">Start time (LA)</span>
            <input
              required
              type="time"
              value={time}
              onChange={(e) => setTime(e.target.value)}
              className="border border-neutral-300 rounded px-2 py-1 text-sm w-full"
            />
          </label>
          <label className="block">
            <span className="block text-xs text-neutral-600 mb-1">Price (USD per seat)</span>
            <input
              required
              inputMode="decimal"
              value={priceDollars}
              onChange={(e) => setPriceDollars(e.target.value)}
              className="border border-neutral-300 rounded px-2 py-1 text-sm w-full"
            />
          </label>
          <label className="block">
            <span className="block text-xs text-neutral-600 mb-1">Venue</span>
            <input
              required
              value={venue}
              onChange={(e) => setVenue(e.target.value)}
              className="border border-neutral-300 rounded px-2 py-1 text-sm w-full"
            />
          </label>
          <label className="block">
            <span className="block text-xs text-neutral-600 mb-1">Address</span>
            <input
              required
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              className="border border-neutral-300 rounded px-2 py-1 text-sm w-full"
            />
          </label>
          <label className="block">
            <span className="block text-xs text-neutral-600 mb-1">Total seats</span>
            <input
              type="number"
              min={1}
              value={totalSeats}
              onChange={(e) => setTotalSeats(Number(e.target.value) || 6)}
              className="border border-neutral-300 rounded px-2 py-1 text-sm w-full"
            />
          </label>
          <label className="block md:col-span-2">
            <span className="block text-xs text-neutral-600 mb-1">Menu (optional)</span>
            <textarea
              rows={3}
              value={menu}
              onChange={(e) => setMenu(e.target.value)}
              className="border border-neutral-300 rounded px-2 py-1 text-sm w-full"
            />
          </label>
          <div className="md:col-span-2 flex items-center gap-3">
            <button
              type="submit"
              disabled={saving || !tableId || !date}
              className="border border-neutral-300 px-3 py-1 rounded text-sm disabled:opacity-50"
            >
              {saving ? 'Saving…' : 'Create lunch'}
            </button>
            {error ? <span className="text-xs text-red-700">Error: {error}</span> : null}
          </div>
        </form>
      ) : null}
    </div>
  );
}
