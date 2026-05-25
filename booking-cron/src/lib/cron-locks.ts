export const CRON_LOCKS = {
  send_reminders: 1001,
  send_post_dinner: 1002,
  process_waitlist: 1003,
  expire_pending_reservations: 1004,
} as const;

export type CronJobName = keyof typeof CRON_LOCKS;
