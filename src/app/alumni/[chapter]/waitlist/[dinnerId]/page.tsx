import { notFound } from 'next/navigation';
import Link from 'next/link';
import { getChapterBySlug } from '@/lib/chapters';
import { getDinnerWithRelations } from '@/lib/dinners';
import { getCurrentGuest } from '@/lib/auth/guest';
import { formatLAClock } from '@/lib/time';
import { WaitlistFlow } from './_components/WaitlistFlow';

interface PageProps {
  params: Promise<{ chapter: string; dinnerId: string }>;
}

export default async function WaitlistPage({ params }: PageProps) {
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

  // Check if dinner is active
  const isPublished = dinner.status === 'published' || dinner.status === 'sold_out';
  const isPast = new Date(dinner.starts_at) < new Date();

  if (!isPublished || isPast) {
    notFound();
  }

  const guest = await getCurrentGuest();

  const price = (dinner.price_cents / 100).toLocaleString('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  });

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
          className="heading-1 mb-4"
          style={{ color: 'var(--chapter-primary)' }}
        >
          Join the waitlist
        </h1>

        <p className="body-lg text-body mb-8">
          This dinner is currently full. Join the waitlist and we will notify you if a spot opens up.
        </p>

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
          <p className="body-sm text-body">{price} per seat</p>
        </div>

        <WaitlistFlow
          chapter={chapter}
          dinnerId={dinnerId}
          guest={guest}
        />
      </div>
    </div>
  );
}
