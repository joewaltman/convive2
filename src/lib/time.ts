import { fromZonedTime } from 'date-fns-tz';

export const LA_TZ = 'America/Los_Angeles';

/**
 * Parse admin input "YYYY-MM-DD HH:mm" as Los Angeles local time,
 * return a Date in UTC suitable for storage.
 */
export function parseLAInput(input: string): Date {
  const normalized = input.trim().replace(' ', 'T');
  return fromZonedTime(normalized, LA_TZ);
}

/** Canonical: "Friday, June 12, 2026 at 7:00 PM PT" */
export function formatLAClock(date: Date): string {
  return date.toLocaleString('en-US', {
    timeZone: LA_TZ,
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    timeZoneName: 'short',
  });
}

export function formatLADate(date: Date): string {
  return date.toLocaleDateString('en-US', {
    timeZone: LA_TZ,
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });
}

export function formatLATime(date: Date): string {
  return date.toLocaleTimeString('en-US', {
    timeZone: LA_TZ,
    hour: 'numeric',
    minute: '2-digit',
  });
}
