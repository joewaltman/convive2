import * as React from 'react';
import { EmailShell, H1, P, Eyebrow, palette } from './_shared';
import { formatLAClock } from '@/lib/time';

export interface ReservationCancellationProps {
  chapterDisplayName: string;
  chapterAccent: string;
  dinnerTitle: string;
  dinnerStartsAt: Date;
  wasPaid: boolean;
}

export default function ReservationCancellation(p: ReservationCancellationProps) {
  return (
    <EmailShell accent={p.chapterAccent}>
      <Eyebrow>{p.chapterDisplayName}</Eyebrow>
      <H1>Your reservation is cancelled</H1>
      <P>
        Your booking for <strong>{p.dinnerTitle}</strong> on {formatLAClock(p.dinnerStartsAt)} has been cancelled.
      </P>
      {p.wasPaid ? (
        <P style={{ color: palette.warm }}>
          If you paid and qualify for a refund, the organizer will process it within 2 business days.
        </P>
      ) : null}
    </EmailShell>
  );
}
