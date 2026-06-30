import Link from 'next/link';
import type { ReactNode } from 'react';

export default function AdminLayout({ children }: { children: ReactNode }) {
  return (
    <div
      className="min-h-screen bg-white text-neutral-900"
      style={{ fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif' }}
    >
      <header className="border-b border-neutral-200 bg-neutral-50">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
          <Link href="/admin" className="font-semibold text-neutral-900">
            Con-Vive Admin
          </Link>
          <nav className="flex gap-4 text-sm">
            <Link href="/admin" className="hover:underline">Dashboard</Link>
            <Link href="/admin/dinners" className="hover:underline">Dinners</Link>
            <Link href="/admin/reservations" className="hover:underline">Reservations</Link>
            <Link href="/admin/chapters" className="hover:underline">Chapters</Link>
            <Link href="/admin/venues" className="hover:underline">Venues</Link>
            <Link href="/admin/guests" className="hover:underline">Guests</Link>
            <Link href="/admin/leads" className="hover:underline">Leads</Link>
            <Link href="/admin/lunchclub" className="hover:underline">Lunch Club admin</Link>
            <Link href="/admin/system" className="hover:underline">System</Link>
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
