import type { Chapter, Dinner } from './types';

export interface CalendarDinner {
  title: string;
  startsAt: Date;
  durationHours?: number;
  address: string;
  description?: string;
}

function pad(n: number): string {
  return String(n).padStart(2, '0');
}

function toUtcStamp(d: Date): string {
  return (
    `${d.getUTCFullYear()}${pad(d.getUTCMonth() + 1)}${pad(d.getUTCDate())}` +
    `T${pad(d.getUTCHours())}${pad(d.getUTCMinutes())}${pad(d.getUTCSeconds())}Z`
  );
}

function endOf(d: CalendarDinner): Date {
  const dur = (d.durationHours ?? 3) * 3600 * 1000;
  return new Date(d.startsAt.getTime() + dur);
}

function baseUrl(): string {
  return process.env.NEXT_PUBLIC_BASE_URL ?? 'https://con-vive.com';
}

export function generateGoogleCalendarUrl(d: CalendarDinner): string {
  const params = new URLSearchParams({
    action: 'TEMPLATE',
    text: d.title,
    dates: `${toUtcStamp(d.startsAt)}/${toUtcStamp(endOf(d))}`,
    details: d.description ?? '',
    location: d.address,
  });
  return `https://calendar.google.com/calendar/render?${params.toString()}`;
}

export function generateOutlookUrl(d: CalendarDinner): string {
  const params = new URLSearchParams({
    path: '/calendar/action/compose',
    rru: 'addevent',
    startdt: d.startsAt.toISOString(),
    enddt: endOf(d).toISOString(),
    subject: d.title,
    body: d.description ?? '',
    location: d.address,
  });
  return `https://outlook.live.com/calendar/0/deeplink/compose?${params.toString()}`;
}

export function generateIcsDownloadUrl(reservationCalendarToken: string): string {
  return `${baseUrl()}/api/calendar/${reservationCalendarToken}.ics`;
}

interface BuildIcsArgs {
  dinner: Pick<Dinner, 'id' | 'starts_at' | 'title' | 'description'>;
  chapter: Pick<Chapter, 'display_name'>;
  reservationId: number;
  reservationStatus: 'pending' | 'confirmed' | 'cancelled';
  fullAddress: string | null;
  durationHours?: number;
}

function escapeIcs(text: string): string {
  return text.replace(/\\/g, '\\\\').replace(/\n/g, '\\n').replace(/,/g, '\\,').replace(/;/g, '\\;');
}

export function buildIcsBody(args: BuildIcsArgs): string {
  const { dinner, chapter, reservationId, reservationStatus, fullAddress } = args;
  const start = new Date(dinner.starts_at);
  const end = new Date(start.getTime() + (args.durationHours ?? 3) * 3600 * 1000);
  const uid = `dinner-${dinner.id}-res-${reservationId}@con-vive.com`;
  const summary = `${chapter.display_name} dinner`;
  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Con-Vive//Alumni Dinners//EN',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    'BEGIN:VEVENT',
    `UID:${uid}`,
    `DTSTAMP:${toUtcStamp(new Date())}`,
    `DTSTART:${toUtcStamp(start)}`,
    `DTEND:${toUtcStamp(end)}`,
    `SUMMARY:${escapeIcs(summary)}`,
    `DESCRIPTION:${escapeIcs(dinner.description ?? dinner.title)}`,
  ];
  if (reservationStatus === 'confirmed' && fullAddress) {
    lines.push(`LOCATION:${escapeIcs(fullAddress)}`);
  }
  lines.push('END:VEVENT');
  lines.push('END:VCALENDAR');
  return lines.join('\r\n') + '\r\n';
}
