import { NextResponse } from 'next/server';
import { requireSuperAdmin } from '@/lib/auth/admin';
import { searchGuestsByEmail } from '@/lib/guests';

export async function GET(req: Request) {
  await requireSuperAdmin();
  const url = new URL(req.url);
  const q = (url.searchParams.get('q') ?? '').trim();
  if (!q) return NextResponse.json({ guests: [] });
  const guests = await searchGuestsByEmail(q, 50);
  return NextResponse.json({ guests });
}
