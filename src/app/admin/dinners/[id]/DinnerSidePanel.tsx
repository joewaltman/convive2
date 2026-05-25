'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

interface ReservationItem {
  id: number;
  guest_id: number;
  guest_email: string;
  guest_first_name: string;
  guest_last_name: string;
  status: string;
  seat_count: number;
  brings_partner: boolean;
  amount_paid_cents: number | null;
  created_at: string;
}

interface WaitlistItem {
  id: number;
  guest_id: number;
  guest_email: string;
  guest_first_name: string;
  guest_last_name: string;
  status: string;
  created_at: string;
}

export default function DinnerSidePanel({
  reservations,
  waitlist,
}: {
  reservations: ReservationItem[];
  waitlist: WaitlistItem[];
}) {
  const router = useRouter();
  const [busyId, setBusyId] = useState<number | null>(null);
  const [msg, setMsg] = useState<string | null>(null);

  async function cancel(id: number) {
    if (!confirm('Cancel this reservation?')) return;
    setBusyId(id);
    setMsg(null);
    const res = await fetch(`/api/admin/reservations/${id}/cancel`, { method: 'POST' });
    if (!res.ok) {
      const j = await res.json().catch(() => ({}));
      setMsg(`Cancel failed: ${j.error ?? res.status}`);
    } else {
      setMsg(`Reservation ${id} cancelled.`);
      router.refresh();
    }
    setBusyId(null);
  }

  async function resend(id: number) {
    setBusyId(id);
    setMsg(null);
    const res = await fetch(`/api/admin/reservations/${id}/resend-confirmation`, { method: 'POST' });
    if (!res.ok) {
      const j = await res.json().catch(() => ({}));
      setMsg(`Resend failed: ${j.error ?? res.status}`);
    } else {
      setMsg(`Confirmation resent for reservation ${id}.`);
    }
    setBusyId(null);
  }

  return (
    <div className="space-y-6">
      {msg ? <p className="text-xs text-green-700">{msg}</p> : null}
      <section>
        <h3 className="text-sm font-semibold mb-2">Reservations ({reservations.length})</h3>
        <div className="border border-neutral-200 rounded divide-y">
          {reservations.map((r) => (
            <div key={r.id} className="p-2 text-xs">
              <div className="font-medium">{r.guest_first_name} {r.guest_last_name}</div>
              <div className="text-neutral-500">{r.guest_email}</div>
              <div className="text-neutral-500">
                {r.status} · {r.seat_count} seat{r.seat_count > 1 ? 's' : ''}
                {r.brings_partner ? ' · +partner' : ''}
                {r.amount_paid_cents != null ? ` · $${(r.amount_paid_cents / 100).toFixed(2)}` : ''}
              </div>
              <div className="flex gap-2 mt-2">
                {r.status === 'confirmed' ? (
                  <>
                    <button
                      onClick={() => resend(r.id)}
                      disabled={busyId === r.id}
                      className="text-xs border border-neutral-300 px-2 py-1 rounded disabled:opacity-50"
                    >
                      Resend confirmation
                    </button>
                    <button
                      onClick={() => cancel(r.id)}
                      disabled={busyId === r.id}
                      className="text-xs border border-red-300 text-red-700 px-2 py-1 rounded disabled:opacity-50"
                    >
                      Cancel
                    </button>
                  </>
                ) : r.status === 'pending' ? (
                  <button
                    onClick={() => cancel(r.id)}
                    disabled={busyId === r.id}
                    className="text-xs border border-red-300 text-red-700 px-2 py-1 rounded disabled:opacity-50"
                  >
                    Cancel
                  </button>
                ) : null}
              </div>
            </div>
          ))}
          {reservations.length === 0 ? (
            <p className="p-2 text-xs text-neutral-500">No reservations yet.</p>
          ) : null}
        </div>
      </section>

      <section>
        <h3 className="text-sm font-semibold mb-2">Waitlist ({waitlist.length})</h3>
        <div className="border border-neutral-200 rounded divide-y">
          {waitlist.map((w) => (
            <div key={w.id} className="p-2 text-xs">
              <div className="font-medium">{w.guest_first_name} {w.guest_last_name}</div>
              <div className="text-neutral-500">{w.guest_email}</div>
              <div className="text-neutral-500">{w.status}</div>
            </div>
          ))}
          {waitlist.length === 0 ? (
            <p className="p-2 text-xs text-neutral-500">Empty.</p>
          ) : null}
        </div>
      </section>
    </div>
  );
}
