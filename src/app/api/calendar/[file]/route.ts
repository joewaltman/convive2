// Calendar route: spec wants URLs like /api/calendar/<token>.ics.
// Next.js 16 dynamic segments don't reliably handle dot-prefixed extensions
// in a separate parameter, so we accept a single [file] param that includes
// the optional .ics suffix and strip it server-side.

import { getReservationByCalendarToken } from '@/lib/reservations';
import { getDinnerWithRelations } from '@/lib/dinners';
import { buildIcsBody } from '@/lib/calendar';

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ file: string }> },
) {
  const { file } = await params;
  const token = file.endsWith('.ics') ? file.slice(0, -4) : file;
  if (!token) return new Response('Not Found', { status: 404 });

  const reservation = await getReservationByCalendarToken(token);
  if (!reservation) return new Response('Not Found', { status: 404 });

  const relations = await getDinnerWithRelations(reservation.dinner_id);
  if (!relations) return new Response('Not Found', { status: 404 });
  const { dinner, chapter, venue } = relations;

  const fullAddress =
    venue.address || venue.city
      ? [venue.address, venue.city].filter(Boolean).join(', ')
      : null;

  const body = buildIcsBody({
    dinner: {
      id: dinner.id,
      starts_at: dinner.starts_at,
      title: dinner.title,
      description: dinner.description,
    },
    chapter: { display_name: chapter.display_name },
    reservationId: reservation.id,
    reservationStatus: reservation.status,
    fullAddress,
  });

  return new Response(body, {
    headers: {
      'Content-Type': 'text/calendar; charset=utf-8',
      'Content-Disposition': `attachment; filename="dinner-${dinner.id}.ics"`,
    },
  });
}
