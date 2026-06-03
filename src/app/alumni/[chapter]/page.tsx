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
          <h3 className="heading-2 mb-8">What&rsquo;s coming up</h3>
          {dinners.length === 0 ? (
            <p className="body-base text-body">
              Nothing on the calendar right now. Check back soon.
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

  // Show the neighborhood. Fall back to city if neighborhood is not set.
  const venueDisplay = dinner.neighborhood || dinner.city || 'Location TBA';

  // Teaser: use the dinner's About-the-space override when present.
  const teaser = dinner.description?.trim() || null;

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
      className="block bg-surface rounded-sm hover:shadow-md transition-shadow overflow-hidden"
    >
      {dinner.photo_url ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={dinner.photo_url}
          alt={dinner.title}
          className="w-full aspect-[4/3] object-cover"
        />
      ) : null}
      <div className="p-5">
        <p className="eyebrow mb-2">{venueDisplay}</p>
        <h4
          className="heading-3 mb-2"
          style={{ color: 'var(--chapter-primary)' }}
        >
          {dinner.title}
        </h4>
        {teaser ? (
          <p className="body-sm text-body line-clamp-2 mb-3">{teaser}</p>
        ) : null}
        <p className="body-sm text-body mb-3">{formatLAClock(new Date(dinner.starts_at))}</p>
        <p className="body-base font-semibold text-ink mb-3">{price} per seat</p>
        {seatStatus}
      </div>
    </Link>
  );
}
