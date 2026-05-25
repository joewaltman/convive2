import { Resend } from 'resend';
import type { ReactElement } from 'react';
import type { Chapter } from './types';

let _client: Resend | null = null;
function client(): Resend {
  if (!_client) {
    _client = new Resend(process.env.RESEND_API_KEY ?? 're_placeholder');
  }
  return _client;
}

export interface SendEmailArgs {
  from: string;
  to: string | string[];
  replyTo?: string;
  subject: string;
  react: ReactElement;
  headers?: Record<string, string>;
}

export async function sendEmail(args: SendEmailArgs) {
  const { from, to, replyTo, subject, react, headers } = args;
  return client().emails.send({
    from,
    to,
    replyTo,
    subject,
    react,
    headers,
  });
}

export function platformFrom(): string {
  return process.env.EMAIL_FROM_DEFAULT ?? 'Con-Vive <noreply@invite.con-vive.com>';
}

export function chapterFrom(chapter: Pick<Chapter, 'from_display_name'>): string {
  const domain = process.env.EMAIL_FROM_DOMAIN ?? 'invite.con-vive.com';
  return `${chapter.from_display_name} <dinners@${domain}>`;
}

export function replyTo(): string {
  return process.env.EMAIL_REPLY_TO ?? 'joe@con-vive.com';
}

export function joeNotificationEmail(): string {
  return process.env.JOE_NOTIFICATION_EMAIL ?? 'joe@con-vive.com';
}

export function bulkHeaders(unsubscribeUrl: string): Record<string, string> {
  return {
    'List-Unsubscribe': `<${unsubscribeUrl}>`,
    'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click',
  };
}

/**
 * v1 simplification per spec: token is the plain guest id integer. Acceptable for v1
 * since the spec just says "per-guest unsubscribe URL"; harden later (e.g. SHA-256 with salt).
 */
export function unsubscribeUrl(guestId: number): string {
  const base = process.env.NEXT_PUBLIC_BASE_URL ?? 'https://con-vive.com';
  return `${base}/unsubscribe/${guestId}`;
}
