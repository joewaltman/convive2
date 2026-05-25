import * as React from 'react';
import { EmailShell, H1, P, Eyebrow } from './_shared';
import { formatLAClock } from '@/lib/time';

export interface ReservationCancelledNotifyJoeProps {
  reservationId: number;
  guestEmail: string;
  guestName: string;
  chapterDisplayName: string;
  dinnerTitle: string;
  dinnerStartsAt: Date;
  amountPaidDollars: string | null;
  wasPromoted: boolean;
}

export default function ReservationCancelledNotifyJoe(p: ReservationCancelledNotifyJoeProps) {
  return (
    <EmailShell>
      <Eyebrow>Refund decision needed</Eyebrow>
      <H1>Reservation #{p.reservationId} cancelled</H1>
      <P>{p.guestName} ({p.guestEmail})</P>
      <P>
        {p.chapterDisplayName}: {p.dinnerTitle} on {formatLAClock(p.dinnerStartsAt)}
      </P>
      {p.amountPaidDollars ? <P>Amount paid: ${p.amountPaidDollars}</P> : <P>Not paid (no refund needed).</P>}
      {p.wasPromoted ? <P>Note: a waitlist guest has been promoted and notified.</P> : null}
    </EmailShell>
  );
}
