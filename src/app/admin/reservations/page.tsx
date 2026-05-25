import Link from 'next/link';
import { requireSuperAdmin } from '@/lib/auth/admin';
import { query } from '@/lib/db';
import { formatLAClock } from '@/lib/time';
import type { ReservationStatus } from '@/lib/types';

const STATUSES: ReservationStatus[] = ['pending', 'confirmed', 'cancelled'];

interface ReservationRow {
  id: number;
  guest_id: number;
  guest_email: string;
  guest_first_name: string;
  guest_last_name: string;
  status: string;
  seat_count: number;
  amount_paid_cents: number | null;
  created_at: Date;
  dinner_id: number;
  dinner_title: string;
  dinner_starts_at: Date;
  chapter_short_name: string;
}

async function listReservations(filters: {
  dinnerId: number | null;
  status: ReservationStatus | null;
  email: string | null;
}): Promise<ReservationRow[]> {
  const params: unknown[] = [];
  const conds: string[] = [];
  if (filters.dinnerId) {
    params.push(filters.dinnerId);
    conds.push(`r.dinner_id = $${params.length}`);
  }
  if (filters.status) {
    params.push(filters.status);
    conds.push(`r.status = $${params.length}`);
  }
  if (filters.email) {
    params.push(`%${filters.email.toLowerCase()}%`);
    conds.push(`LOWER(g.email) LIKE $${params.length}`);
  }
  const where = conds.length > 0 ? `WHERE ${conds.join(' AND ')}` : '';
  return query<ReservationRow>(
    `SELECT r.id, r.guest_id, g.email AS guest_email, g.first_name AS guest_first_name,
            g.last_name AS guest_last_name, r.status, r.seat_count, r.amount_paid_cents,
            r.created_at, r.dinner_id, d.title AS dinner_title, d.starts_at AS dinner_starts_at,
            c.short_name AS chapter_short_name
     FROM reservations r
     JOIN guests g ON g.id = r.guest_id
     JOIN dinners d ON d.id = r.dinner_id
     JOIN chapters c ON c.id = r.chapter_id
     ${where}
     ORDER BY r.created_at DESC
     LIMIT 500`,
    params,
  );
}

export default async function ReservationsPage({
  searchParams,
}: {
  searchParams: Promise<{ dinner_id?: string; status?: string; email?: string }>;
}) {
  await requireSuperAdmin();
  const sp = await searchParams;
  const dinnerIdNum = sp.dinner_id ? parseInt(sp.dinner_id, 10) : null;
  const statusVal =
    sp.status && STATUSES.includes(sp.status as ReservationStatus)
      ? (sp.status as ReservationStatus)
      : null;
  const emailVal = sp.email && sp.email.trim() ? sp.email.trim() : null;
  const rows = await listReservations({
    dinnerId: Number.isFinite(dinnerIdNum) ? dinnerIdNum : null,
    status: statusVal,
    email: emailVal,
  });

  return (
    <div>
      <h1 className="text-2xl font-semibold mb-4">Reservations</h1>
      <form method="get" className="flex flex-wrap gap-3 items-end mb-4">
        <label className="block">
          <span className="block text-xs text-neutral-600 mb-1">Dinner ID</span>
          <input
            type="number"
            name="dinner_id"
            defaultValue={sp.dinner_id ?? ''}
            className="border border-neutral-300 rounded px-2 py-1 text-sm w-32"
          />
        </label>
        <label className="block">
          <span className="block text-xs text-neutral-600 mb-1">Status</span>
          <select
            name="status"
            defaultValue={sp.status ?? ''}
            className="border border-neutral-300 rounded px-2 py-1 text-sm"
          >
            <option value="">All</option>
            {STATUSES.map((s) => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
        </label>
        <label className="block">
          <span className="block text-xs text-neutral-600 mb-1">Email contains</span>
          <input
            type="text"
            name="email"
            defaultValue={sp.email ?? ''}
            className="border border-neutral-300 rounded px-2 py-1 text-sm"
          />
        </label>
        <button type="submit" className="border border-neutral-300 px-3 py-1 rounded text-sm">
          Filter
        </button>
      </form>

      <div className="overflow-x-auto border border-neutral-200 rounded">
        <table className="w-full text-sm">
          <thead className="bg-neutral-50 border-b border-neutral-200">
            <tr>
              <th className="text-left px-3 py-2">ID</th>
              <th className="text-left px-3 py-2">Guest</th>
              <th className="text-left px-3 py-2">Dinner</th>
              <th className="text-left px-3 py-2">Chapter</th>
              <th className="text-left px-3 py-2">Status</th>
              <th className="text-left px-3 py-2">Seats</th>
              <th className="text-left px-3 py-2">Paid</th>
              <th className="text-left px-3 py-2">Created</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id} className="border-b border-neutral-100">
                <td className="px-3 py-2">{r.id}</td>
                <td className="px-3 py-2">
                  <Link href={`/admin/guests/${r.guest_id}`} className="hover:underline">
                    {r.guest_first_name} {r.guest_last_name}
                    <div className="text-xs text-neutral-500">{r.guest_email}</div>
                  </Link>
                </td>
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
            {rows.length === 0 ? (
              <tr>
                <td className="px-3 py-4 text-neutral-500" colSpan={8}>
                  No reservations match these filters.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </div>
  );
}
