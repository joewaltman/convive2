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

interface SurveyItem {
  id: number;
  reservation_id: number;
  guest_first_name: string;
  guest_last_name: string;
  venue_rating: number;
  food_rating: number;
  value_rating: number;
  feedback: string | null;
  submitted_at: string;
}

function avg(nums: number[]): string {
  if (nums.length === 0) return '—';
  const m = nums.reduce((a, b) => a + b, 0) / nums.length;
  return m.toFixed(1);
}

export default function DinnerSidePanel({
  reservations,
  waitlist,
  surveys,
}: {
  reservations: ReservationItem[];
  waitlist: WaitlistItem[];
  surveys: SurveyItem[];
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

      <section>
        <h3 className="text-sm font-semibold mb-2">Survey responses ({surveys.length})</h3>
        {surveys.length > 0 ? (
          <div className="border border-neutral-200 rounded divide-y">
            <div className="p-2 text-xs bg-neutral-50">
              <div className="font-medium">Averages</div>
              <div className="text-neutral-600">
                Venue {avg(surveys.map((s) => s.venue_rating))} ·{' '}
                Food {avg(surveys.map((s) => s.food_rating))} ·{' '}
                Value {avg(surveys.map((s) => s.value_rating))}
              </div>
            </div>
            {surveys.map((s) => (
              <div key={s.id} className="p-2 text-xs">
                <div className="font-medium">{s.guest_first_name} {s.guest_last_name}</div>
                <div className="text-neutral-500">
                  Venue {s.venue_rating} · Food {s.food_rating} · Value {s.value_rating}
                </div>
                {s.feedback ? (
                  <p className="mt-1 text-neutral-700 whitespace-pre-wrap">{s.feedback}</p>
                ) : null}
                <div className="text-neutral-400 mt-1">
                  {new Date(s.submitted_at).toLocaleString()}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="p-2 text-xs text-neutral-500 border border-neutral-200 rounded">
            No responses yet.
          </p>
        )}
      </section>
    </div>
  );
}
