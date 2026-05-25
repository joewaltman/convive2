import { notFound } from 'next/navigation';
import { requireSuperAdmin } from '@/lib/auth/admin';
import { getDinnerByIdAdmin } from '@/lib/dinners';
import { listAllChapters } from '@/lib/chapters';
import { listAllVenues } from '@/lib/venues';
import { query } from '@/lib/db';
import { formatLAClock } from '@/lib/time';
import DinnerForm from '../DinnerForm';
import DinnerSidePanel from './DinnerSidePanel';

interface ReservationRow {
  id: number;
  guest_id: number;
  guest_email: string;
  guest_first_name: string;
  guest_last_name: string;
  status: string;
  seat_count: number;
  brings_partner: boolean;
  amount_paid_cents: number | null;
  created_at: Date;
}

interface WaitlistRow {
  id: number;
  guest_id: number;
  guest_email: string;
  guest_first_name: string;
  guest_last_name: string;
  status: string;
  created_at: Date;
}

export default async function EditDinnerPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireSuperAdmin();
  const { id } = await params;
  const n = parseInt(id, 10);
  if (!Number.isFinite(n)) notFound();
  const [dinner, chapters, venues] = await Promise.all([
    getDinnerByIdAdmin(n),
    listAllChapters(),
    listAllVenues(),
  ]);
  if (!dinner) notFound();

  const [reservations, waitlist] = await Promise.all([
    query<ReservationRow>(
      `SELECT r.id, r.guest_id, g.email AS guest_email, g.first_name AS guest_first_name,
              g.last_name AS guest_last_name, r.status, r.seat_count, r.brings_partner,
              r.amount_paid_cents, r.created_at
       FROM reservations r
       JOIN guests g ON g.id = r.guest_id
       WHERE r.dinner_id = $1
       ORDER BY r.created_at ASC`,
      [n],
    ),
    query<WaitlistRow>(
      `SELECT we.id, we.guest_id, g.email AS guest_email, g.first_name AS guest_first_name,
              g.last_name AS guest_last_name, we.status, we.created_at
       FROM waitlist_entries we
       JOIN guests g ON g.id = we.guest_id
       WHERE we.dinner_id = $1
       ORDER BY we.created_at ASC`,
      [n],
    ),
  ]);

  return (
    <div>
      <h1 className="text-2xl font-semibold mb-2">Edit dinner</h1>
      <p className="text-sm text-neutral-600 mb-6">
        {dinner.title} — {formatLAClock(dinner.starts_at)}
      </p>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2">
          <DinnerForm dinner={dinner} chapters={chapters} venues={venues} />
        </div>
        <div className="lg:col-span-1">
          <DinnerSidePanel
            reservations={reservations.map((r) => ({
              ...r,
              created_at: r.created_at.toISOString(),
            }))}
            waitlist={waitlist.map((w) => ({
              ...w,
              created_at: w.created_at.toISOString(),
            }))}
          />
        </div>
      </div>
    </div>
  );
}
