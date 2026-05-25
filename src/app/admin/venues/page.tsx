import Link from 'next/link';
import { requireSuperAdmin } from '@/lib/auth/admin';
import { listAllVenues } from '@/lib/venues';

export default async function VenuesPage() {
  await requireSuperAdmin();
  const venues = await listAllVenues();
  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-2xl font-semibold">Venues</h1>
        <Link
          href="/admin/venues/new"
          className="bg-neutral-900 text-white px-3 py-2 rounded text-sm"
        >
          New venue
        </Link>
      </div>
      <div className="overflow-x-auto border border-neutral-200 rounded">
        <table className="w-full text-sm">
          <thead className="bg-neutral-50 border-b border-neutral-200">
            <tr>
              <th className="text-left px-3 py-2">Name</th>
              <th className="text-left px-3 py-2">Type</th>
              <th className="text-left px-3 py-2">City</th>
              <th className="text-left px-3 py-2">Neighborhood</th>
              <th className="text-left px-3 py-2">Capacity</th>
              <th className="text-left px-3 py-2">Public</th>
              <th className="text-left px-3 py-2">Active</th>
            </tr>
          </thead>
          <tbody>
            {venues.map((v) => (
              <tr key={v.id} className="border-b border-neutral-100">
                <td className="px-3 py-2">
                  <Link href={`/admin/venues/${v.id}`} className="text-blue-700 hover:underline">
                    {v.name}
                  </Link>
                </td>
                <td className="px-3 py-2">{v.venue_type}</td>
                <td className="px-3 py-2">{v.city ?? '—'}</td>
                <td className="px-3 py-2">{v.neighborhood ?? '—'}</td>
                <td className="px-3 py-2">{v.capacity_min}–{v.capacity_max}</td>
                <td className="px-3 py-2">{v.is_public ? 'yes' : 'no'}</td>
                <td className="px-3 py-2">{v.is_active ? 'yes' : 'no'}</td>
              </tr>
            ))}
            {venues.length === 0 ? (
              <tr>
                <td className="px-3 py-4 text-neutral-500" colSpan={7}>
                  No venues yet.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </div>
  );
}
