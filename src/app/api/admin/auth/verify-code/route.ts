import { NextResponse } from 'next/server';
import { verifyAdminCode, createAdminSession } from '@/lib/auth/admin';

export async function POST(req: Request) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'invalid_json' }, { status: 400 });
  }
  const b = body as { email?: unknown; code?: unknown };
  const email = typeof b.email === 'string' ? b.email.trim() : '';
  const code = typeof b.code === 'string' ? b.code.trim() : '';
  if (!email || !code) {
    return NextResponse.json({ error: 'email_and_code_required' }, { status: 400 });
  }
  const admin = await verifyAdminCode(email, code);
  if (!admin) {
    return NextResponse.json({ error: 'invalid_code' }, { status: 401 });
  }
  await createAdminSession(admin.id);
  return NextResponse.json({ admin });
}
