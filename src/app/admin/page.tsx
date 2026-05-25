import Link from 'next/link';
import { requireSuperAdmin } from '@/lib/auth/admin';
import { query } from '@/lib/db';
import { formatLAClock } from '@/lib/time';

interface DashboardCounts {
  upcoming_dinners: number;
  confirmed_this_week: number;
  new_leads: number;
  total_guests: number;
}

interface RecentReservationRow {
  id: number;
  status: string;
  created_at: Date;
  seat_count: number;
  guest_email: string;
  guest_first_name: string;
  guest_last_name: string;
  dinner_title: string;
  dinner_starts_at: Date;
  chapter_short_name: string;
}

async function getCounts(): Promise<DashboardCounts> {
  const [upcoming, confirmedThisWeek, newLeads, totalGuests] = await Promise.all([
    query<{ n: string }>(
      `SELECT COUNT(*)::text AS n FROM dinners
       WHERE status = 'published' AND starts_at > NOW()`,
    ),
    query<{ n: string }>(
      `SELECT COUNT(*)::text AS n FROM reservations
       WHERE status = 'confirmed' AND created_at >= NOW() - INTERVAL '7 days'`,
    ),
    query<{ n: string }>(
      `SELECT (
         (SELECT COUNT(*) FROM chapter_leads WHERE created_at >= NOW() - INTERVAL '14 days')
         + (SELECT COUNT(*) FROM venue_leads WHERE created_at >= NOW() - INTERVAL '14 days')
       )::text AS n`,
    ),
    query<{ n: string }>(`SELECT COUNT(*)::text AS n FROM guests`),
  ]);
  return {
    upcoming_dinners: parseInt(upcoming[0]?.n ?? '0', 10),
    confirmed_this_week: parseInt(confirmedThisWeek[0]?.n ?? '0', 10),
    new_leads: parseInt(newLeads[0]?.n ?? '0', 10),
    total_guests: parseInt(totalGuests[0]?.n ?? '0', 10),
  };
}

async function getRecent(): Promise<RecentReservationRow[]> {
  return query<RecentReservationRow>(
    `SELECT r.id, r.status, r.created_at, r.seat_count,
            g.email AS guest_email, g.first_name AS guest_first_name, g.last_name AS guest_last_name,
            d.title AS dinner_title, d.starts_at AS dinner_starts_at,
            c.short_name AS chapter_short_name
     FROM reservations r
     JOIN guests g ON g.id = r.guest_id
     JOIN dinners d ON d.id = r.dinner_id
     JOIN chapters c ON c.id = r.chapter_id
     ORDER BY r.created_at DESC
     LIMIT 10`,
  );
}

export default async function AdminDashboardPage() {
  await requireSuperAdmin();
  const [counts, recent] = await Promise.all([getCounts(), getRecent()]);

  return (
    <div>
      <h1 className="text-2xl font-semibold mb-6">Dashboard</h1>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <StatCard label="Upcoming dinners" value={counts.upcoming_dinners} />
        <StatCard label="Confirmed this week" value={counts.confirmed_this_week} />
        <StatCard label="New leads (14d)" value={counts.new_leads} />
        <StatCard label="Total guests" value={counts.total_guests} />
      </div>

      <section>
        <h2 className="text-lg font-semibold mb-3">Recent reservations</h2>
        <div className="overflow-x-auto border border-neutral-200 rounded">
          <table className="w-full text-sm">
            <thead className="bg-neutral-50 border-b border-neutral-200">
              <tr>
                <th className="text-left px-3 py-2">When</th>
                <th className="text-left px-3 py-2">Guest</th>
                <th className="text-left px-3 py-2">Dinner</th>
                <th className="text-left px-3 py-2">Chapter</th>
                <th className="text-left px-3 py-2">Status</th>
                <th className="text-left px-3 py-2">Seats</th>
              </tr>
            </thead>
            <tbody>
              {recent.map((r) => (
                <tr key={r.id} className="border-b border-neutral-100">
                  <td className="px-3 py-2 whitespace-nowrap">{formatLAClock(r.created_at)}</td>
                  <td className="px-3 py-2">
                    <Link href={`/admin/guests?q=${encodeURIComponent(r.guest_email)}`} className="hover:underline">
                      {r.guest_first_name} {r.guest_last_name}
                      <div className="text-neutral-500 text-xs">{r.guest_email}</div>
                    </Link>
                  </td>
                  <td className="px-3 py-2">
                    <div>{r.dinner_title}</div>
                    <div className="text-neutral-500 text-xs">{formatLAClock(r.dinner_starts_at)}</div>
                  </td>
                  <td className="px-3 py-2">{r.chapter_short_name}</td>
                  <td className="px-3 py-2">{r.status}</td>
                  <td className="px-3 py-2">{r.seat_count}</td>
                </tr>
              ))}
              {recent.length === 0 ? (
                <tr>
                  <td className="px-3 py-4 text-neutral-500" colSpan={6}>
                    No reservations yet.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}

function StatCard({ label, value }: { label: string; value: number }) {
  return (
    <div className="border border-neutral-200 rounded p-4">
      <div className="text-xs text-neutral-500 uppercase tracking-wide">{label}</div>
      <div className="text-2xl font-semibold mt-1">{value}</div>
    </div>
  );
}
