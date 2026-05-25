import { NextResponse } from 'next/server';
import { clearGuestSession } from '@/lib/auth/guest';

export async function POST() {
  await clearGuestSession();
  return NextResponse.json({ ok: true });
}
