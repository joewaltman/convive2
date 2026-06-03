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

  const area = venue.neighborhood || venue.city || 'Location TBA';

  // Attendees + chef
  const attendees = await listConfirmedAttendees(dinnerId);
  const chefName = dinner.chef_name ?? venue.chef_name;
  const aboutChef = dinner.about_chef ?? venue.about_chef;

  // Hero / gallery split
  const hero = photos[0] ?? null;
  const galleryRest = photos.slice(1);

  // CTA state
  let ctaState: 'reserve' | 'waitlist' | 'closed';
  if (isPast || !isPublished || isPastCutoff) {
    ctaState = 'closed';
  } else if (isFull) {
    ctaState = 'waitlist';
  } else {
    ctaState = 'reserve';
  }

  const mapsUrl = venueMapsUrl(venue);

  return (
    <div className="max-w-3xl mx-auto px-6 py-12 md:py-16">
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

      <article className="bg-white border border-border rounded-lg overflow-hidden">
        {/* 1. HERO */}
        {hero ? (
          <div className="relative">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={hero.url}
              alt={hero.caption ?? dinner.title}
              className="w-full aspect-[16/9] object-cover"
            />
            <span
              className="absolute top-3 left-3 px-3 py-1 rounded-md body-sm font-medium text-white"
              style={{ backgroundColor: 'var(--chapter-primary)' }}
            >
              {area}
            </span>
            {!hasConfirmedReservation && venue.venue_type !== 'home' && (
              <span className="absolute bottom-3 left-3 px-3 py-1 rounded-md body-sm bg-white/90 text-body border border-border">
                Exact venue shared when you reserve
              </span>
            )}
          </div>
        ) : (
          <div className="h-28 bg-surface relative flex items-end">
            <span
              className="m-3 px-3 py-1 rounded-md body-sm font-medium text-white"
              style={{ backgroundColor: 'var(--chapter-primary)' }}
            >
              {area}
            </span>
          </div>
        )}

        {/* 2. BODY */}
        <div className="p-6 md:p-8">
          {/* 2a. Title + meta row */}
          <h1
            className="heading-1 mb-3"
            style={{ color: 'var(--chapter-primary)' }}
          >
            {dinner.title}
          </h1>
          <div className="flex flex-wrap gap-x-5 gap-y-2 body-base text-body mb-4">
            <span>{formatLAClock(new Date(dinner.starts_at))}</span>
            <span>{price} per seat</span>
            {ctaState === 'reserve' && (
              <span
                className="font-medium"
                style={{ color: 'var(--chapter-accent)' }}
              >
                {seatsAvailable} {seatsAvailable === 1 ? 'seat' : 'seats'} left
              </span>
            )}
            {ctaState === 'waitlist' && (
              <span className="font-medium text-warm-gray">
                Sold out{waitlistCount > 0 ? `, ${waitlistCount} on the waitlist` : ''}
              </span>
            )}
            {ctaState === 'closed' && (
              <span className="font-medium text-warm-gray">Bookings closed</span>
            )}
          </div>

          {/* 2b. Lead line */}
          {chapter.tagline ? (
            <p className="body-lg text-body mb-6">{chapter.tagline}</p>
          ) : null}

          {/* About this dinner */}
          {dinner.description && (
            <section className="mb-8">
              <h2 className="heading-3 mb-2">About this dinner</h2>
              <p className="body-base text-body whitespace-pre-line">
                {dinner.description}
              </p>
            </section>
          )}

          {/* 2c. Gallery strip */}
          {galleryRest.length > 0 && (
            <div className="grid grid-cols-3 gap-2 mb-8">
              {galleryRest.map((p) => (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  key={p.id}
                  src={p.url}
                  alt={p.caption ?? dinner.title}
                  className="w-full aspect-[4/3] object-cover rounded"
                />
              ))}
            </div>
          )}

          {/* 2d. About the space */}
          {venue.description && (
            <section className="mb-8">
              <h2 className="heading-3 mb-2">About the space</h2>
              <p className="body-base text-body whitespace-pre-line">
                {venue.description}
              </p>
            </section>
          )}

          {/* 2e. About the chef */}
          {aboutChef && (
            <section className="mb-8">
              <h2 className="heading-3 mb-1">About the chef</h2>
              {chefName ? (
                <p className="body-sm text-warm-gray mb-2">{chefName}</p>
              ) : null}
              <p className="body-base text-body whitespace-pre-line">{aboutChef}</p>
            </section>
          )}

          {/* 2f. Menu */}
          {dinner.menu && (
            <section className="mb-8">
              <h2 className="heading-3 mb-3">The menu</h2>
              <div className="flex flex-col gap-2">
                {dinner.menu
                  .split('\n')
                  .map((l) => l.trim())
                  .filter(Boolean)
                  .map((line, i) => (
                    <div
                      key={i}
                      className="border-l-2 pl-3 body-base text-body"
                      style={{ borderColor: 'var(--chapter-accent)' }}
                    >
                      {line}
                    </div>
                  ))}
              </div>
            </section>
          )}

          {/* 2g. Who's at the table */}
          <section className="mb-8">
            <h2 className="heading-3 mb-1">
              {chapter.short_name} alumni at this table
            </h2>
            <p className="body-sm text-warm-gray mb-3">
              {seatsUsed} of {dinner.total_seats} seats filled
            </p>
            {attendees.length === 0 ? (
              <p className="body-base text-body">
                No one has reserved yet. Be the first at the table.
              </p>
            ) : (
              <div className="flex flex-wrap gap-2">
                {attendees.map((a) => {
                  const yy = a.grad_year ? `'${String(a.grad_year).slice(-2)}` : '';
                  const showLast = hasConfirmedReservation && a.last_name;
                  const showWork = hasConfirmedReservation && a.what_do_you_do;
                  return (
                    <div
                      key={a.reservation_id}
                      className="flex items-center gap-2 bg-surface rounded-full pl-1.5 pr-3 py-1.5"
                    >
                      <span
                        className="w-7 h-7 rounded-full flex items-center justify-center text-white body-sm"
                        style={{ backgroundColor: 'var(--chapter-primary)' }}
                      >
                        {a.first_name.charAt(0).toUpperCase()}
                      </span>
                      <span className="body-sm text-body">
                        {a.first_name}
                        {showLast ? ` ${a.last_name}` : ''}
                        {yy ? ` · ${yy}` : ''}
                        {a.major ? ` · ${a.major}` : ''}
                        {showWork ? ` · ${a.what_do_you_do}` : ''}
                        {a.brings_partner ? ' + guest' : ''}
                      </span>
                    </div>
                  );
                })}
                {seatsAvailable > 0 && (
                  <div className="flex items-center body-sm text-warm-gray rounded-full px-3.5 py-1.5 border border-dashed border-border">
                    {seatsAvailable}{' '}
                    {seatsAvailable === 1 ? 'seat' : 'seats'} open
                  </div>
                )}
              </div>
            )}
          </section>

          {/* 2h. Location (compact) */}
          {hasConfirmedReservation && venue.address ? (
            <section className="mb-6">
              <h2 className="heading-3 mb-2">Location</h2>
              <div className="bg-surface rounded p-4">
                <p className="body-base text-ink font-medium">{venue.name}</p>
                <p className="body-base text-body mt-1">{venue.address}</p>
                {mapsUrl ? (
                  <a
                    href={mapsUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="body-sm text-terracotta hover:underline mt-2 inline-block"
                  >
                    View on Google Maps
                  </a>
                ) : null}
              </div>
            </section>
          ) : venue.venue_type === 'home' ? (
            <section className="mb-6">
              <h2 className="heading-3 mb-2">Location</h2>
              <p className="body-base text-body">
                {host_first_name
                  ? `Hosted by ${host_first_name}${host_grad_year ? `, '${String(host_grad_year).slice(-2)}` : ''}, in ${area}`
                  : `Hosted by a fellow alum, in ${area}`}
              </p>
            </section>
          ) : null}

          {/* 2i. Included-details box */}
          <div className="bg-surface rounded p-4 body-sm text-body mb-6">
            <p>
              Your seat covers the full menu. Wine pairings available at the
              table.
            </p>
            {!hasConfirmedReservation ? (
              <p className="mt-2">
                Full venue address and details are shared by email once you
                reserve.
              </p>
            ) : null}
            {hasConfirmedReservation && dinner.parking_note ? (
              <p className="mt-2 whitespace-pre-line">{dinner.parking_note}</p>
            ) : null}
          </div>

          {/* Couples note */}
          {dinner.allows_couples && ctaState === 'reserve' && (
            <p className="body-sm text-warm-gray mb-4 italic">
              Couples welcome (additional {price} for your partner).
            </p>
          )}

          {/* 2j. CTA */}
          <div>
            {ctaState === 'reserve' && (
              <Link
                href={`/alumni/${slug}/book/${dinnerId}`}
                className="block w-full text-center px-8 py-4 rounded-md body-base font-medium text-white transition-opacity hover:opacity-90"
                style={{ backgroundColor: 'var(--chapter-accent)' }}
              >
                Reserve your seat, {price}
              </Link>
            )}
            {ctaState === 'waitlist' && (
              <Link
                href={`/alumni/${slug}/waitlist/${dinnerId}`}
                className="block w-full text-center px-8 py-4 rounded-md body-base font-medium border-2 transition-colors hover:opacity-90"
                style={{
                  borderColor: 'var(--chapter-accent)',
                  color: 'var(--chapter-accent)',
                }}
              >
                Join the waitlist
              </Link>
            )}
            {ctaState === 'closed' && (
              <p className="body-base text-warm-gray italic text-center">
                Bookings are closed for this dinner.
              </p>
            )}
          </div>
        </div>
      </article>
    </div>
  );
}
