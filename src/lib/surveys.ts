import { query } from './db';

export interface DinnerSurvey {
  id: number;
  reservation_id: number;
  dinner_id: number;
  venue_rating: number;
  food_rating: number;
  value_rating: number;
  feedback: string | null;
  submitted_at: Date;
}

const COLS = `id, reservation_id, dinner_id, venue_rating, food_rating, value_rating,
  feedback, submitted_at`;

export async function getSurveyByReservationId(
  reservationId: number,
): Promise<DinnerSurvey | null> {
  const rows = await query<DinnerSurvey>(
    `SELECT ${COLS} FROM dinner_surveys WHERE reservation_id = $1`,
    [reservationId],
  );
  return rows[0] ?? null;
}

export interface SubmitSurveyInput {
  reservationId: number;
  dinnerId: number;
  venueRating: number;
  foodRating: number;
  valueRating: number;
  feedback: string | null;
}

export async function submitSurvey(input: SubmitSurveyInput): Promise<DinnerSurvey> {
  const rows = await query<DinnerSurvey>(
    `INSERT INTO dinner_surveys
       (reservation_id, dinner_id, venue_rating, food_rating, value_rating, feedback)
     VALUES ($1, $2, $3, $4, $5, $6)
     RETURNING ${COLS}`,
    [
      input.reservationId,
      input.dinnerId,
      input.venueRating,
      input.foodRating,
      input.valueRating,
      input.feedback,
    ],
  );
  return rows[0];
}

export interface SurveyForAdmin {
  id: number;
  reservation_id: number;
  guest_first_name: string;
  guest_last_name: string;
  venue_rating: number;
  food_rating: number;
  value_rating: number;
  feedback: string | null;
  submitted_at: Date;
}

export async function listSurveysForDinner(dinnerId: number): Promise<SurveyForAdmin[]> {
  return query<SurveyForAdmin>(
    `SELECT s.id, s.reservation_id, g.first_name AS guest_first_name,
            g.last_name AS guest_last_name, s.venue_rating, s.food_rating,
            s.value_rating, s.feedback, s.submitted_at
     FROM dinner_surveys s
     JOIN reservations r ON r.id = s.reservation_id
     JOIN guests g ON g.id = r.guest_id
     WHERE s.dinner_id = $1
     ORDER BY s.submitted_at ASC`,
    [dinnerId],
  );
}
