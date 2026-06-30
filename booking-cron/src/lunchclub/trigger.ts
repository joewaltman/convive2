export async function triggerLunchclubCron(job: string): Promise<void> {
  const base = process.env.LUNCHCLUB_CRON_URL ?? 'https://www.con-vive.com/api/admin/lunchclub/cron';
  const url = `${base.replace(/\/$/, '')}/${job}`;
  const secret = process.env.LUNCHCLUB_CRON_SECRET ?? '';
  if (!secret) {
    console.error(`[lunchclub:${job}] missing LUNCHCLUB_CRON_SECRET; aborting`);
    process.exit(1);
  }
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'x-cron-secret': secret,
    },
    body: '{}',
  });
  const text = await res.text();
  console.log(`[lunchclub:${job}] status=${res.status} body=${text.slice(0, 500)}`);
  if (!res.ok) {
    process.exit(1);
  }
}
