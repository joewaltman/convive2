/**
 * Title-case a person name for display. Handles all-caps and all-lower
 * legacy data, plus internal separators (spaces, hyphens, apostrophes).
 * Returns '' for null/undefined/blank input.
 */
export function formatDisplayName(input: string | null | undefined): string {
  if (!input) return '';
  const trimmed = input.trim();
  if (trimmed.length === 0) return '';
  const lower = trimmed.toLowerCase();
  return lower.replace(/(^|[^\p{L}])(\p{L})/gu, (_m, sep, ch) => sep + ch.toUpperCase());
}

const LA_TZ = 'America/Los_Angeles';

/** Format a Date as e.g. "Tue Mar 04 at 12:00 pm" in LA time. No em dashes. */
export function formatDateTimeLA(d: Date): string {
  const day = new Intl.DateTimeFormat('en-US', {
    timeZone: LA_TZ,
    weekday: 'short',
    month: 'short',
    day: '2-digit',
  }).format(d);
  const time = new Intl.DateTimeFormat('en-US', {
    timeZone: LA_TZ,
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  })
    .format(d)
    .toLowerCase()
    .replace(/\s/g, ' ');
  return `${day} at ${time}`;
}

/** Format a Date as e.g. "Tue Mar 04" in LA time. */
export function formatDateLA(d: Date): string {
  return new Intl.DateTimeFormat('en-US', {
    timeZone: LA_TZ,
    weekday: 'short',
    month: 'short',
    day: '2-digit',
  }).format(d);
}

/** Format a Date as e.g. "12:00 pm" in LA time. */
export function formatTimeLA(d: Date): string {
  return new Intl.DateTimeFormat('en-US', {
    timeZone: LA_TZ,
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  })
    .format(d)
    .toLowerCase();
}

/** Format a cent amount as $X or $X.YZ (drops .00). */
export function formatDollars(cents: number): string {
  const dollars = cents / 100;
  if (Number.isInteger(dollars)) return `$${dollars}`;
  return `$${dollars.toFixed(2)}`;
}

/**
 * Convert a US phone in any local format (digits, with or without +1) to
 * E.164 ("+15551234567"). Returns null if input cannot be normalized to a
 * 10-digit US number.
 */
export function phoneE164(input: string | null | undefined): string | null {
  if (!input) return null;
  const digits = String(input).replace(/\D+/g, '');
  if (digits.length === 11 && digits.startsWith('1')) return `+${digits}`;
  if (digits.length === 10) return `+1${digits}`;
  return null;
}

const DOW = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
export function dayOfWeekLabel(day: number): string {
  if (day < 0 || day > 6) return String(day);
  return DOW[day];
}
