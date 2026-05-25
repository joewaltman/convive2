import { NextResponse } from 'next/server';
import { requireSuperAdmin } from '@/lib/auth/admin';
import { listVenueLeads } from '@/lib/leads';

export async function GET() {
  await requireSuperAdmin();
  const leads = await listVenueLeads();
  return NextResponse.json({ leads });
}
