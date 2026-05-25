import Link from 'next/link';
import { requireSuperAdmin } from '@/lib/auth/admin';
import { listChapterLeads, listVenueLeads } from '@/lib/leads';
import { formatLAClock } from '@/lib/time';
import ChapterLeadRow from './ChapterLeadRow';
import VenueLeadRow from './VenueLeadRow';

export default async function LeadsPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string }>;
}) {
  await requireSuperAdmin();
  const sp = await searchParams;
  const tab = sp.tab === 'venue' ? 'venue' : 'chapter';

  const [chapterLeads, venueLeads] = await Promise.all([listChapterLeads(), listVenueLeads()]);

  return (
    <div>
      <h1 className="text-2xl font-semibold mb-4">Leads</h1>
      <div className="flex gap-2 mb-4 border-b border-neutral-200">
        <TabLink active={tab === 'chapter'} href="/admin/leads?tab=chapter">
          Chapter leads ({chapterLeads.length})
        </TabLink>
        <TabLink active={tab === 'venue'} href="/admin/leads?tab=venue">
          Venue leads ({venueLeads.length})
        </TabLink>
      </div>

      {tab === 'chapter' ? (
        <div className="overflow-x-auto border border-neutral-200 rounded">
          <table className="w-full text-sm">
            <thead className="bg-neutral-50 border-b border-neutral-200">
              <tr>
                <th className="text-left px-3 py-2">Contact</th>
                <th className="text-left px-3 py-2">Chapter</th>
                <th className="text-left px-3 py-2">Size</th>
                <th className="text-left px-3 py-2">Goals</th>
                <th className="text-left px-3 py-2">Status</th>
                <th className="text-left px-3 py-2">Notes</th>
                <th className="text-left px-3 py-2">Created</th>
              </tr>
            </thead>
            <tbody>
              {chapterLeads.map((l) => (
                <ChapterLeadRow key={l.id} lead={{ ...l, created_at: l.created_at.toISOString() }} />
              ))}
              {chapterLeads.length === 0 ? (
                <tr>
                  <td className="px-3 py-4 text-neutral-500" colSpan={7}>
                    No chapter leads.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="overflow-x-auto border border-neutral-200 rounded">
          <table className="w-full text-sm">
            <thead className="bg-neutral-50 border-b border-neutral-200">
              <tr>
                <th className="text-left px-3 py-2">Contact</th>
                <th className="text-left px-3 py-2">Venue</th>
                <th className="text-left px-3 py-2">Type</th>
                <th className="text-left px-3 py-2">Neighborhood</th>
                <th className="text-left px-3 py-2">Cap.</th>
                <th className="text-left px-3 py-2">Notes</th>
                <th className="text-left px-3 py-2">Status</th>
                <th className="text-left px-3 py-2">Internal</th>
                <th className="text-left px-3 py-2">Created</th>
              </tr>
            </thead>
            <tbody>
              {venueLeads.map((l) => (
                <VenueLeadRow key={l.id} lead={{ ...l, created_at: l.created_at.toISOString() }} />
              ))}
              {venueLeads.length === 0 ? (
                <tr>
                  <td className="px-3 py-4 text-neutral-500" colSpan={9}>
                    No venue leads.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      )}

      <p className="text-xs text-neutral-500 mt-4">Most recent first. {formatLAClock(new Date())}</p>
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
