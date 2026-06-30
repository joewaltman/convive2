import { requireSuperAdmin } from '@/lib/auth/admin';
import { listStandingTables, listTableMembers } from '@/lib/lunchclub/data';
import { dayOfWeekLabel } from '@/lib/lunchclub/format';
import TablesView from './TablesView';

export const dynamic = 'force-dynamic';

export default async function TablesPage() {
  await requireSuperAdmin();

  const tables = await listStandingTables();
  const counts = await Promise.all(
    tables.map(async (t) => {
      const members = await listTableMembers(t.id);
      const activeCount = members.filter((m) => m.status === 'active').length;
      const seatsSum = members
        .filter((m) => m.status === 'active')
        .reduce((acc, m) => acc + (m.seats ?? 1), 0);
      return { id: t.id, activeCount, seatsSum };
    }),
  );
  const countsById = new Map(counts.map((c) => [c.id, c]));

  const rows = tables.map((t) => ({
    id: t.id,
    name: t.name,
    day: dayOfWeekLabel(t.day_of_week),
    day_of_week: t.day_of_week,
    area: t.area ?? '',
    default_venue: t.default_venue ?? '',
    default_address: t.default_address ?? '',
    status: t.status,
    active_members: countsById.get(t.id)?.activeCount ?? 0,
    seats_total: countsById.get(t.id)?.seatsSum ?? 0,
  }));

  return (
    <div>
      <h1 className="text-2xl font-semibold mb-4">Lunch Club standing tables</h1>
      <TablesView rows={rows} />
    </div>
  );
}
