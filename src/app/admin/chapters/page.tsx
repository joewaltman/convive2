import Link from 'next/link';
import { requireSuperAdmin } from '@/lib/auth/admin';
import { listAllChapters } from '@/lib/chapters';

export default async function ChaptersPage() {
  await requireSuperAdmin();
  const chapters = await listAllChapters();
  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-2xl font-semibold">Chapters</h1>
        <Link
          href="/admin/chapters/new"
          className="bg-neutral-900 text-white px-3 py-2 rounded text-sm"
        >
          New chapter
        </Link>
      </div>
      <div className="overflow-x-auto border border-neutral-200 rounded">
        <table className="w-full text-sm">
          <thead className="bg-neutral-50 border-b border-neutral-200">
            <tr>
              <th className="text-left px-3 py-2">Slug</th>
              <th className="text-left px-3 py-2">Display name</th>
              <th className="text-left px-3 py-2">Short name</th>
              <th className="text-left px-3 py-2">School</th>
              <th className="text-left px-3 py-2">Active</th>
            </tr>
          </thead>
          <tbody>
            {chapters.map((c) => (
              <tr key={c.id} className="border-b border-neutral-100">
                <td className="px-3 py-2">
                  <Link href={`/admin/chapters/${c.id}`} className="text-blue-700 hover:underline">
                    {c.slug}
                  </Link>
                </td>
                <td className="px-3 py-2">{c.display_name}</td>
                <td className="px-3 py-2">{c.short_name}</td>
                <td className="px-3 py-2">{c.school_name}</td>
                <td className="px-3 py-2">{c.is_active ? 'yes' : 'no'}</td>
              </tr>
            ))}
            {chapters.length === 0 ? (
              <tr>
                <td className="px-3 py-4 text-neutral-500" colSpan={5}>
                  No chapters yet.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </div>
  );
}
