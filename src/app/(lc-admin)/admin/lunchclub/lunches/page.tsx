import Link from 'next/link';
import { requireSuperAdmin } from '@/lib/auth/admin';
import {
  countPaidSeats,
  listLunches,
  listStandingTables,
} from '@/lib/lunchclub/data';
import { formatDateLA, formatDollars, formatTimeLA } from '@/lib/lunchclub/format';
import type { LunchStatus } from '@/lib/lunchclub/types';
import NewLunchForm from './NewLunchForm';

export const dynamic = 'force-dynamic';

interface SearchParams {
  table?: string;
  status?: string;
}

export default async function LunchesPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  await requireSuperAdmin();
  const sp = await searchParams;
  const tableFilter = sp.table ? Number(sp.table) : undefined;
  const statusFilter = (sp.status as LunchStatus | undefined) || undefined;

  const [tables, lunches] = await Promise.all([
    listStandingTables(),
    listLunches({
      tableId: Number.isInteger(tableFilter) ? tableFilter : undefined,
      status: statusFilter,
    }),
  ]);
  const tableById = new Map(tables.map((t) => [t.id, t]));

  const paidByLunch = await Promise.all(
    lunches.map(async (l) => [l.id, await countPaidSeats(l.id)] as const),
  );
  const paidMap = new Map(paidByLunch);

  return (
    <div>
      <h1 className="text-2xl font-semibold mb-4">Lunch Club lunches</h1>

      <form method="get" className="flex flex-wrap gap-3 items-end mb-4">
        <label className="block">
          <span className="block text-xs text-neutral-600 mb-1">Table</span>
          <select
            name="table"
            defaultValue={tableFilter ?? ''}
            className="border border-neutral-300 rounded px-2 py-1 text-sm"
          >
            <option value="">All tables</option>
            {tables.map((t) => (
              <option key={t.id} value={t.id}>
                {t.name}
              </option>
            ))}
          </select>
        </label>
        <label className="block">
          <span className="block text-xs text-neutral-600 mb-1">Status</span>
          <select
            name="status"
            defaultValue={statusFilter ?? ''}
            className="border border-neutral-300 rounded px-2 py-1 text-sm"
          >
            <option value="">All statuses</option>
            <option value="tentative">tentative</option>
            <option value="confirmed">confirmed</option>
            <option value="cancelled">cancelled</option>
            <option value="completed">completed</option>
          </select>
        </label>
        <button type="submit" className="border border-neutral-300 px-3 py-1 rounded text-sm">
          Apply
        </button>
        <Link
          href="/admin/lunchclub/lunches"
          className="text-xs underline text-neutral-600"
        >
          clear
        </Link>
      </form>

      <NewLunchForm
        tables={tables.map((t) => ({
          id: t.id,
          name: t.name,
          default_venue: t.default_venue ?? '',
          default_address: t.default_address ?? '',
        }))}
      />

      <div className="overflow-x-auto border border-neutral-200 rounded">
        <table className="w-full text-sm">
          <thead className="bg-neutral-50 border-b border-neutral-200">
            <tr>
              <th className="text-left px-3 py-2">Date</th>
              <th className="text-left px-3 py-2">Table</th>
              <th className="text-left px-3 py-2">Venue</th>
              <th className="text-left px-3 py-2">Price</th>
              <th className="text-left px-3 py-2">Seats</th>
              <th className="text-left px-3 py-2">Status</th>
              <th className="text-right px-3 py-2"></th>
            </tr>
          </thead>
          <tbody>
            {lunches.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-3 py-6 text-center text-neutral-500">
                  No lunches match these filters.
                </td>
              </tr>
            ) : (
              lunches.map((l) => {
                const t = tableById.get(l.standing_table_id);
                const paid = paidMap.get(l.id) ?? 0;
                return (
                  <tr key={l.id} className="border-b border-neutral-100 align-top">
                    <td className="px-3 py-2">
                      <div className="font-medium">{formatDateLA(l.starts_at)}</div>
                      <div className="text-xs text-neutral-500">
                        {formatTimeLA(l.starts_at)}
                      </div>
                    </td>
                    <td className="px-3 py-2">{t?.name ?? `#${l.standing_table_id}`}</td>
                    <td className="px-3 py-2">
                      <div>{l.venue}</div>
                      <div className="text-xs text-neutral-500">{l.address}</div>
                    </td>
                    <td className="px-3 py-2">{formatDollars(l.price_cents)}</td>
                    <td className="px-3 py-2">
                      {paid}/{l.total_seats}
                    </td>
                    <td className="px-3 py-2">
                      <span className="text-xs uppercase tracking-wide">{l.status}</span>
                    </td>
                    <td className="px-3 py-2 text-right">
                      <Link
                        href={`/admin/lunchclub/lunches/${l.id}`}
                        className="text-sm underline text-neutral-700"
                      >
                        Manage
                      </Link>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
