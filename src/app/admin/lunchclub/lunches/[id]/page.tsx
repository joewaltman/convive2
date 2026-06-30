import Link from 'next/link';
import { notFound } from 'next/navigation';
import { requireSuperAdmin } from '@/lib/auth/admin';
import {
  countPaidSeats,
  getLunch,
  getStandingTable,
  listBookingsForLunch,
} from '@/lib/lunchclub/data';
import {
  formatDateLA,
  formatDollars,
  formatTimeLA,
} from '@/lib/lunchclub/format';
import LunchRoster from './LunchRoster';

export const dynamic = 'force-dynamic';

export default async function LunchDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireSuperAdmin();
  const { id } = await params;
  const lunchId = Number(id);
  if (!Number.isInteger(lunchId)) notFound();
  const lunch = await getLunch(lunchId);
  if (!lunch) notFound();
  const [table, bookings, paidSeats] = await Promise.all([
    getStandingTable(lunch.standing_table_id),
    listBookingsForLunch(lunchId),
    countPaidSeats(lunchId),
  ]);

  const roster = bookings.map((b) => ({
    id: b.id,
    name: [b.signup.first_name, b.signup.last_name].filter(Boolean).join(' ') || '(no name)',
    email: b.signup.email ?? '',
    phone: b.signup.phone ?? '',
    seats: b.seats,
    status: b.status,
    magic_token: b.magic_token,
    paid_at: b.paid_at ? b.paid_at.toISOString() : null,
    invited_at: b.invited_at instanceof Date ? b.invited_at.toISOString() : String(b.invited_at),
    nudge_sent_at: b.nudge_sent_at ? b.nudge_sent_at.toISOString() : null,
    reminder_sent_at: b.reminder_sent_at ? b.reminder_sent_at.toISOString() : null,
  }));

  return (
    <div>
      <div className="mb-4 flex items-center gap-3">
        <Link href="/admin/lunchclub/lunches" className="text-sm underline text-neutral-700">
          ← Lunches
        </Link>
      </div>
      <h1 className="text-2xl font-semibold mb-1">
        {formatDateLA(lunch.starts_at)} at {formatTimeLA(lunch.starts_at)}
      </h1>
      <div className="text-sm text-neutral-600 mb-4">
        {table?.name ?? `Table #${lunch.standing_table_id}`} ·{' '}
        <span className="uppercase tracking-wide text-xs">{lunch.status}</span> ·{' '}
        {paidSeats}/{lunch.total_seats} paid · {formatDollars(lunch.price_cents)} per seat
      </div>
      <div className="text-sm text-neutral-700 mb-1">
        Venue: <span className="font-medium">{lunch.venue}</span>
      </div>
      <div className="text-sm text-neutral-700 mb-1">
        Address: <span className="font-medium">{lunch.address}</span>
      </div>
      <div className="text-sm text-neutral-700 mb-4">
        Booking cutoff: {lunch.booking_cutoff_at.toLocaleString()}
      </div>
      {lunch.menu ? (
        <div className="border border-neutral-200 rounded p-3 mb-4 bg-neutral-50">
          <div className="text-xs text-neutral-600 mb-1">Menu</div>
          <pre className="text-sm whitespace-pre-wrap font-sans">{lunch.menu}</pre>
        </div>
      ) : null}

      <LunchRoster
        lunchId={lunchId}
        lunch={{
          venue: lunch.venue,
          address: lunch.address,
          lunch_date: lunch.lunch_date,
          start_time: lunch.start_time.slice(0, 5),
          price_cents: lunch.price_cents,
          total_seats: lunch.total_seats,
          menu: lunch.menu ?? '',
          status: lunch.status,
        }}
        roster={roster}
      />
    </div>
  );
}
