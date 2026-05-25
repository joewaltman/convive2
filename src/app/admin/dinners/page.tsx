import Link from 'next/link';
import { requireSuperAdmin } from '@/lib/auth/admin';
import { query } from '@/lib/db';
import { listAllChapters } from '@/lib/chapters';
import { formatLAClock } from '@/lib/time';
import type { Dinner, DinnerStatus } from '@/lib/types';

interface DinnerRow extends Dinner {
  chapter_short_name: string;
  chapter_display_name: string;
  venue_name: string;
  seats_used: string | null;
  waitlist_count: string | null;
}

const STATUSES: DinnerStatus[] = ['draft', 'published', 'sold_out', 'cancelled', 'completed'];

async function listDinners(
  chapterId: number | null,
  status: DinnerStatus | null,
): Promise<DinnerRow[]> {
  const params: unknown[] = [];
  const conds: string[] = [];
  if (chapterId) {
    params.push(chapterId);
    conds.push(`d.chapter_id = $${params.length}`);
  }
  if (status) {
    params.push(status);
    conds.push(`d.status = $${params.length}`);
  }
  const where = conds.length > 0 ? `WHERE ${conds.join(' AND ')}` : '';
  return query<DinnerRow>(
    `SELECT d.id, d.chapter_id, d.venue_id, d.title, d.starts_at, d.total_seats, d.price_cents,
            d.host_payout_cents, d.menu, d.description, d.parking_note, d.booking_cutoff_at,
            d.allows_couples, d.status, d.created_at, d.updated_at,
            c.short_name AS chapter_short_name, c.display_name AS chapter_display_name,
            v.name AS venue_name,
            COALESCE((SELECT SUM(seat_count) FROM reservations r
              WHERE r.dinner_id = d.id
                AND (r.status = 'confirmed'
                     OR (r.status = 'pending' AND r.pending_expires_at > NOW()))), 0)::text AS seats_used,
            COALESCE((SELECT COUNT(*) FROM waitlist_entries we
              WHERE we.dinner_id = d.id AND we.status IN ('pending','promoted')), 0)::text AS waitlist_count
     FROM dinners d
     JOIN chapters c ON c.id = d.chapter_id
     JOIN venues v ON v.id = d.venue_id
     ${where}
     ORDER BY d.starts_at DESC`,
    params,
  );
}

export default async function DinnersPage({
  searchParams,
}: {
  searchParams: Promise<{ chapter?: string; status?: string }>;
}) {
  await requireSuperAdmin();
  const sp = await searchParams;
  const chapterId = sp.chapter ? parseInt(sp.chapter, 10) : null;
  const status = sp.status && STATUSES.includes(sp.status as DinnerStatus) ? (sp.status as DinnerStatus) : null;
  const [dinners, chapters] = await Promise.all([
    listDinners(Number.isFinite(chapterId) ? chapterId : null, status),
    listAllChapters(),
  ]);

  // Group by chapter
  const byChapter = new Map<number, DinnerRow[]>();
  for (const d of dinners) {
    const arr = byChapter.get(d.chapter_id) ?? [];
    arr.push(d);
    byChapter.set(d.chapter_id, arr);
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-2xl font-semibold">Dinners</h1>
        <Link
          href="/admin/dinners/new"
          className="bg-neutral-900 text-white px-3 py-2 rounded text-sm"
        >
          New dinner
        </Link>
      </div>

      <form className="flex flex-wrap gap-3 mb-4 items-end" method="get">
        <label className="block">
          <span className="block text-xs text-neutral-600 mb-1">Chapter</span>
          <select
            name="chapter"
            defaultValue={sp.chapter ?? ''}
            className="border border-neutral-300 rounded px-2 py-1 text-sm"
          >
            <option value="">All</option>
            {chapters.map((c) => (
              <option key={c.id} value={c.id}>{c.display_name}</option>
            ))}
          </select>
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
        <button type="submit" className="border border-neutral-300 px-3 py-1 rounded text-sm">
          Filter
        </button>
      </form>

      {byChapter.size === 0 ? (
        <p className="text-neutral-500 text-sm">No dinners found.</p>
      ) : null}

      {Array.from(byChapter.entries()).map(([chapterId, list]) => (
        <section key={chapterId} className="mb-8">
          <h2 className="text-lg font-semibold mb-2">{list[0].chapter_display_name}</h2>
          <div className="overflow-x-auto border border-neutral-200 rounded">
            <table className="w-full text-sm">
              <thead className="bg-neutral-50 border-b border-neutral-200">
                <tr>
                  <th className="text-left px-3 py-2">When</th>
                  <th className="text-left px-3 py-2">Title</th>
                  <th className="text-left px-3 py-2">Venue</th>
                  <th className="text-left px-3 py-2">Seats</th>
                  <th className="text-left px-3 py-2">Waitlist</th>
                  <th className="text-left px-3 py-2">Status</th>
                  <th className="text-left px-3 py-2">Price</th>
                </tr>
              </thead>
              <tbody>
                {list.map((d) => (
                  <tr key={d.id} className="border-b border-neutral-100">
                    <td className="px-3 py-2 whitespace-nowrap">{formatLAClock(d.starts_at)}</td>
                    <td className="px-3 py-2">
                      <Link href={`/admin/dinners/${d.id}`} className="text-blue-700 hover:underline">
                        {d.title}
                      </Link>
                    </td>
                    <td className="px-3 py-2">{d.venue_name}</td>
                    <td className="px-3 py-2">
                      {parseInt(d.seats_used ?? '0', 10)} / {d.total_seats}
                    </td>
                    <td className="px-3 py-2">{parseInt(d.waitlist_count ?? '0', 10)}</td>
                    <td className="px-3 py-2">{d.status}</td>
                    <td className="px-3 py-2">${(d.price_cents / 100).toFixed(2)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      ))}
    </div>
  );
}
