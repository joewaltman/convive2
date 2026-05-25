import { NextResponse } from 'next/server';
import { requestAdminCode } from '@/lib/auth/admin';

export async function POST(req: Request) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'invalid_json' }, { status: 400 });
  }
  const email = typeof (body as { email?: unknown }).email === 'string'
    ? (body as { email: string }).email.trim()
    : '';
  if (!email) return NextResponse.json({ error: 'email_required' }, { status: 400 });
  await requestAdminCode(email);
  return NextResponse.json({ sent: true });
}
