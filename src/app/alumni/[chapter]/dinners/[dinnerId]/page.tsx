import { notFound } from 'next/navigation';
import Link from 'next/link';
import { getChapterBySlug } from '@/lib/chapters';
import {
  getDinnerWithRelations,
  countSeatsUsed,
  countActiveWaitlist,
} from '@/lib/dinners';
import { venueMapsUrl } from '@/lib/venues';
import { getCurrentGuest } from '@/lib/auth/guest';
import { listConfirmedAttendees, listReservationsForGuest } from '@/lib/reservations';
import { formatLAClock } from '@/lib/time';

interface PageProps {
  params: Promise<{ chapter: string; dinnerId: string }>;
}

export default async function DinnerDetailPage({ params }: PageProps) {
  const { chapter: slug, dinnerId: dinnerIdStr } = await params;
  const dinnerId = parseInt(dinnerIdStr, 10);

  if (!Number.isFinite(dinnerId)) {
    notFound();
  }

  const chapter = await getChapterBySlug(slug);
  if (!chapter) {
    notFound();
  }

  const relations = await getDinnerWithRelations(dinnerId);
  if (!relations || relations.chapter.id !== chapter.id) {
    notFound();
  }

  const { dinner, venue, photos, host_first_name, host_grad_year } = relations;

  // Check if dinner is published and in the future
  const isPast = new Date(dinner.starts_at) < new Date();
  const isPublished = dinner.status === 'published';

  if (!isPublished && dinner.status !== 'sold_out') {
    notFound();
  }

  // Seat counts
  const seatsUsed = await countSeatsUsed(dinnerId);
  const waitlistCount = await countActiveWaitlist(dinnerId);
  const seatsAvailable = dinner.total_seats - seatsUsed;
  const isFull = seatsAvailable <= 0;
  const isPastCutoff =
    dinner.booking_cutoff_at && new Date(dinner.booking_cutoff_at) < new Date();

  // Check if current guest has a confirmed reservation (for address privacy)
  const guest = await getCurrentGuest();
  let hasConfirmedReservation = false;
  if (guest) {
    const reservations = await listReservationsForGuest(guest.id);
    hasConfirmedReservation = reservations.some(
      (r) => r.dinner_id === dinnerId && r.status === 'confirmed'
    );
  }

  // Price formatting
  const price = (dinner.price_cents / 100).toLocaleString('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  });

  // Build venue display per privacy rules:
  // - If guest has confirmed reservation: show full address
  // - Home venue: neighborhood + host first name + grad year
  // - Restaurant/event-space: name + neighborhood (no address)
  const area = venue.neighborhood || venue.city;
  let venueDisplay: string;
  let showAddress = false;

  if (hasConfirmedReservation && venue.address) {
    venueDisplay = venue.name;
    showAddress = true;
  } else if (venue.venue_type === 'home') {
    const hostInfo = host_first_name
      ? `Hosted by ${host_first_name}${host_grad_year ? `, '${String(host_grad_year).slice(-2)}` : ''}`
      : 'Hosted by a fellow alum';
    venueDisplay = `${hostInfo}, in ${area || 'the area'}`;
  } else {
    venueDisplay = area || 'Venue TBA';
  }

  // Confirmed attendees ("Who's coming"). Always fetched; the rendering decides
  // which fields are exposed based on hasConfirmedReservation.
  const attendees = await listConfirmedAttendees(dinnerId);
  const chefName = dinner.chef_name ?? venue.chef_name;
  const aboutChef = dinner.about_chef ?? venue.about_chef;

  // Determine CTA state
  let ctaState: 'reserve' | 'waitlist' | 'closed';
  if (isPast || !isPublished || isPastCutoff) {
    ctaState = 'closed';
  } else if (isFull) {
    ctaState = 'waitlist';
  } else {
    ctaState = 'reserve';
  }

  return (
    <div className="py-12 md:py-16">
      <div className="max-w-3xl mx-auto px-6">
        {/* Back link */}
        <Link
          href={`/alumni/${slug}`}
          className="inline-flex items-center body-sm text-warm-gray hover:text-ink mb-8"
        >
          <svg
            width="16"
            height="16"
            viewBox="0 0 16 16"
            fill="none"
            className="mr-1"
          >
            <path
              d="M10 12L6 8L10 4"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
          Back to dinners
        </Link>

        {/* Venue photo gallery */}
        {photos.length > 0 ? (
          <div className="mb-6">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={photos[0].url}
              alt={photos[0].caption ?? dinner.title}
              className="w-full aspect-[4/3] object-cover rounded"
            />
            {photos.length > 1 ? (
              <div className="mt-2 grid grid-cols-2 sm:grid-cols-3 gap-2">
                {photos.slice(1).map((p) => (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    key={p.id}
                    src={p.url}
                    alt={p.caption ?? dinner.title}
                    className="w-full aspect-[4/3] object-cover rounded"
                  />
                ))}
              </div>
            ) : null}
          </div>
        ) : null}

        {/* Eyebrow: city */}
        <p className="eyebrow mb-2">{venue.city || 'Location TBA'}</p>

        {/* Title */}
        <h1
          className="heading-1 mb-4"
          style={{ color: 'var(--chapter-primary)' }}
        >
          {dinner.title}
        </h1>

        {/* Date/time and price */}
        <p className="body-lg text-body mb-2">
          {formatLAClock(new Date(dinner.starts_at))}
        </p>
        <p className="body-lg font-semibold text-ink mb-6">{price} per seat</p>

        {/* Venue info */}
        <section className="mb-8">
          <h2 className="heading-3 mb-2">Location</h2>
          <p className="body-base text-body">{venueDisplay}</p>
          {showAddress && venue.address && (
            <p className="body-base text-body mt-1">{venue.address}</p>
          )}
          {showAddress && (() => {
            const mapsUrl = venueMapsUrl(venue);
            return mapsUrl ? (
              <a
                href={mapsUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="body-sm text-terracotta hover:underline mt-2 inline-block"
              >
                View on Google Maps
              </a>
            ) : null;
          })()}
        </section>

        {/* Menu */}
        {dinner.menu && (
          <section className="mb-8">
            <h2 className="heading-3 mb-2">Menu</h2>
            <p className="body-base text-body whitespace-pre-line">{dinner.menu}</p>
          </section>
        )}

        {/* Who's coming */}
        <section className="mb-8">
          <h2 className="heading-3 mb-2">
            {chapter.short_name} alumni at this table
          </h2>
          {attendees.length === 0 ? (
            <p className="body-base text-warm-gray">
              No one has booked yet. Be the first to grab a seat.
            </p>
          ) : (
            <>
              <p className="body-sm text-warm-gray mb-3">
                {attendees.reduce((sum, a) => sum + (a.brings_partner ? 2 : 1), 0)}{' '}
                of {dinner.total_seats} seats filled
              </p>
              <ul className="space-y-2">
                {attendees.map((a) => {
                  const yy = String(a.grad_year).slice(-2);
                  const parts: string[] = [`${a.first_name} '${yy}`];
                  if (a.major) parts.push(a.major);
                  if (a.brings_partner) parts.push('plus guest');
                  const nameLine = hasConfirmedReservation
                    ? `${a.first_name} ${a.last_name} '${yy}${a.major ? `, ${a.major}` : ''}${a.brings_partner ? ', plus guest' : ''}`
                    : parts.join(', ');
                  return (
                    <li key={a.reservation_id}>
                      <p className="body-base text-body">{nameLine}</p>
                      {hasConfirmedReservation && a.what_do_you_do ? (
                        <p className="body-sm text-warm-gray">{a.what_do_you_do}</p>
                      ) : null}
                    </li>
                  );
                })}
              </ul>
            </>
          )}
        </section>

        {/* Description */}
        {dinner.description && (
          <section className="mb-8">
            <h2 className="heading-3 mb-2">About this dinner</h2>
            <p className="body-base text-body whitespace-pre-line">
              {dinner.description}
            </p>
          </section>
        )}

        {/* About the space */}
        {venue.description && (
          <section className="mb-8">
            <h2 className="heading-3 mb-2">About the space</h2>
            <p className="body-base text-body whitespace-pre-line">
              {venue.description}
            </p>
          </section>
        )}

        {/* About the chef */}
        {aboutChef && (
          <section className="mb-8">
            <h2 className="heading-3 mb-2">About the chef</h2>
            {chefName ? (
              <p className="body-sm text-warm-gray mb-1">{chefName}</p>
            ) : null}
            <p className="body-base text-body whitespace-pre-line">{aboutChef}</p>
          </section>
        )}

        {/* Parking note */}
        {hasConfirmedReservation && dinner.parking_note && (
          <section className="mb-8">
            <h2 className="heading-3 mb-2">Parking</h2>
            <p className="body-base text-body whitespace-pre-line">
              {dinner.parking_note}
            </p>
          </section>
        )}

        {/* Seat status */}
        <section className="mb-8">
          <h2 className="heading-3 mb-2">Availability</h2>
          {isFull ? (
            <p className="body-base text-body">
              Sold out{waitlistCount > 0 && ` · ${waitlistCount} on the waitlist`}
            </p>
          ) : isPastCutoff || isPast ? (
            <p className="body-base text-warm-gray">Bookings are closed</p>
          ) : (
            <div>
              <p className="body-base text-body mb-2">
                {seatsUsed} of {dinner.total_seats} seats filled
              </p>
              <div className="h-2 bg-border rounded-full overflow-hidden max-w-xs">
                <div
                  className="h-full rounded-full"
                  style={{
                    width: `${(seatsUsed / dinner.total_seats) * 100}%`,
                    backgroundColor: 'var(--chapter-accent)',
                  }}
                />
              </div>
            </div>
          )}
        </section>

        {/* Couples note */}
        {dinner.allows_couples && ctaState === 'reserve' && (
          <p className="body-sm text-warm-gray mb-6 italic">
            Couples welcome (additional {price} for your partner).
          </p>
        )}

        {/* CTA */}
        <div className="mt-8">
          {ctaState === 'reserve' && (
            <Link
              href={`/alumni/${slug}/book/${dinnerId}`}
              className="inline-block px-8 py-4 rounded-sm body-base font-medium text-white transition-opacity hover:opacity-90"
              style={{ backgroundColor: 'var(--chapter-accent)' }}
            >
              Reserve your seat, {price}
            </Link>
          )}
          {ctaState === 'waitlist' && (
            <Link
              href={`/alumni/${slug}/waitlist/${dinnerId}`}
              className="inline-block px-8 py-4 rounded-sm body-base font-medium border-2 transition-colors hover:opacity-90"
              style={{
                borderColor: 'var(--chapter-accent)',
                color: 'var(--chapter-accent)',
              }}
            >
              Join the waitlist
            </Link>
          )}
          {ctaState === 'closed' && (
            <p className="body-base text-warm-gray italic">
              Bookings are closed for this dinner.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
