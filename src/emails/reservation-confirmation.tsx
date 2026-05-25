import * as React from 'react';
import { EmailShell, H1, P, Button, Divider, Eyebrow, palette } from './_shared';
import { formatLAClock } from '@/lib/time';

export interface ReservationConfirmationProps {
  chapterDisplayName: string;
  chapterAccent: string;
  dinnerTitle: string;
  dinnerStartsAt: Date;
  venueName: string;
  fullAddress: string;
  parkingNote: string | null;
  menu: string | null;
  bringsPartner: boolean;
  amountPaidDollars: string;
  googleCalendarUrl: string;
  outlookUrl: string;
  icsUrl: string;
  cancelUrl: string;
}

export default function ReservationConfirmation(p: ReservationConfirmationProps) {
  return (
    <EmailShell accent={p.chapterAccent}>
      <Eyebrow>{p.chapterDisplayName}</Eyebrow>
      <H1>You&apos;re confirmed for the dinner</H1>
      {p.bringsPartner ? (
        <P>You and your partner are confirmed.</P>
      ) : (
        <P>Your seat is confirmed. We look forward to seeing you.</P>
      )}

      <Divider />

      <P style={{ fontWeight: 600, color: palette.ink }}>{p.dinnerTitle}</P>
      <P>{formatLAClock(p.dinnerStartsAt)}</P>
      <P>{p.venueName}</P>
      <P style={{ color: palette.warm }}>{p.fullAddress}</P>
      {p.parkingNote ? <P style={{ color: palette.warm, fontSize: 13 }}>Parking: {p.parkingNote}</P> : null}

      {p.menu ? (
        <>
          <Divider />
          <Eyebrow>Menu</Eyebrow>
          <P style={{ whiteSpace: 'pre-line' }}>{p.menu}</P>
        </>
      ) : null}

      <Divider />
      <P>Amount paid: ${p.amountPaidDollars}</P>

      <Divider />
      <Eyebrow>Add to your calendar</Eyebrow>
      <div>
        <Button color={p.chapterAccent} href={p.googleCalendarUrl}>Google Calendar</Button>
        <Button color={p.chapterAccent} href={p.outlookUrl}>Outlook</Button>
        <Button color={p.chapterAccent} href={p.icsUrl}>Download .ics</Button>
      </div>

      <Divider />
      <P style={{ color: palette.warm, fontSize: 13 }}>
        Plans change? You can cancel here. If you paid, the organizer will issue a refund within 2 business days.
      </P>
      <P>
        <a href={p.cancelUrl} style={{ color: palette.terracotta }}>Cancel my reservation</a>
      </P>
    </EmailShell>
  );
}
