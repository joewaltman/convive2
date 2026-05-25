import { redirect } from 'next/navigation';
import { getCurrentGuest } from '@/lib/auth/guest';
import { listReservationsForGuest } from '@/lib/reservations';
import { query } from '@/lib/db';
import { formatLAClock } from '@/lib/time';
import {
  generateGoogleCalendarUrl,
  generateOutlookUrl,
  generateIcsDownloadUrl,
  type CalendarDinner,
} from '@/lib/calendar';
import type { Reservation } from '@/lib/types';

interface ReservationWithDetails extends Reservation {
  dinner_title: string;
  dinner_starts_at: Date;
  chapter_display_name: string;
  chapter_slug: string;
  venue_name: string;
  venue_address: string | null;
  venue_city: string | null;
}

async function getReservationsWithDetails(guestId: number): Promise<ReservationWithDetails[]> {
  return query<ReservationWithDetails>(
    `SELECT r.*,
            d.title AS dinner_title,
            d.starts_at AS dinner_starts_at,
            c.display_name AS chapter_display_name,
            c.slug AS chapter_slug,
            v.name AS venue_name,
            v.address AS venue_address,
            v.city AS venue_city
     FROM reservations r
     JOIN dinners d ON d.id = r.dinner_id
     JOIN chapters c ON c.id = r.chapter_id
     JOIN venues v ON v.id = d.venue_id
     WHERE r.guest_id = $1
     ORDER BY d.starts_at DESC`,
    [guestId],
  );
}

function StatusBadge({ status }: { status: Reservation['status'] }) {
  const styles: Record<Reservation['status'], string> = {
    confirmed: 'bg-green-100 text-green-800',
    pending: 'bg-yellow-100 text-yellow-800',
    cancelled: 'bg-neutral-100 text-warm-gray',
  };
  const labels: Record<Reservation['status'], string> = {
    confirmed: 'Confirmed',
    pending: 'Pending payment',
    cancelled: 'Cancelled',
  };
  return (
    <span className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${styles[status]}`}>
      {labels[status]}
    </span>
  );
}

export default async function MyDinnersPage() {
  const guest = await getCurrentGuest();
  if (!guest) {
    redirect('/login?next=/my-dinners');
  }

  const reservations = await getReservationsWithDetails(guest.id);

  const now = new Date();
  const upcoming: ReservationWithDetails[] = [];
  const past: ReservationWithDetails[] = [];

  for (const r of reservations) {
    const dinnerDate = new Date(r.dinner_starts_at);
    if (dinnerDate > now) {
      upcoming.push(r);
    } else {
      past.push(r);
    }
  }

  // Sort upcoming by date ascending (soonest first)
  upcoming.sort((a, b) => new Date(a.dinner_starts_at).getTime() - new Date(b.dinner_starts_at).getTime());

  return (
    <div className="min-h-screen bg-bone">
      <div className="max-w-3xl mx-auto px-4 py-12">
        <h1 className="heading-1 mb-2">My Dinners</h1>
        <p className="body-base text-warm-gray mb-8">
          Welcome back, {guest.first_name}. Here are your dinner reservations.
        </p>

        {reservations.length === 0 ? (
          <div className="bg-surface border border-border rounded-lg p-8 text-center">
            <p className="body-base text-warm-gray">You have no dinner reservations yet.</p>
          </div>
        ) : (
          <>
            {upcoming.length > 0 && (
              <section className="mb-10">
                <h2 className="eyebrow mb-4">Upcoming</h2>
                <div className="space-y-4">
                  {upcoming.map((r) => (
                    <ReservationCard key={r.id} reservation={r} isUpcoming />
                  ))}
                </div>
              </section>
            )}

            {past.length > 0 && (
              <section>
                <h2 className="eyebrow mb-4">Past</h2>
                <div className="space-y-4">
                  {past.map((r) => (
                    <ReservationCard key={r.id} reservation={r} isUpcoming={false} />
                  ))}
                </div>
              </section>
            )}
          </>
        )}
      </div>
    </div>
  );
}

function ReservationCard({ reservation, isUpcoming }: { reservation: ReservationWithDetails; isUpcoming: boolean }) {
  const r = reservation;
  const fullAddress = r.venue_address
    ? `${r.venue_address}${r.venue_city ? `, ${r.venue_city}` : ''}`
    : r.venue_city ?? '';

  const calendarDinner: CalendarDinner = {
    title: `${r.chapter_display_name} dinner`,
    startsAt: new Date(r.dinner_starts_at),
    address: fullAddress,
    description: r.dinner_title,
  };

  const isPendingWaitlist =
    r.status === 'pending' &&
    r.waitlist_entry_id != null &&
    r.pending_expires_at != null &&
    new Date(r.pending_expires_at) > new Date();

  return (
    <div className="bg-surface border border-border rounded-lg p-6">
      <div className="flex items-start justify-between gap-4 mb-3">
        <div>
          <p className="eyebrow mb-1">{r.chapter_display_name}</p>
          <h3 className="heading-3">{r.dinner_title}</h3>
        </div>
        <StatusBadge status={r.status} />
      </div>

      <p className="body-sm text-warm-gray mb-1">{r.venue_name}</p>
      <p className="body-sm text-ink">{formatLAClock(new Date(r.dinner_starts_at))}</p>

      {r.status === 'confirmed' && isUpcoming && (
        <div className="mt-4 pt-4 border-t border-border">
          {fullAddress && (
            <div className="mb-3">
              <p className="body-sm font-medium text-ink mb-1">Location</p>
              <p className="body-sm text-warm-gray">{fullAddress}</p>
            </div>
          )}

          <div className="mb-4">
            <p className="body-sm font-medium text-ink mb-2">Add to calendar</p>
            <div className="flex flex-wrap gap-2">
              <a
                href={generateGoogleCalendarUrl(calendarDinner)}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-block px-3 py-1.5 border border-border rounded body-sm text-ink hover:bg-bone transition-colors"
              >
                Google
              </a>
              <a
                href={generateOutlookUrl(calendarDinner)}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-block px-3 py-1.5 border border-border rounded body-sm text-ink hover:bg-bone transition-colors"
              >
                Outlook
              </a>
              <a
                href={generateIcsDownloadUrl(r.calendar_token)}
                className="inline-block px-3 py-1.5 border border-border rounded body-sm text-ink hover:bg-bone transition-colors"
              >
                Download .ics
              </a>
            </div>
          </div>

          <a
            href={`/cancel/${r.cancel_token}`}
            className="inline-block body-sm text-terracotta hover:text-terracotta-dark"
          >
            Cancel reservation
          </a>
        </div>
      )}

      {isPendingWaitlist && (
        <div className="mt-4 pt-4 border-t border-border">
          <p className="body-sm text-warm-gray mb-2">
            A spot opened up. Complete payment to confirm your seat.
          </p>
          <a
            href={`/alumni/${r.chapter_slug}/claim/${r.confirm_token}`}
            className="inline-block bg-terracotta hover:bg-terracotta-dark text-white px-4 py-2 rounded body-sm font-medium transition-colors"
          >
            Complete payment
          </a>
        </div>
      )}

      {r.status === 'confirmed' && !isUpcoming && (
        <div className="mt-4 pt-4 border-t border-border">
          <p className="body-sm text-warm-gray">Thanks for joining us at this dinner.</p>
        </div>
      )}
    </div>
  );
}
