import { NextResponse } from 'next/server';
import { getReservationBySurveyToken } from '@/lib/reservations';
import { getSurveyByReservationId, submitSurvey } from '@/lib/surveys';

interface RouteContext {
  params: Promise<{ survey_token: string }>;
}

interface SubmitBody {
  venue_rating?: unknown;
  food_rating?: unknown;
  value_rating?: unknown;
  feedback?: unknown;
}

function parseRating(v: unknown, label: string): number | { error: string } {
  if (typeof v !== 'number' || !Number.isInteger(v) || v < 1 || v > 5) {
    return { error: `Invalid ${label} (must be an integer 1–5)` };
  }
  return v;
}

export async function POST(req: Request, ctx: RouteContext) {
  const { survey_token } = await ctx.params;
  if (!survey_token) {
    return NextResponse.json({ error: 'Missing survey token' }, { status: 400 });
  }

  const reservation = await getReservationBySurveyToken(survey_token);
  if (!reservation) {
    return NextResponse.json({ error: 'Survey not found' }, { status: 404 });
  }

  let body: SubmitBody;
  try {
    body = (await req.json()) as SubmitBody;
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
  }

  const venue = parseRating(body.venue_rating, 'venue rating');
  if (typeof venue !== 'number') return NextResponse.json(venue, { status: 400 });
  const food = parseRating(body.food_rating, 'food rating');
  if (typeof food !== 'number') return NextResponse.json(food, { status: 400 });
  const value = parseRating(body.value_rating, 'value rating');
  if (typeof value !== 'number') return NextResponse.json(value, { status: 400 });

  let feedback: string | null = null;
  if (body.feedback != null) {
    if (typeof body.feedback !== 'string') {
      return NextResponse.json({ error: 'Invalid feedback' }, { status: 400 });
    }
    const trimmed = body.feedback.trim();
    if (trimmed.length > 2000) {
      return NextResponse.json(
        { error: 'Feedback too long (max 2000 characters)' },
        { status: 400 },
      );
    }
    feedback = trimmed || null;
  }

  const existing = await getSurveyByReservationId(reservation.id);
  if (existing) {
    return NextResponse.json(
      { error: 'A response has already been submitted for this reservation.' },
      { status: 409 },
    );
  }

  await submitSurvey({
    reservationId: reservation.id,
    dinnerId: reservation.dinner_id,
    venueRating: venue,
    foodRating: food,
    valueRating: value,
    feedback,
  });

  return NextResponse.json({ ok: true });
}
