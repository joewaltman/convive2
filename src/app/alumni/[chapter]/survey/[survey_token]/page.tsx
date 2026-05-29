import { notFound } from 'next/navigation';
import Link from 'next/link';
import { getChapterBySlug } from '@/lib/chapters';
import { getReservationBySurveyToken } from '@/lib/reservations';
import { getDinnerWithRelations } from '@/lib/dinners';
import { getSurveyByReservationId } from '@/lib/surveys';
import { formatLAClock } from '@/lib/time';
import { SurveyForm } from './_components/SurveyForm';

interface PageProps {
  params: Promise<{ chapter: string; survey_token: string }>;
}

export default async function SurveyPage({ params }: PageProps) {
  const { chapter: slug, survey_token } = await params;

  const chapter = await getChapterBySlug(slug);
  if (!chapter) notFound();

  const reservation = await getReservationBySurveyToken(survey_token);
  if (!reservation) notFound();
  if (reservation.chapter_id !== chapter.id) notFound();

  const relations = await getDinnerWithRelations(reservation.dinner_id);
  if (!relations) notFound();
  const { dinner, venue } = relations;

  const existing = await getSurveyByReservationId(reservation.id);

  if (existing) {
    return (
      <div className="py-12 md:py-16">
        <div className="max-w-md mx-auto px-6 text-center">
          <h1 className="heading-1 mb-4 text-ink">Thanks for your feedback</h1>
          <p className="body-lg text-body mb-8">
            You&apos;ve already shared your thoughts on {dinner.title}. We appreciate it.
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

  return (
    <div className="py-12 md:py-16">
      <div className="max-w-2xl mx-auto px-6">
        <h1
          className="heading-1 mb-4"
          style={{ color: 'var(--chapter-primary)' }}
        >
          How was the dinner?
        </h1>
        <p className="body-lg text-body mb-8">
          A quick read on the venue, the food, and the value. Takes about a minute.
        </p>

        <div className="bg-surface rounded-sm p-4 mb-8">
          <p className="eyebrow mb-1">{venue.neighborhood || venue.city || 'Location'}</p>
          <h3
            className="heading-3 mb-2"
            style={{ color: 'var(--chapter-primary)' }}
          >
            {dinner.title}
          </h3>
          <p className="body-sm text-body">{formatLAClock(new Date(dinner.starts_at))}</p>
          <p className="body-sm text-warm-gray">{venue.name}</p>
        </div>

        <SurveyForm surveyToken={survey_token} />
      </div>
    </div>
  );
}
