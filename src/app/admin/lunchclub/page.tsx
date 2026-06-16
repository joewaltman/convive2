import Link from 'next/link';
import { requireSuperAdmin } from '@/lib/auth/admin';
import { listProspects, listSignups } from '@/lib/lunchclub/data';
import type { SignupStatus } from '@/lib/lunchclub/types';
import SignupsTable from './SignupsTable';

const STATUSES: SignupStatus[] = ['new', 'contacted', 'invited', 'seated'];
const SOURCES = ['organic', 'reactivation'] as const;
const ARMS = ['A', 'C', 'none'] as const;

type SourceVal = (typeof SOURCES)[number];
type ArmVal = (typeof ARMS)[number];

export default async function LunchClubSignupsPage({
  searchParams,
}: {
  searchParams: Promise<{ source?: string; status?: string; arm?: string }>;
}) {
  await requireSuperAdmin();
  const sp = await searchParams;

  const source: SourceVal | undefined =
    sp.source && (SOURCES as readonly string[]).includes(sp.source)
      ? (sp.source as SourceVal)
      : undefined;
  const status: SignupStatus | undefined =
    sp.status && (STATUSES as readonly string[]).includes(sp.status)
      ? (sp.status as SignupStatus)
      : undefined;
  const arm: ArmVal | undefined =
    sp.arm && (ARMS as readonly string[]).includes(sp.arm) ? (sp.arm as ArmVal) : undefined;

  const [rows, prospects] = await Promise.all([
    listSignups({ source, status, arm }),
    listProspects({}),
  ]);

  return (
    <div>
      <h1 className="text-2xl font-semibold mb-4">Lunch Club signups</h1>
      <div className="flex gap-2 mb-4 border-b border-neutral-200">
        <TabLink active href="/admin/lunchclub">
          Signups ({rows.length})
        </TabLink>
        <TabLink active={false} href="/admin/lunchclub/prospects">
          Prospects ({prospects.length})
        </TabLink>
      </div>

      <form method="get" className="flex flex-wrap gap-3 items-end mb-4">
        <label className="block">
          <span className="block text-xs text-neutral-600 mb-1">Source</span>
          <select
            name="source"
            defaultValue={sp.source ?? ''}
            className="border border-neutral-300 rounded px-2 py-1 text-sm"
          >
            <option value="">All</option>
            {SOURCES.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
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
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </label>
        <label className="block">
          <span className="block text-xs text-neutral-600 mb-1">Arm</span>
          <select
            name="arm"
            defaultValue={sp.arm ?? ''}
            className="border border-neutral-300 rounded px-2 py-1 text-sm"
          >
            <option value="">All</option>
            <option value="none">none</option>
            <option value="A">A</option>
            <option value="C">C</option>
          </select>
        </label>
        <button type="submit" className="border border-neutral-300 px-3 py-1 rounded text-sm">
          Apply
        </button>
      </form>

      <SignupsTable
        rows={rows.map((r) => ({ ...r, created_at: r.created_at.toISOString() }))}
      />
    </div>
  );
}

function TabLink({
  active,
  href,
  children,
}: {
  active: boolean;
  href: string;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      className={`px-4 py-2 text-sm border-b-2 ${
        active ? 'border-neutral-900 font-semibold' : 'border-transparent text-neutral-600'
      }`}
    >
      {children}
    </Link>
  );
}
