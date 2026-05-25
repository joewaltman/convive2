import { NextResponse } from 'next/server';
import { requireSuperAdmin } from '@/lib/auth/admin';
import { query } from '@/lib/db';

interface CronRunRow {
  job_name: string;
  id: number;
  status: string;
  started_at: Date;
  completed_at: Date | null;
  error_message: string | null;
  summary: unknown;
}

export async function GET() {
  await requireSuperAdmin();
  const rows = await query<CronRunRow>(
    `SELECT DISTINCT ON (job_name) job_name, id, status, started_at, completed_at,
            error_message, summary
     FROM cron_runs
     ORDER BY job_name, started_at DESC`,
  );
  return NextResponse.json({ runs: rows });
}
