import { NextResponse } from 'next/server';
import { requireGuest } from '@/lib/auth/guest';
import { listReservationsForGuest } from '@/lib/reservations';

export async function GET() {
  let guest;
  try {
    guest = await requireGuest();
  } catch {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }
  const reservations = await listReservationsForGuest(guest.id);
  return NextResponse.json({ reservations });
}
