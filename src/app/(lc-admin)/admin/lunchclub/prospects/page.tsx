import Link from 'next/link';
import { requireSuperAdmin } from '@/lib/auth/admin';
import { listProspects } from '@/lib/lunchclub/data';
import ProspectsTable from './ProspectsTable';

function isTruthy(v: string | undefined): boolean {
  if (!v) return false;
  return v === '1' || v === 'on' || v === 'true';
}

export default async function LunchClubProspectsPage({
  searchParams,
}: {
  searchParams: Promise<{ notContacted?: string; notSignedUp?: string }>;
}) {
  await requireSuperAdmin();
  const sp = await searchParams;
  const notContacted = isTruthy(sp.notContacted);
  const notSignedUp = isTruthy(sp.notSignedUp);

  const rows = await listProspects({ notContacted, notSignedUp });
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL ?? 'https://con-vive.com';

  return (
    <div>
      <h1 className="text-2xl font-semibold mb-4">Lunch Club prospects</h1>
      <div className="mb-4">
        <Link href="/admin/lunchclub" className="text-sm text-neutral-600 hover:underline">
          ← Back to signups
        </Link>
      </div>

      <form method="get" className="flex flex-wrap gap-4 items-center mb-4">
        <label className="inline-flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            name="notContacted"
            value="1"
            defaultChecked={notContacted}
            className="border border-neutral-300 rounded"
          />
          Not yet contacted
        </label>
        <label className="inline-flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            name="notSignedUp"
            value="1"
            defaultChecked={notSignedUp}
            className="border border-neutral-300 rounded"
          />
          Not yet signed up
        </label>
        <button type="submit" className="border border-neutral-300 px-3 py-1 rounded text-sm">
          Apply
        </button>
      </form>

      <p className="text-xs text-neutral-500 mb-2">Showing {rows.length} prospects</p>

      <ProspectsTable
        rows={rows.map((r) => ({
          ...r,
          contacted_at: r.contacted_at ? r.contacted_at.toISOString() : null,
          created_at: r.created_at.toISOString(),
        }))}
        baseUrl={baseUrl}
      />
    </div>
  );
}
