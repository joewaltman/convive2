import { notFound } from 'next/navigation';
import { getChapterBySlug } from '@/lib/chapters';
import { getDinnerWithRelations, countSeatsUsed } from '@/lib/dinners';
import { getCurrentGuest } from '@/lib/auth/guest';
import { BookingFlow } from '@/components/booking/BookingFlow';
import Link from 'next/link';

interface PageProps {
  params: Promise<{ chapter: string; dinnerId: string }>;
}

export default async function BookPage({ params }: PageProps) {
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

  const { dinner, venue } = relations;

  // Check if dinner is bookable
  const isPublished = dinner.status === 'published';
  const isPast = new Date(dinner.starts_at) < new Date();
  const isPastCutoff =
    dinner.booking_cutoff_at && new Date(dinner.booking_cutoff_at) < new Date();

  if (!isPublished || isPast || isPastCutoff) {
    notFound();
  }

  // Check capacity
  const seatsUsed = await countSeatsUsed(dinnerId);
  const seatsAvailable = dinner.total_seats - seatsUsed;

  if (seatsAvailable <= 0) {
    // Redirect to waitlist
    return (
      <div className="py-12 md:py-16">
        <div className="max-w-md mx-auto px-6 text-center">
          <h1 className="heading-2 mb-4">This dinner is sold out</h1>
          <p className="body-base text-body mb-6">
            All seats have been filled. You can join the waitlist to be notified if a spot opens up.
          </p>
          <Link
            href={`/alumni/${slug}/waitlist/${dinnerId}`}
            className="inline-block px-6 py-3 rounded-sm body-base font-medium text-white"
            style={{ backgroundColor: 'var(--chapter-accent)' }}
          >
            Join the waitlist
          </Link>
        </div>
      </div>
    );
  }

  const guest = await getCurrentGuest();

  // Compose dinner object with venue for BookingFlow
  const dinnerWithVenue = {
    ...dinner,
    venue,
    chapter,
  };

  return (
    <div className="py-12 md:py-16">
      <div className="max-w-2xl mx-auto px-6">
        {/* Back link */}
        <Link
          href={`/alumni/${slug}/dinners/${dinnerId}`}
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
          Back to dinner details
        </Link>

        <h1
          className="heading-1 mb-8"
          style={{ color: 'var(--chapter-primary)' }}
        >
          Reserve your seat
        </h1>

        <BookingFlow
          chapter={chapter}
          dinner={dinnerWithVenue}
          guest={guest}
        />
      </div>
    </div>
  );
}
