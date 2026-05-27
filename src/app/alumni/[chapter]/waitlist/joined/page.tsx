import Link from 'next/link';

interface PageProps {
  params: Promise<{ chapter: string }>;
}

export default async function WaitlistJoinedPage({ params }: PageProps) {
  const { chapter: slug } = await params;

  return (
    <div className="py-12 md:py-16">
      <div className="max-w-md mx-auto px-6 text-center">
        <div
          className="w-16 h-16 rounded-full mx-auto mb-6 flex items-center justify-center"
          style={{ backgroundColor: 'var(--chapter-accent)' }}
        >
          <svg width="32" height="32" viewBox="0 0 32 32" fill="none">
            <path
              d="M8 16L14 22L24 10"
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
          You are on the waitlist
        </h1>

        <p className="body-lg text-body mb-8">
          If a seat opens up, we will email you. You will have 24 hours to claim it before it is offered to the next person, so keep an eye on your inbox.
        </p>

        <Link
          href={`/alumni/${slug}`}
          className="inline-block px-6 py-3 rounded-sm body-base font-medium text-white transition-opacity hover:opacity-90"
          style={{ backgroundColor: 'var(--chapter-accent)' }}
        >
          Back to dinners
        </Link>
      </div>
    </div>
  );
}
