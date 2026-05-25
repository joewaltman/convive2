import { requireSuperAdmin } from '@/lib/auth/admin';
import { query } from '@/lib/db';
import { formatLAClock } from '@/lib/time';
import CronRunButton from './CronRunButton';

interface CronRunRow {
  job_name: string;
  id: number;
  status: string;
  started_at: Date;
  completed_at: Date | null;
  error_message: string | null;
  summary: unknown;
}

const JOBS: Array<{ key: string; label: string }> = [
  { key: 'send-reminders', label: 'Send reminders' },
  { key: 'send-post-dinner', label: 'Send post-dinner emails' },
  { key: 'process-waitlist', label: 'Process waitlist' },
  { key: 'expire-pending-reservations', label: 'Expire pending reservations' },
];

const KEY_TO_JOB_NAME: Record<string, string> = {
  'send-reminders': 'send_reminders',
  'send-post-dinner': 'send_post_dinner',
  'process-waitlist': 'process_waitlist',
  'expire-pending-reservations': 'expire_pending_reservations',
};

export default async function SystemPage() {
  await requireSuperAdmin();
  const rows = await query<CronRunRow>(
    `SELECT DISTINCT ON (job_name) job_name, id, status, started_at, completed_at,
            error_message, summary
     FROM cron_runs
     ORDER BY job_name, started_at DESC`,
  );
  const byJob = new Map<string, CronRunRow>();
  for (const r of rows) byJob.set(r.job_name, r);

  return (
    <div>
      <h1 className="text-2xl font-semibold mb-4">System</h1>
      <p className="text-sm text-neutral-600 mb-6">
        Latest run per cron job. Use Run now to trigger a job manually (subject to advisory lock).
      </p>
      <div className="overflow-x-auto border border-neutral-200 rounded">
        <table className="w-full text-sm">
          <thead className="bg-neutral-50 border-b border-neutral-200">
            <tr>
              <th className="text-left px-3 py-2">Job</th>
              <th className="text-left px-3 py-2">Last status</th>
              <th className="text-left px-3 py-2">Started</th>
              <th className="text-left px-3 py-2">Completed</th>
              <th className="text-left px-3 py-2">Summary</th>
              <th className="text-left px-3 py-2">Run</th>
            </tr>
          </thead>
          <tbody>
            {JOBS.map((j) => {
              const last = byJob.get(KEY_TO_JOB_NAME[j.key]);
              return (
                <tr key={j.key} className="border-b border-neutral-100 align-top">
                  <td className="px-3 py-2">{j.label}</td>
                  <td className="px-3 py-2">{last?.status ?? '—'}</td>
                  <td className="px-3 py-2 whitespace-nowrap">
                    {last ? formatLAClock(last.started_at) : '—'}
                  </td>
                  <td className="px-3 py-2 whitespace-nowrap">
                    {last?.completed_at ? formatLAClock(last.completed_at) : '—'}
                  </td>
                  <td className="px-3 py-2">
                    {last?.error_message ? (
                      <code className="text-xs text-red-700 whitespace-pre-wrap break-all">
                        {last.error_message.slice(0, 400)}
                      </code>
                    ) : last?.summary != null ? (
                      <code className="text-xs whitespace-pre-wrap break-all">
                        {JSON.stringify(last.summary)}
                      </code>
                    ) : (
                      '—'
                    )}
                  </td>
                  <td className="px-3 py-2">
                    <CronRunButton jobKey={j.key} />
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
