import Link from 'next/link';
import { requireSuperAdmin } from '@/lib/auth/admin';
import { searchGuestsByEmail } from '@/lib/guests';

export default async function GuestsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  await requireSuperAdmin();
  const sp = await searchParams;
  const q = (sp.q ?? '').trim();
  const guests = q ? await searchGuestsByEmail(q, 50) : [];

  return (
    <div>
      <h1 className="text-2xl font-semibold mb-4">Guests</h1>
      <form method="get" className="flex gap-2 items-end mb-4">
        <label className="block flex-1 max-w-md">
          <span className="block text-xs text-neutral-600 mb-1">Email contains</span>
          <input
            type="text"
            name="q"
            defaultValue={q}
            className="w-full border border-neutral-300 rounded px-3 py-2 text-sm"
          />
        </label>
        <button type="submit" className="border border-neutral-300 px-3 py-2 rounded text-sm">
          Search
        </button>
      </form>

      {q ? (
        <div className="overflow-x-auto border border-neutral-200 rounded">
          <table className="w-full text-sm">
            <thead className="bg-neutral-50 border-b border-neutral-200">
              <tr>
                <th className="text-left px-3 py-2">Email</th>
                <th className="text-left px-3 py-2">Name</th>
                <th className="text-left px-3 py-2">Unsubscribed</th>
              </tr>
            </thead>
            <tbody>
              {guests.map((g) => (
                <tr key={g.id} className="border-b border-neutral-100">
                  <td className="px-3 py-2">
                    <Link href={`/admin/guests/${g.id}`} className="text-blue-700 hover:underline">
                      {g.email}
                    </Link>
                  </td>
                  <td className="px-3 py-2">{g.first_name} {g.last_name}</td>
                  <td className="px-3 py-2">{g.email_unsubscribed_at ? 'yes' : 'no'}</td>
                </tr>
              ))}
              {guests.length === 0 ? (
                <tr>
                  <td className="px-3 py-4 text-neutral-500" colSpan={3}>
                    No guests match.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      ) : (
        <p className="text-sm text-neutral-500">Enter an email substring to search.</p>
      )}
    </div>
  );
}
