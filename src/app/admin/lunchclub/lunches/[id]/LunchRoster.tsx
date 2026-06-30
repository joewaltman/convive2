'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

interface RosterRow {
  id: number;
  name: string;
  email: string;
  phone: string;
  seats: number;
  status: 'invited' | 'checkout_pending' | 'paid' | 'cancelled' | 'refunded';
  magic_token: string;
  paid_at: string | null;
  invited_at: string;
  nudge_sent_at: string | null;
  reminder_sent_at: string | null;
}

interface LunchEditable {
  venue: string;
  address: string;
  lunch_date: string;
  start_time: string;
  price_cents: number;
  total_seats: number;
  menu: string;
  status: 'tentative' | 'confirmed' | 'cancelled' | 'completed';
}

export default function LunchRoster({
  lunchId,
  lunch,
  roster,
}: {
  lunchId: number;
  lunch: LunchEditable;
  roster: RosterRow[];
}) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [venue, setVenue] = useState(lunch.venue);
  const [address, setAddress] = useState(lunch.address);
  const [date, setDate] = useState(lunch.lunch_date);
  const [time, setTime] = useState(lunch.start_time);
  const [priceDollars, setPriceDollars] = useState((lunch.price_cents / 100).toString());
  const [totalSeats, setTotalSeats] = useState(lunch.total_seats);
  const [menu, setMenu] = useState(lunch.menu);
  const [saving, setSaving] = useState(false);
  const [actionMsg, setActionMsg] = useState<string | null>(null);
  const [actionBusy, setActionBusy] = useState<string | null>(null);

  async function saveEdit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setActionMsg(null);
    try {
      const priceCents = Math.round(Number(priceDollars) * 100);
      const res = await fetch(`/api/admin/lunchclub/lunches/${lunchId}`, {
        method: 'PATCH',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          venue: venue.trim(),
          address: address.trim(),
          lunch_date: date,
          start_time: time,
          price_cents: priceCents,
          total_seats: totalSeats,
          menu: menu.trim() ? menu : null,
        }),
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error(j.error ?? `HTTP ${res.status}`);
      }
      setEditing(false);
      router.refresh();
    } catch (err) {
      setActionMsg(err instanceof Error ? err.message : 'failed');
    } finally {
      setSaving(false);
    }
  }

  async function runAction(name: string, path: string, confirmMsg?: string) {
    if (confirmMsg && !confirm(confirmMsg)) return;
    setActionBusy(name);
    setActionMsg(null);
    try {
      const res = await fetch(path, { method: 'POST' });
      const j = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(j.error ?? `HTTP ${res.status}`);
      setActionMsg(`${name}: ${JSON.stringify(j)}`);
      router.refresh();
    } catch (err) {
      setActionMsg(`${name} failed: ${err instanceof Error ? err.message : 'error'}`);
    } finally {
      setActionBusy(null);
    }
  }

  return (
    <div>
      <div className="flex flex-wrap gap-2 mb-4">
        <button
          type="button"
          onClick={() => setEditing((v) => !v)}
          className="border border-neutral-300 px-3 py-1 rounded text-sm"
        >
          {editing ? 'Close editor' : 'Edit lunch'}
        </button>
        <button
          type="button"
          onClick={() =>
            runAction(
              'invite',
              `/api/admin/lunchclub/lunches/${lunchId}/invite`,
              'Send invites to active members without an existing booking?',
            )
          }
          disabled={actionBusy !== null}
          className="border border-neutral-300 px-3 py-1 rounded text-sm disabled:opacity-50"
        >
          {actionBusy === 'invite' ? 'Sending…' : 'Send invites'}
        </button>
        <button
          type="button"
          onClick={() =>
            runAction(
              'sync',
              `/api/admin/lunchclub/lunches/${lunchId}/sync-stripe`,
            )
          }
          disabled={actionBusy !== null}
          className="border border-neutral-300 px-3 py-1 rounded text-sm disabled:opacity-50"
        >
          {actionBusy === 'sync' ? 'Syncing…' : 'Sync from Stripe'}
        </button>
        <button
          type="button"
          onClick={() =>
            runAction(
              'cancel',
              `/api/admin/lunchclub/lunches/${lunchId}/cancel`,
              'Cancel this lunch and refund all paid bookings? This cannot be undone.',
            )
          }
          disabled={actionBusy !== null || lunch.status === 'cancelled'}
          className="border border-red-300 text-red-800 px-3 py-1 rounded text-sm disabled:opacity-50"
        >
          {actionBusy === 'cancel' ? 'Cancelling…' : 'Cancel lunch'}
        </button>
      </div>
      {actionMsg ? (
        <div className="mb-4 text-xs text-neutral-600 break-all">{actionMsg}</div>
      ) : null}

      {editing ? (
        <form
          onSubmit={saveEdit}
          className="border border-neutral-200 rounded p-3 mb-6 grid grid-cols-1 md:grid-cols-2 gap-3"
        >
          <label className="block">
            <span className="block text-xs text-neutral-600 mb-1">Date (LA)</span>
            <input
              type="date"
              required
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="border border-neutral-300 rounded px-2 py-1 text-sm w-full"
            />
          </label>
          <label className="block">
            <span className="block text-xs text-neutral-600 mb-1">Start time (LA)</span>
            <input
              type="time"
              required
              value={time}
              onChange={(e) => setTime(e.target.value)}
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
            <span className="block text-xs text-neutral-600 mb-1">Menu</span>
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
              disabled={saving}
              className="border border-neutral-300 px-3 py-1 rounded text-sm disabled:opacity-50"
            >
              {saving ? 'Saving…' : 'Save'}
            </button>
          </div>
        </form>
      ) : null}

      <h2 className="text-lg font-semibold mb-2">Roster ({roster.length})</h2>
      <div className="overflow-x-auto border border-neutral-200 rounded">
        <table className="w-full text-sm">
          <thead className="bg-neutral-50 border-b border-neutral-200">
            <tr>
              <th className="text-left px-3 py-2">Name</th>
              <th className="text-left px-3 py-2">Seats</th>
              <th className="text-left px-3 py-2">Status</th>
              <th className="text-left px-3 py-2">Invited</th>
              <th className="text-left px-3 py-2">Paid</th>
              <th className="text-left px-3 py-2">Notifications</th>
              <th className="text-left px-3 py-2">Link</th>
            </tr>
          </thead>
          <tbody>
            {roster.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-3 py-6 text-center text-neutral-500">
                  No bookings yet. Use Send invites.
                </td>
              </tr>
            ) : (
              roster.map((r) => (
                <tr key={r.id} className="border-b border-neutral-100 align-top">
                  <td className="px-3 py-2">
                    <div className="font-medium">{r.name}</div>
                    {r.email ? (
                      <div className="text-xs text-neutral-500">{r.email}</div>
                    ) : null}
                    {r.phone ? (
                      <div className="text-xs text-neutral-500">{r.phone}</div>
                    ) : null}
                  </td>
                  <td className="px-3 py-2">{r.seats}</td>
                  <td className="px-3 py-2">
                    <span className="text-xs uppercase tracking-wide">{r.status}</span>
                  </td>
                  <td className="px-3 py-2 text-xs text-neutral-600">
                    {new Date(r.invited_at).toLocaleString()}
                  </td>
                  <td className="px-3 py-2 text-xs text-neutral-600">
                    {r.paid_at ? new Date(r.paid_at).toLocaleString() : '—'}
                  </td>
                  <td className="px-3 py-2 text-xs text-neutral-600">
                    {r.nudge_sent_at ? (
                      <div>nudge: {new Date(r.nudge_sent_at).toLocaleDateString()}</div>
                    ) : null}
                    {r.reminder_sent_at ? (
                      <div>reminder: {new Date(r.reminder_sent_at).toLocaleDateString()}</div>
                    ) : null}
                    {!r.nudge_sent_at && !r.reminder_sent_at ? '—' : null}
                  </td>
                  <td className="px-3 py-2 text-xs font-mono break-all">
                    <a
                      href={`/lunchclub/book/${r.magic_token}`}
                      className="underline"
                      target="_blank"
                      rel="noreferrer"
                    >
                      open
                    </a>
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
