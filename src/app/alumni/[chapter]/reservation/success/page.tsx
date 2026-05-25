import { notFound } from 'next/navigation';
import Link from 'next/link';
import { getChapterBySlug } from '@/lib/chapters';
import { getReservationByCheckoutSession } from '@/lib/reservations';
import { getDinnerWithRelations } from '@/lib/dinners';
import { getGuestById } from '@/lib/guests';
import { formatLAClock } from '@/lib/time';
import {
  generateGoogleCalendarUrl,
  generateOutlookUrl,
  generateIcsDownloadUrl,
  type CalendarDinner,
} from '@/lib/calendar';
import { SuccessPoller } from './_components/SuccessPoller';

interface PageProps {
  params: Promise<{ chapter: string }>;
  searchParams: Promise<{ session_id?: string }>;
}

export default async function ReservationSuccessPage({
  params,
  searchParams,
}: PageProps) {
  const { chapter: slug } = await params;
  const { session_id: sessionId } = await searchParams;

  if (!sessionId) {
    notFound();
  }

  const chapter = await getChapterBySlug(slug);
  if (!chapter) {
    notFound();
  }

  const reservation = await getReservationByCheckoutSession(sessionId);

  // If no reservation found or not for this chapter, show polling state
  if (!reservation || reservation.chapter_id !== chapter.id) {
    return (
      <div className="py-12 md:py-16">
        <div className="max-w-md mx-auto px-6 text-center">
          <SuccessPoller sessionId={sessionId} chapterSlug={slug} />
        </div>
      </div>
    );
  }

  const relations = await getDinnerWithRelations(reservation.dinner_id);
  if (!relations) {
    notFound();
  }

  const { dinner, venue } = relations;
  const guest = await getGuestById(reservation.guest_id);

  // If still pending, show polling state
  if (reservation.status === 'pending') {
    return (
      <div className="py-12 md:py-16">
        <div className="max-w-md mx-auto px-6 text-center">
          <SuccessPoller sessionId={sessionId} chapterSlug={slug} />
        </div>
      </div>
    );
  }

  // Build calendar data
  const calendarDinner: CalendarDinner = {
    title: `${chapter.display_name} dinner: ${dinner.title}`,
    startsAt: new Date(dinner.starts_at),
    durationHours: 3,
    address: venue.address || venue.city || 'Location TBA',
    description: dinner.description || dinner.title,
  };

  const googleUrl = generateGoogleCalendarUrl(calendarDinner);
  const outlookUrl = generateOutlookUrl(calendarDinner);
  const icsUrl = generateIcsDownloadUrl(reservation.calendar_token);

  const partnerNote = reservation.brings_partner
    ? 'You and your partner are confirmed.'
    : null;

  return (
    <div className="py-12 md:py-16">
      <div className="max-w-md mx-auto px-6 text-center">
        {/* Success icon */}
        <div
          className="w-20 h-20 rounded-full mx-auto mb-6 flex items-center justify-center"
          style={{ backgroundColor: 'var(--chapter-accent)' }}
        >
          <svg width="40" height="40" viewBox="0 0 40 40" fill="none">
            <path
              d="M10 20L17 27L30 12"
              stroke="white"
              strokeWidth="3"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </div>

        <h1
          className="heading-1 mb-4"
          style={{ color: 'var(--chapter-primary)' }}
        >
          You are confirmed
        </h1>

        <p className="body-lg text-body mb-2">
          {partnerNote || `Your seat is reserved for ${dinner.title}.`}
        </p>

        {guest && (
          <p className="body-base text-warm-gray mb-8">
            We sent confirmation details to {guest.email}.
          </p>
        )}

        {/* Dinner summary */}
        <div className="bg-surface rounded-sm p-6 mb-8 text-left">
          <h3
            className="heading-3 mb-2"
            style={{ color: 'var(--chapter-primary)' }}
          >
            {dinner.title}
          </h3>
          <p className="body-base text-body mb-2">
            {formatLAClock(new Date(dinner.starts_at))}
          </p>
          <p className="body-base text-body mb-2">
            {venue.name}
            {venue.address && `, ${venue.address}`}
          </p>
          {venue.google_maps_link && (
            <a
              href={venue.google_maps_link}
              target="_blank"
              rel="noopener noreferrer"
              className="body-sm text-terracotta hover:underline"
            >
              View on Google Maps
            </a>
          )}
        </div>

        {/* Calendar buttons */}
        <div className="space-y-3 mb-8">
          <p className="body-sm text-warm-gray mb-4">Add to your calendar:</p>
          <div className="flex flex-col sm:flex-row gap-3">
            <a
              href={googleUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex-1 px-4 py-3 border border-border rounded-sm body-sm font-medium text-ink hover:bg-surface transition-colors text-center"
            >
              Google Calendar
            </a>
            <a
              href={outlookUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex-1 px-4 py-3 border border-border rounded-sm body-sm font-medium text-ink hover:bg-surface transition-colors text-center"
            >
              Outlook
            </a>
            <a
              href={icsUrl}
              className="flex-1 px-4 py-3 border border-border rounded-sm body-sm font-medium text-ink hover:bg-surface transition-colors text-center"
            >
              Download .ics
            </a>
          </div>
        </div>

        {/* Back to chapter */}
        <Link
          href={`/alumni/${slug}`}
          className="inline-block body-base text-terracotta hover:underline"
        >
          Back to {chapter.display_name} dinners
        </Link>
      </div>
    </div>
  );
}
