import { NextResponse } from 'next/server';
import { requireSuperAdmin } from '@/lib/auth/admin';
import { listChapterLeads } from '@/lib/leads';

export async function GET() {
  await requireSuperAdmin();
  const leads = await listChapterLeads();
  return NextResponse.json({ leads });
}
