'use client';

import { useState } from 'react';

export default function CronRunButton({ jobKey }: { jobKey: string }) {
  const [running, setRunning] = useState(false);
  const [result, setResult] = useState<string | null>(null);
  const [dryRun, setDryRun] = useState(false);

  async function run() {
    setRunning(true);
    setResult(null);
    try {
      const res = await fetch(`/api/admin/cron/${jobKey}`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ dryRun }),
      });
      const j = await res.json();
      setResult(JSON.stringify(j.summary ?? j));
    } catch (err) {
      setResult(`Error: ${(err as Error).message}`);
    } finally {
      setRunning(false);
    }
  }

  return (
    <div className="space-y-1">
      <label className="flex items-center gap-1 text-xs">
        <input type="checkbox" checked={dryRun} onChange={(e) => setDryRun(e.target.checked)} />
        dry run
      </label>
      <button
        onClick={run}
        disabled={running}
        className="border border-neutral-300 px-2 py-1 rounded text-xs disabled:opacity-50"
      >
        {running ? 'Running…' : 'Run now'}
      </button>
      {result ? (
        <pre className="text-[10px] whitespace-pre-wrap break-all max-w-xs">{result}</pre>
      ) : null}
    </div>
  );
}
