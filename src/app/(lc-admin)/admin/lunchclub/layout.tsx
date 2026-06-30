import Link from 'next/link';
import type { ReactNode } from 'react';

export default function LunchClubAdminLayout({ children }: { children: ReactNode }) {
  return (
    <div
      className="min-h-screen bg-white text-neutral-900"
      style={{ fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif' }}
    >
      <header className="border-b border-amber-200 bg-amber-50">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
          <Link href="/admin/lunchclub" className="font-semibold text-neutral-900">
            Lunch Club Admin
          </Link>
          <nav className="flex gap-4 text-sm">
            <Link href="/admin/lunchclub" className="hover:underline">Signups</Link>
            <Link href="/admin/lunchclub/prospects" className="hover:underline">Prospects</Link>
            <Link href="/admin/lunchclub/tables" className="hover:underline">Tables</Link>
            <Link href="/admin/lunchclub/lunches" className="hover:underline">Lunches</Link>
            <Link href="/admin/lunchclub/system" className="hover:underline">System</Link>
            <Link href="/admin" className="text-neutral-600 hover:underline">Con-Vive admin</Link>
            <form action="/api/admin/auth/logout" method="post" className="inline">
              <button
                type="submit"
                className="text-neutral-600 hover:underline cursor-pointer bg-transparent border-0 p-0"
              >
                Logout
              </button>
            </form>
          </nav>
        </div>
      </header>
      <main className="max-w-7xl mx-auto px-4 py-6">{children}</main>
    </div>
  );
}
