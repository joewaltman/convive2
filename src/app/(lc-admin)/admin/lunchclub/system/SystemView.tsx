'use client';

import { useState } from 'react';

type Job = 'nudge' | 'day-before' | 'below-floor' | 'monthly';

const JOBS: { id: Job; name: string; description: string; schedule: string }[] = [
  {
    id: 'nudge',
    name: 'Nudge',
    description:
      'SMS invited-but-unpaid bookings whose lunch cutoff is roughly 24 hours away. One nudge per booking.',
    schedule: 'Hourly',
  },
  {
    id: 'day-before',
    name: 'Day-before reminder',
    description:
      'SMS paid bookings whose lunch is tomorrow Los Angeles time. One reminder per booking.',
    schedule: 'Daily at 10am PT',
  },
  {
    id: 'below-floor',
    name: 'Below-floor cancel',
    description:
      'At each lunch cutoff: confirms the lunch if at least 4 paid seats, otherwise cancels, refunds paid bookings, and SMSs all invitees.',
    schedule: 'Every 15 minutes',
  },
  {
    id: 'monthly',
    name: 'Monthly loop',
    description:
      'Closes past lunches, ticks non-pay counters (3 strikes releases a member), and clones next week\u2019s lunch with invites for each active table.',
    schedule: 'Daily at 10am PT',
  },
];

type RunState =
  | { status: 'idle' }
  | { status: 'running' }
  | { status: 'ok'; summary: string }
  | { status: 'error'; message: string };

export default function SystemView() {
  const [state, setState] = useState<Record<Job, RunState>>(() =>
    JOBS.reduce(
      (acc, j) => {
        acc[j.id] = { status: 'idle' };
        return acc;
      },
      {} as Record<Job, RunState>,
    ),
  );

  async function run(job: Job, dryRun: boolean) {
    setState((s) => ({ ...s, [job]: { status: 'running' } }));
    try {
      const res = await fetch(`/api/admin/lunchclub/cron/${job}`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ dryRun }),
      });
      const text = await res.text();
      if (!res.ok) {
        setState((s) => ({
          ...s,
          [job]: { status: 'error', message: `HTTP ${res.status}: ${text.slice(0, 500)}` },
        }));
        return;
      }
      setState((s) => ({
        ...s,
        [job]: { status: 'ok', summary: text.slice(0, 2000) },
      }));
    } catch (err) {
      setState((s) => ({
        ...s,
        [job]: { status: 'error', message: err instanceof Error ? err.message : String(err) },
      }));
    }
  }

  return (
    <div className="space-y-4">
      {JOBS.map((j) => {
        const s = state[j.id];
        const running = s.status === 'running';
        return (
          <div key={j.id} className="border border-neutral-200 rounded-md p-4 space-y-3">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className="font-semibold">{j.name}</h2>
                <p className="text-sm text-neutral-600 mt-1">{j.description}</p>
                <p className="text-xs text-neutral-500 mt-1">Schedule: {j.schedule}</p>
              </div>
              <div className="flex gap-2 shrink-0">
                <button
                  type="button"
                  onClick={() => run(j.id, true)}
                  disabled={running}
                  className="text-sm border border-neutral-300 rounded px-3 py-1 hover:bg-neutral-50 disabled:opacity-50"
                >
                  Dry run
                </button>
                <button
                  type="button"
                  onClick={() => run(j.id, false)}
                  disabled={running}
                  className="text-sm bg-amber-600 text-white rounded px-3 py-1 hover:bg-amber-700 disabled:opacity-50"
                >
                  {running ? 'Running...' : 'Run now'}
                </button>
              </div>
            </div>
            {s.status === 'ok' && (
              <pre className="text-xs bg-neutral-50 border border-neutral-200 rounded p-2 overflow-x-auto whitespace-pre-wrap">
                {s.summary}
              </pre>
            )}
            {s.status === 'error' && (
              <pre className="text-xs bg-red-50 border border-red-200 text-red-900 rounded p-2 overflow-x-auto whitespace-pre-wrap">
                {s.message}
              </pre>
            )}
          </div>
        );
      })}
    </div>
  );
}
