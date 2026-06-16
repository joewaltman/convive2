import type { ReactNode } from 'react';

export default function LunchClubLayout({ children }: { children: ReactNode }) {
  return (
    <main className="min-h-screen bg-bone text-ink">
      <div className="mx-auto max-w-2xl px-4 sm:px-6 py-16 text-lg">{children}</div>
    </main>
  );
}
