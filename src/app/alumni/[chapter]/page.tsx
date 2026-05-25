import { notFound } from 'next/navigation';
import Link from 'next/link';
import { getChapterBySlug } from '@/lib/chapters';
import { listPublicUpcomingByChapter, type PublicDinnerCard } from '@/lib/dinners';
import { formatLAClock } from '@/lib/time';

interface PageProps {
  params: Promise<{ chapter: string }>;
}

export default async function ChapterPage({ params }: PageProps) {
  const { chapter: slug } = await params;
  const chapter = await getChapterBySlug(slug);

  if (!chapter) {
    notFound();
  }

  const dinners = await listPublicUpcomingByChapter(chapter.id);

  return (
    <div className="py-12 md:py-16">
      <div className="max-w-5xl mx-auto px-6">
        {/* Hero */}
        <section className="mb-12">
          <h2
            className="heading-1 mb-4"
            style={{ color: 'var(--chapter-primary)' }}
          >
            {chapter.display_name}
          </h2>
          {chapter.tagline && (
            <p className="body-lg text-body">{chapter.tagline}</p>
          )}
        </section>

        {/* Upcoming dinners */}
        <section>
          <h3 className="heading-2 mb-8">Upcoming dinners</h3>
          {dinners.length === 0 ? (
            <p className="body-base text-body">
              No upcoming dinners at this time. Check back soon.
            </p>
          ) : (
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {dinners.map((dinner) => (
                <DinnerCard
                  key={dinner.id}
                  dinner={dinner}
                  chapterSlug={slug}
                />
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}

function DinnerCard({
  dinner,
  chapterSlug,
}: {
  dinner: PublicDinnerCard;
  chapterSlug: string;
}) {
  const seatsAvailable = dinner.total_seats - dinner.seats_used;
  const isFull = seatsAvailable <= 0;
  const isPastCutoff =
    dinner.booking_cutoff_at && new Date(dinner.booking_cutoff_at) < new Date();

  // Format price
  const price = (dinner.price_cents / 100).toLocaleString('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  });

  // Build venue display per privacy rules:
  // - Home venue: city only
  // - Restaurant/event-space: name + city
  let venueDisplay: string;
  if (dinner.venue_type === 'home') {
    venueDisplay = dinner.city || 'Location TBA';
  } else {
    const parts = [dinner.venue_display_name, dinner.city].filter(Boolean);
    venueDisplay = parts.join(', ') || 'Location TBA';
  }

  // Seat status display
  let seatStatus: React.ReactNode;
  if (isPastCutoff) {
    seatStatus = (
      <span className="body-sm text-warm-gray">Bookings closed</span>
    );
  } else if (isFull) {
    seatStatus = (
      <span className="body-sm text-warm-gray">
        Sold out{dinner.waitlist_count > 0 && ` · ${dinner.waitlist_count} waiting`}
      </span>
    );
  } else {
    const fillPercent = (dinner.seats_used / dinner.total_seats) * 100;
    seatStatus = (
      <div>
        <span className="body-sm text-body">
          {dinner.seats_used} of {dinner.total_seats} seats filled
        </span>
        <div className="mt-1 h-1.5 bg-border rounded-full overflow-hidden">
          <div
            className="h-full rounded-full"
            style={{
              width: `${fillPercent}%`,
              backgroundColor: 'var(--chapter-accent)',
            }}
          />
        </div>
      </div>
    );
  }

  return (
    <Link
      href={`/alumni/${chapterSlug}/dinners/${dinner.id}`}
      className="block bg-surface rounded-sm p-5 hover:shadow-md transition-shadow"
    >
      <p className="eyebrow mb-2">{venueDisplay}</p>
      <h4
        className="heading-3 mb-2"
        style={{ color: 'var(--chapter-primary)' }}
      >
        {dinner.title}
      </h4>
      <p className="body-sm text-body mb-3">{formatLAClock(new Date(dinner.starts_at))}</p>
      <p className="body-base font-semibold text-ink mb-3">{price} per seat</p>
      {seatStatus}
    </Link>
  );
}
