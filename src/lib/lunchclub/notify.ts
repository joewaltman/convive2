import * as React from 'react';
import { sendEmail, platformFrom, replyTo, joeNotificationEmail } from '@/lib/email';
import { formatPhone } from './phone';
import type { SignupInput } from './types';

export interface JoeNotificationProps {
  signupId: number;
  input: SignupInput;
  markedProspectSignedUp: boolean;
}

function P(props: { children: React.ReactNode }): React.ReactElement {
  return React.createElement(
    'p',
    {
      style: {
        fontFamily: 'system-ui, sans-serif',
        fontSize: 14,
        lineHeight: 1.5,
        margin: '0 0 12px 0',
        color: '#1A1A1A',
      },
    },
    props.children,
  );
}

export function buildJoeNotificationEmail(props: JoeNotificationProps): React.ReactElement {
  const { input, signupId, markedProspectSignedUp } = props;
  const fullName = [input.first_name, input.last_name].filter(Boolean).join(' ');
  const weekdays = input.weekday_availability.join(', ') || '(none)';
  const phoneDisplay = formatPhone(input.phone);

  return React.createElement(
    'div',
    {
      style: {
        fontFamily: 'system-ui, sans-serif',
        padding: 24,
        backgroundColor: '#F6F1E8',
        color: '#1A1A1A',
      },
    },
    React.createElement(
      'h1',
      { style: { fontSize: 20, margin: '0 0 16px 0' } },
      `New Lunch Club signup #${signupId}`,
    ),
    P({ children: React.createElement('strong', null, `Name: ${fullName || '(blank)'}`) }),
    P({ children: `Email: ${input.email}` }),
    P({ children: `Phone: ${phoneDisplay}` }),
    P({ children: `Weekdays: ${weekdays}` }),
    P({ children: `Source: ${input.source}` }),
    P({
      children: `Prospect marked signed_up: ${markedProspectSignedUp ? 'yes' : 'no'}`,
    }),
  );
}

export async function sendJoeNotification(props: JoeNotificationProps): Promise<void> {
  const subject = `[Lunch Club] New signup: ${props.input.first_name} ${
    props.input.last_name ?? ''
  } (${props.input.source})`.trim();
  const to = joeNotificationEmail();
  const result = await sendEmail({
    from: platformFrom(),
    to,
    replyTo: replyTo(),
    subject,
    react: buildJoeNotificationEmail(props),
  });
  if (result?.error) {
    const e = result.error as { name?: string; message?: string };
    throw new Error(
      `Resend send failed for ${to}: ${e.name ?? 'UnknownError'}: ${e.message ?? 'no message'}`,
    );
  }
  const id = result?.data?.id ?? '(no id)';
  console.log(`[lunchclub] joe notification sent to ${to} (resend id ${id})`);
}
