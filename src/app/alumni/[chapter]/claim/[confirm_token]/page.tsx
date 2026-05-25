import { notFound } from 'next/navigation';
import Link from 'next/link';
import { getChapterBySlug } from '@/lib/chapters';
import { getReservationByConfirmToken } from '@/lib/reservations';
import { getDinnerWithRelations } from '@/lib/dinners';
import { getGuestById } from '@/lib/guests';
import { formatLAClock } from '@/lib/time';
import { ClaimForm } from './_components/ClaimForm';

interface PageProps {
  params: Promise<{ chapter: string; confirm_token: string }>;
}

export default async function ClaimPage({ params }: PageProps) {
  const { chapter: slug, confirm_token } = await params;

  const chapter = await getChapterBySlug(slug);
  if (!chapter) {
    notFound();
  }

  const reservation = await getReservationByConfirmToken(confirm_token);
  if (!reservation) {
    notFound();
  }

  // Check chapter matches
  if (reservation.chapter_id !== chapter.id) {
    notFound();
  }

  const relations = await getDinnerWithRelations(reservation.dinner_id);
  if (!relations) {
    notFound();
  }

  const { dinner, venue } = relations;
  const guest = await getGuestById(reservation.guest_id);

  const price = (dinner.price_cents / 100).toLocaleString('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  });

  // Check reservation state
  const isPending = reservation.status === 'pending';
  const isExpired = reservation.pending_expires_at
    ? new Date(reservation.pending_expires_at) < new Date()
    : false;

  // Expired or not pending
  if (!isPending || isExpired) {
    return (
      <div className="py-12 md:py-16">
        <div className="max-w-md mx-auto px-6 text-center">
          <div className="w-16 h-16 rounded-full mx-auto mb-6 flex items-center justify-center bg-warm-gray/20">
            <svg width="32" height="32" viewBox="0 0 32 32" fill="none">
              <path
                d="M16 8V16L20 20"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="text-warm-gray"
              />
              <circle
                cx="16"
                cy="16"
                r="12"
                stroke="currentColor"
                strokeWidth="2"
                className="text-warm-gray"
              />
            </svg>
          </div>

          <h1 className="heading-1 mb-4 text-ink">
            {reservation.status === 'confirmed'
              ? 'Already claimed'
              : reservation.status === 'cancelled'
              ? 'Reservation cancelled'
              : 'Claim window expired'}
          </h1>

          <p className="body-lg text-body mb-8">
            {reservation.status === 'confirmed'
              ? 'This seat has already been claimed. Check your email for confirmation details.'
              : reservation.status === 'cancelled'
              ? 'This reservation was cancelled.'
              : 'The 24-hour claim window has passed. The seat has been offered to the next person on the waitlist.'}
          </p>

          <Link
            href={`/alumni/${slug}`}
            className="inline-block px-6 py-3 rounded-sm body-base font-medium text-white transition-opacity hover:opacity-90"
            style={{ backgroundColor: 'var(--chapter-accent)' }}
          >
            View upcoming dinners
          </Link>
        </div>
      </div>
    );
  }

  // Calculate time remaining
  const expiresAt = reservation.pending_expires_at
    ? new Date(reservation.pending_expires_at)
    : null;

  return (
    <div className="py-12 md:py-16">
      <div className="max-w-2xl mx-auto px-6">
        <h1
          className="heading-1 mb-4"
          style={{ color: 'var(--chapter-primary)' }}
        >
          A seat opened up
        </h1>

        <p className="body-lg text-body mb-8">
          Complete your reservation within 24 hours to claim your spot.
        </p>

        {expiresAt && (
          <div className="bg-surface border border-border rounded-sm p-4 mb-8">
            <p className="body-sm text-warm-gray">
              Claim by: <strong className="text-ink">{formatLAClock(expiresAt)}</strong>
            </p>
          </div>
        )}

        {/* Dinner summary */}
        <div className="bg-surface rounded-sm p-4 mb-8">
          <p className="eyebrow mb-1">{venue.city || 'Location TBA'}</p>
          <h3
            className="heading-3 mb-2"
            style={{ color: 'var(--chapter-primary)' }}
          >
            {dinner.title}
          </h3>
          <p className="body-sm text-body mb-1">{formatLAClock(new Date(dinner.starts_at))}</p>
          <p className="body-sm font-semibold text-ink">{price}</p>
        </div>

        {/* Guest info */}
        {guest && (
          <div className="border border-border rounded-sm p-4 mb-8">
            <p className="body-base text-ink mb-1">
              <strong>{guest.first_name} {guest.last_name}</strong>
            </p>
            <p className="body-sm text-warm-gray">{guest.email}</p>
            {reservation.grad_year > 0 && (
              <p className="body-sm text-body mt-2">
                Class of {reservation.grad_year}
                {reservation.major && `, ${reservation.major}`}
              </p>
            )}
          </div>
        )}

        <ClaimForm
          reservationId={reservation.id}
          chapterSlug={slug}
          price={price}
        />
      </div>
    </div>
  );
}
