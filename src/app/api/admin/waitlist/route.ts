import { NextResponse } from 'next/server';
import { requireSuperAdmin } from '@/lib/auth/admin';
import { query } from '@/lib/db';

export async function GET(req: Request) {
  await requireSuperAdmin();
  const url = new URL(req.url);
  const dinnerIdRaw = url.searchParams.get('dinner_id');
  if (!dinnerIdRaw) return NextResponse.json({ error: 'dinner_id_required' }, { status: 400 });
  const dinnerId = parseInt(dinnerIdRaw, 10);
  if (!Number.isFinite(dinnerId)) {
    return NextResponse.json({ error: 'dinner_id_invalid' }, { status: 400 });
  }
  const rows = await query(
    `SELECT we.id, we.dinner_id, we.chapter_id, we.guest_id, we.status,
            we.promoted_at, we.notified_at, we.created_at, we.updated_at,
            g.email AS guest_email, g.first_name AS guest_first_name,
            g.last_name AS guest_last_name
     FROM waitlist_entries we
     JOIN guests g ON g.id = we.guest_id
     WHERE we.dinner_id = $1
     ORDER BY we.created_at ASC`,
    [dinnerId],
  );
  return NextResponse.json({ entries: rows });
}
