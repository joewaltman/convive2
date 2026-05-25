import { getReservationByCancelToken } from '@/lib/reservations';
import { getDinnerWithRelations } from '@/lib/dinners';
import { formatLAClock } from '@/lib/time';
import ConfirmCancel from './_components/ConfirmCancel';

interface CancelPageProps {
  params: Promise<{ cancel_token: string }>;
}

export default async function CancelPage({ params }: CancelPageProps) {
  const { cancel_token } = await params;

  const reservation = await getReservationByCancelToken(cancel_token);

  if (!reservation) {
    return (
      <div className="min-h-screen bg-bone flex items-center justify-center px-4">
        <div className="w-full max-w-md bg-surface border border-border rounded-lg p-8 text-center">
          <h1 className="heading-2 mb-4">Invalid cancellation link</h1>
          <p className="body-base text-warm-gray">
            This cancellation link is not valid. It may have already been used or the reservation does not exist.
          </p>
        </div>
      </div>
    );
  }

  if (reservation.status === 'cancelled') {
    return (
      <div className="min-h-screen bg-bone flex items-center justify-center px-4">
        <div className="w-full max-w-md bg-surface border border-border rounded-lg p-8 text-center">
          <h1 className="heading-2 mb-4">Already cancelled</h1>
          <p className="body-base text-warm-gray">
            This reservation has already been cancelled.
          </p>
        </div>
      </div>
    );
  }

  const dinnerData = await getDinnerWithRelations(reservation.dinner_id);

  if (!dinnerData) {
    return (
      <div className="min-h-screen bg-bone flex items-center justify-center px-4">
        <div className="w-full max-w-md bg-surface border border-border rounded-lg p-8 text-center">
          <h1 className="heading-2 mb-4">Dinner not found</h1>
          <p className="body-base text-warm-gray">
            We could not find the dinner associated with this reservation.
          </p>
        </div>
      </div>
    );
  }

  const { dinner, chapter, venue } = dinnerData;
  const now = new Date();
  const dinnerDate = new Date(dinner.starts_at);

  if (dinnerDate < now) {
    return (
      <div className="min-h-screen bg-bone flex items-center justify-center px-4">
        <div className="w-full max-w-md bg-surface border border-border rounded-lg p-8 text-center">
          <h1 className="heading-2 mb-4">Dinner has passed</h1>
          <p className="body-base text-warm-gray">
            This dinner has already happened. Reservations for past dinners cannot be cancelled.
          </p>
        </div>
      </div>
    );
  }

  if (reservation.status !== 'confirmed') {
    return (
      <div className="min-h-screen bg-bone flex items-center justify-center px-4">
        <div className="w-full max-w-md bg-surface border border-border rounded-lg p-8 text-center">
          <h1 className="heading-2 mb-4">Cannot cancel</h1>
          <p className="body-base text-warm-gray">
            This reservation is not in a confirmed state and cannot be cancelled.
          </p>
        </div>
      </div>
    );
  }

  const wasPaid = reservation.amount_paid_cents != null && reservation.amount_paid_cents > 0;

  return (
    <ConfirmCancel
      reservationId={reservation.id}
      cancelToken={cancel_token}
      dinnerTitle={dinner.title}
      chapterDisplayName={chapter.display_name}
      dinnerDateFormatted={formatLAClock(dinnerDate)}
      venueName={venue.name}
      wasPaid={wasPaid}
    />
  );
}
