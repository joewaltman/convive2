/**
 * Pure SMS body builders for Lunch Club guest messages.
 *
 * Rules:
 *  - No em dashes anywhere in guest-facing copy.
 *  - Every guest message ends with "\n\nThanks, Joe".
 *  - Builders are pure; they never call the network.
 */

import type { BookingWithContext } from './types';
import {
  formatDateLA,
  formatDateTimeLA,
  formatDollars,
  formatTimeLA,
  phoneE164,
  formatDisplayName,
} from './format';

interface OutboundSms {
  to: string;
  body: string;
}

const SIGN_OFF = '\n\nThanks, Joe';

function firstNameOf(b: BookingWithContext): string {
  const raw = b.signup.first_name ?? '';
  return formatDisplayName(raw) || 'there';
}

function toPhone(b: BookingWithContext): string {
  return phoneE164(b.signup.phone) ?? '';
}

function bookingUrl(b: BookingWithContext, baseUrl: string): string {
  const root = baseUrl.replace(/\/+$/, '');
  return `${root}/lunchclub/book/${b.booking.magic_token}`;
}

function priceLine(b: BookingWithContext): string {
  return formatDollars(b.lunch.price_cents);
}

export function buildInviteSms(
  b: BookingWithContext,
  baseUrl: string,
): OutboundSms {
  const first = firstNameOf(b);
  const date = formatDateLA(b.lunch.starts_at);
  const time = formatTimeLA(b.lunch.starts_at);
  const body =
    `Hi ${first}, it's lunch club time. ` +
    `Your standing table meets ${date} at ${time} at ${b.lunch.venue}. ` +
    `Cost is ${priceLine(b)} per seat. ` +
    `Reserve your spot here: ${bookingUrl(b, baseUrl)}` +
    SIGN_OFF;
  return { to: toPhone(b), body };
}

export function buildNudgeSms(
  b: BookingWithContext,
  baseUrl: string,
): OutboundSms {
  const first = firstNameOf(b);
  const date = formatDateLA(b.lunch.starts_at);
  const body =
    `Hi ${first}, friendly nudge that booking for the ${date} lunch ` +
    `at ${b.lunch.venue} closes in about 24 hours. ` +
    `If you can make it, grab your seat here: ${bookingUrl(b, baseUrl)}` +
    SIGN_OFF;
  return { to: toPhone(b), body };
}

export function buildConfirmationSms(b: BookingWithContext): OutboundSms {
  const first = firstNameOf(b);
  const when = formatDateTimeLA(b.lunch.starts_at);
  const body =
    `Hi ${first}, you're confirmed for lunch on ${when} ` +
    `at ${b.lunch.venue} (${b.lunch.address}). ` +
    `See you there.` +
    SIGN_OFF;
  return { to: toPhone(b), body };
}

export function buildDayBeforeReminderSms(b: BookingWithContext): OutboundSms {
  const first = firstNameOf(b);
  const time = formatTimeLA(b.lunch.starts_at);
  const body =
    `Hi ${first}, quick reminder that your lunch is tomorrow at ${time} ` +
    `at ${b.lunch.venue} (${b.lunch.address}). ` +
    `Looking forward to it.` +
    SIGN_OFF;
  return { to: toPhone(b), body };
}

export function buildGuestCancelSms(
  b: BookingWithContext,
  refunded: boolean,
): OutboundSms {
  const first = firstNameOf(b);
  const when = formatDateTimeLA(b.lunch.starts_at);
  const refundLine = refunded
    ? `Your payment has been refunded.`
    : `Because cancellation was within 48 hours of the lunch, no refund will be issued.`;
  const body =
    `Hi ${first}, your reservation for ${when} at ${b.lunch.venue} ` +
    `is cancelled. ${refundLine}` +
    SIGN_OFF;
  return { to: toPhone(b), body };
}

export function buildLunchCancelledSms(
  b: BookingWithContext,
  refunded: boolean,
): OutboundSms {
  const first = firstNameOf(b);
  const when = formatDateTimeLA(b.lunch.starts_at);
  const refundLine = refunded
    ? `Your payment has been refunded.`
    : `No payment was charged, so there is nothing to refund.`;
  const body =
    `Hi ${first}, the lunch on ${when} at ${b.lunch.venue} has been cancelled ` +
    `because we did not hit the minimum number of seats. ${refundLine} ` +
    `Next month's lunch invite will go out soon.` +
    SIGN_OFF;
  return { to: toPhone(b), body };
}
