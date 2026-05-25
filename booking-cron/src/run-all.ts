import type { JobSummary } from './lib/types';

interface JobResult {
  name: string;
  summary: JobSummary | null;
  error: Error | null;
}

async function runAll(): Promise<void> {
  const results: JobResult[] = [];

  // Import and run each job sequentially with error isolation
  try {
    const { main: sendReminders } = await import('./send-reminders');
    const summary = await sendReminders();
    results.push({ name: 'send_reminders', summary, error: null });
  } catch (err) {
    console.error('[run-all] send_reminders failed:', err);
    results.push({ name: 'send_reminders', summary: null, error: err as Error });
  }

  try {
    const { main: sendPostDinner } = await import('./send-post-dinner');
    const summary = await sendPostDinner();
    results.push({ name: 'send_post_dinner', summary, error: null });
  } catch (err) {
    console.error('[run-all] send_post_dinner failed:', err);
    results.push({ name: 'send_post_dinner', summary: null, error: err as Error });
  }

  try {
    const { main: processWaitlist } = await import('./process-waitlist');
    const summary = await processWaitlist();
    results.push({ name: 'process_waitlist', summary, error: null });
  } catch (err) {
    console.error('[run-all] process_waitlist failed:', err);
    results.push({ name: 'process_waitlist', summary: null, error: err as Error });
  }

  try {
    const { main: expirePending } = await import('./expire-pending-reservations');
    const summary = await expirePending();
    results.push({ name: 'expire_pending_reservations', summary, error: null });
  } catch (err) {
    console.error('[run-all] expire_pending_reservations failed:', err);
    results.push({ name: 'expire_pending_reservations', summary: null, error: err as Error });
  }

  // Print summary
  console.log('\n=== Run All Summary ===');
  for (const r of results) {
    if (r.error) {
      console.log(`  ${r.name}: FAILED - ${r.error.message}`);
    } else {
      console.log(`  ${r.name}: OK - ${JSON.stringify(r.summary)}`);
    }
  }
  console.log('=======================\n');

  // Always exit 0 even if some jobs failed (each job handles its own error reporting)
}

runAll()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('[run-all] unexpected fatal error:', err);
    process.exit(1);
  });
