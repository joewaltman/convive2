'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

interface MemberRow {
  id: number;
  signup_id: number;
  name: string;
  email: string;
  phone: string;
  seats: number;
  status: 'active' | 'released';
  consecutive_unpaid: number;
  joined_at: string;
}

interface UnseatedOption {
  id: number;
  label: string;
}

export default function TableMembers({
  tableId,
  members,
  unseated,
}: {
  tableId: number;
  members: MemberRow[];
  unseated: UnseatedOption[];
}) {
  const router = useRouter();
  const [seatSignupId, setSeatSignupId] = useState<string>('');
  const [seatCount, setSeatCount] = useState<1 | 2>(1);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busyMemberId, setBusyMemberId] = useState<number | null>(null);

  async function seatSignup(e: React.FormEvent) {
    e.preventDefault();
    if (!seatSignupId) return;
    setSaving(true);
    setError(null);
    try {
      const res = await fetch(`/api/admin/lunchclub/tables/${tableId}/members`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ signup_id: Number(seatSignupId), seats: seatCount }),
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error(j.error ?? `HTTP ${res.status}`);
      }
      setSeatSignupId('');
      setSeatCount(1);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'failed');
    } finally {
      setSaving(false);
    }
  }

  async function releaseMember(memberId: number) {
    if (!confirm('Release this member from the table?')) return;
    setBusyMemberId(memberId);
    try {
      const res = await fetch(
        `/api/admin/lunchclub/tables/${tableId}/members/${memberId}`,
        {
          method: 'PATCH',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ status: 'released' }),
        },
      );
      if (!res.ok) throw new Error('failed');
      router.refresh();
    } catch {
      // swallow; the UI stays as-is on failure
    } finally {
      setBusyMemberId(null);
    }
  }

  const active = members.filter((m) => m.status === 'active');
  const released = members.filter((m) => m.status === 'released');

  return (
    <div>
      <h2 className="text-lg font-semibold mb-2">Seat a signup at this table</h2>
      <form
        onSubmit={seatSignup}
        className="border border-neutral-200 rounded p-3 mb-6 flex flex-wrap items-end gap-3"
      >
        <label className="block">
          <span className="block text-xs text-neutral-600 mb-1">Signup</span>
          <select
            value={seatSignupId}
            onChange={(e) => setSeatSignupId(e.target.value)}
            className="border border-neutral-300 rounded px-2 py-1 text-sm min-w-[260px]"
          >
            <option value="">— pick a signup —</option>
            {unseated.map((u) => (
              <option key={u.id} value={u.id}>
                {u.label}
              </option>
            ))}
          </select>
        </label>
        <label className="block">
          <span className="block text-xs text-neutral-600 mb-1">Seats</span>
          <select
            value={seatCount}
            onChange={(e) => setSeatCount(Number(e.target.value) === 2 ? 2 : 1)}
            className="border border-neutral-300 rounded px-2 py-1 text-sm"
          >
            <option value={1}>1</option>
            <option value={2}>2</option>
          </select>
        </label>
        <button
          type="submit"
          disabled={saving || !seatSignupId}
          className="border border-neutral-300 px-3 py-1 rounded text-sm disabled:opacity-50"
        >
          {saving ? 'Saving…' : 'Seat'}
        </button>
        {error ? <span className="text-xs text-red-700">Error: {error}</span> : null}
      </form>

      <h2 className="text-lg font-semibold mb-2">Active members ({active.length})</h2>
      <div className="overflow-x-auto border border-neutral-200 rounded mb-6">
        <table className="w-full text-sm">
          <thead className="bg-neutral-50 border-b border-neutral-200">
            <tr>
              <th className="text-left px-3 py-2">Name</th>
              <th className="text-left px-3 py-2">Seats</th>
              <th className="text-left px-3 py-2">Unpaid streak</th>
              <th className="text-left px-3 py-2">Joined</th>
              <th className="text-right px-3 py-2"></th>
            </tr>
          </thead>
          <tbody>
            {active.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-3 py-6 text-center text-neutral-500">
                  No active members yet.
                </td>
              </tr>
            ) : (
              active.map((m) => (
                <tr key={m.id} className="border-b border-neutral-100 align-top">
                  <td className="px-3 py-2">
                    <div className="font-medium">{m.name}</div>
                    {m.email ? (
                      <div className="text-xs text-neutral-500">{m.email}</div>
                    ) : null}
                    {m.phone ? (
                      <div className="text-xs text-neutral-500">{m.phone}</div>
                    ) : null}
                  </td>
                  <td className="px-3 py-2">{m.seats}</td>
                  <td className="px-3 py-2">
                    {m.consecutive_unpaid >= 2 ? (
                      <span className="inline-block bg-yellow-100 text-yellow-900 border border-yellow-300 rounded px-1 text-xs">
                        {m.consecutive_unpaid} · needs check-in
                      </span>
                    ) : (
                      <span className="text-xs text-neutral-600">{m.consecutive_unpaid}</span>
                    )}
                  </td>
                  <td className="px-3 py-2 text-xs text-neutral-600">
                    {new Date(m.joined_at).toLocaleDateString()}
                  </td>
                  <td className="px-3 py-2 text-right">
                    <button
                      type="button"
                      onClick={() => releaseMember(m.id)}
                      disabled={busyMemberId === m.id}
                      className="border border-neutral-300 px-2 py-1 rounded text-xs disabled:opacity-50"
                    >
                      {busyMemberId === m.id ? 'Releasing…' : 'Release'}
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {released.length > 0 ? (
        <>
          <h2 className="text-lg font-semibold mb-2">Released ({released.length})</h2>
          <div className="overflow-x-auto border border-neutral-200 rounded">
            <table className="w-full text-sm">
              <thead className="bg-neutral-50 border-b border-neutral-200">
                <tr>
                  <th className="text-left px-3 py-2">Name</th>
                  <th className="text-left px-3 py-2">Seats</th>
                  <th className="text-left px-3 py-2">Joined</th>
                </tr>
              </thead>
              <tbody>
                {released.map((m) => (
                  <tr key={m.id} className="border-b border-neutral-100">
                    <td className="px-3 py-2">
                      <div className="font-medium text-neutral-600">{m.name}</div>
                    </td>
                    <td className="px-3 py-2 text-neutral-600">{m.seats}</td>
                    <td className="px-3 py-2 text-xs text-neutral-500">
                      {new Date(m.joined_at).toLocaleDateString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      ) : null}
    </div>
  );
}
