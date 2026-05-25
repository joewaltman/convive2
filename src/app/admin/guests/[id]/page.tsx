import Link from 'next/link';
import { notFound } from 'next/navigation';
import { requireSuperAdmin } from '@/lib/auth/admin';
import { getGuestById } from '@/lib/guests';
import { query } from '@/lib/db';
import { formatLAClock } from '@/lib/time';

interface GuestReservationRow {
  id: number;
  status: string;
  seat_count: number;
  amount_paid_cents: number | null;
  created_at: Date;
  dinner_id: number;
  dinner_title: string;
  dinner_starts_at: Date;
  chapter_short_name: string;
}

export default async function GuestProfilePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireSuperAdmin();
  const { id } = await params;
  const n = parseInt(id, 10);
  if (!Number.isFinite(n)) notFound();
  const guest = await getGuestById(n);
  if (!guest) notFound();
  const history = await query<GuestReservationRow>(
    `SELECT r.id, r.status, r.seat_count, r.amount_paid_cents, r.created_at,
            r.dinner_id, d.title AS dinner_title, d.starts_at AS dinner_starts_at,
            c.short_name AS chapter_short_name
     FROM reservations r
     JOIN dinners d ON d.id = r.dinner_id
     JOIN chapters c ON c.id = r.chapter_id
     WHERE r.guest_id = $1
     ORDER BY r.created_at DESC`,
    [n],
  );

  return (
    <div>
      <h1 className="text-2xl font-semibold mb-2">
        {guest.first_name} {guest.last_name}
      </h1>
      <p className="text-sm text-neutral-600 mb-4">{guest.email}</p>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8 max-w-2xl">
        <Field label="Guest ID" value={String(guest.id)} />
        <Field label="Created" value={formatLAClock(guest.created_at)} />
        <Field
          label="Unsubscribed"
          value={guest.email_unsubscribed_at ? formatLAClock(guest.email_unsubscribed_at) : 'no'}
        />
        <Field label="What they do" value={guest.what_do_you_do ?? '—'} />
        <Field
          label="Dietary restrictions"
          value={guest.dietary_restrictions.length > 0 ? guest.dietary_restrictions.join(', ') : '—'}
        />
        <Field label="Dietary notes" value={guest.dietary_notes ?? '—'} />
      </div>

      <h2 className="text-lg font-semibold mb-3">Reservation history</h2>
      <div className="overflow-x-auto border border-neutral-200 rounded">
        <table className="w-full text-sm">
          <thead className="bg-neutral-50 border-b border-neutral-200">
            <tr>
              <th className="text-left px-3 py-2">ID</th>
              <th className="text-left px-3 py-2">Dinner</th>
              <th className="text-left px-3 py-2">Chapter</th>
              <th className="text-left px-3 py-2">Status</th>
              <th className="text-left px-3 py-2">Seats</th>
              <th className="text-left px-3 py-2">Paid</th>
              <th className="text-left px-3 py-2">Booked</th>
            </tr>
          </thead>
          <tbody>
            {history.map((r) => (
              <tr key={r.id} className="border-b border-neutral-100">
                <td className="px-3 py-2">{r.id}</td>
                <td className="px-3 py-2">
                  <Link href={`/admin/dinners/${r.dinner_id}`} className="hover:underline">
                    {r.dinner_title}
                  </Link>
                  <div className="text-xs text-neutral-500">{formatLAClock(r.dinner_starts_at)}</div>
                </td>
                <td className="px-3 py-2">{r.chapter_short_name}</td>
                <td className="px-3 py-2">{r.status}</td>
                <td className="px-3 py-2">{r.seat_count}</td>
                <td className="px-3 py-2">
                  {r.amount_paid_cents != null ? `$${(r.amount_paid_cents / 100).toFixed(2)}` : '—'}
                </td>
                <td className="px-3 py-2 whitespace-nowrap">{formatLAClock(r.created_at)}</td>
              </tr>
            ))}
            {history.length === 0 ? (
              <tr>
                <td className="px-3 py-4 text-neutral-500" colSpan={7}>
                  No reservations yet.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div className="border border-neutral-200 rounded p-3">
      <div className="text-xs text-neutral-500 uppercase tracking-wide">{label}</div>
      <div className="text-sm mt-1">{value}</div>
    </div>
  );
}
