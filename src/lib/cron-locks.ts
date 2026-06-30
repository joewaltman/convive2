export const CRON_LOCKS = {
  send_reminders: 1001,
  send_post_dinner: 1002,
  process_waitlist: 1003,
  expire_pending_reservations: 1004,
  lunchclub_nudge: 3001,
  lunchclub_day_before_reminder: 3002,
  lunchclub_below_floor_cancel: 3003,
  lunchclub_monthly_loop: 3004,
} as const;

export type CronJobName = keyof typeof CRON_LOCKS;
