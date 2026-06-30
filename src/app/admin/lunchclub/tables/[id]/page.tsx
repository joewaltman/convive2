import Link from 'next/link';
import { notFound } from 'next/navigation';
import { requireSuperAdmin } from '@/lib/auth/admin';
import {
  getStandingTable,
  listTableMembers,
  listUnseatedSignups,
} from '@/lib/lunchclub/data';
import { dayOfWeekLabel } from '@/lib/lunchclub/format';
import TableMembers from './TableMembers';

export const dynamic = 'force-dynamic';

export default async function TableDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireSuperAdmin();
  const { id } = await params;
  const tableId = Number(id);
  if (!Number.isInteger(tableId)) notFound();
  const table = await getStandingTable(tableId);
  if (!table) notFound();
  const [members, unseated] = await Promise.all([
    listTableMembers(tableId),
    listUnseatedSignups(),
  ]);

  const memberRows = members.map((m) => ({
    id: m.id,
    signup_id: m.signup_id,
    name: [m.signup.first_name, m.signup.last_name].filter(Boolean).join(' ') || '(no name)',
    email: m.signup.email ?? '',
    phone: m.signup.phone ?? '',
    seats: m.seats,
    status: m.status,
    consecutive_unpaid: m.consecutive_unpaid,
    joined_at: m.joined_at instanceof Date ? m.joined_at.toISOString() : String(m.joined_at),
  }));

  const unseatedOptions = unseated.map((s) => ({
    id: s.id,
    label:
      `${[s.first_name, s.last_name].filter(Boolean).join(' ') || '(no name)'}` +
      (s.email ? ` <${s.email}>` : ''),
  }));

  return (
    <div>
      <div className="mb-4 flex items-center gap-3">
        <Link href="/admin/lunchclub/tables" className="text-sm underline text-neutral-700">
          ← Tables
        </Link>
      </div>
      <h1 className="text-2xl font-semibold mb-1">{table.name}</h1>
      <div className="text-sm text-neutral-600 mb-4">
        {dayOfWeekLabel(table.day_of_week)} · {table.area ?? '—'} ·{' '}
        <span className="uppercase tracking-wide text-xs">{table.status}</span>
      </div>
      {table.default_venue ? (
        <div className="text-sm text-neutral-700 mb-1">
          Default venue: <span className="font-medium">{table.default_venue}</span>
        </div>
      ) : null}
      {table.default_address ? (
        <div className="text-sm text-neutral-700 mb-4">
          Default address: <span className="font-medium">{table.default_address}</span>
        </div>
      ) : null}

      <TableMembers tableId={tableId} members={memberRows} unseated={unseatedOptions} />
    </div>
  );
}
