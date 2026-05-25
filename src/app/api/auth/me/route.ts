import { NextResponse } from 'next/server';
import { getCurrentGuest } from '@/lib/auth/guest';

export async function GET() {
  const guest = await getCurrentGuest();
  return NextResponse.json({ guest });
}
