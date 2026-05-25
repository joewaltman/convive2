import * as React from 'react';
import { EmailShell, H1, P, Eyebrow } from './_shared';

export interface WaitlistExpiredProps {
  chapterDisplayName: string;
  chapterAccent: string;
  dinnerTitle: string;
}

export default function WaitlistExpired(p: WaitlistExpiredProps) {
  return (
    <EmailShell accent={p.chapterAccent}>
      <Eyebrow>{p.chapterDisplayName}</Eyebrow>
      <H1>Your waitlist spot expired</H1>
      <P>
        We held a seat for you at <strong>{p.dinnerTitle}</strong>, but the 24-hour claim window passed and the seat went to the next person on the list.
      </P>
      <P>We hope to see you at a future dinner.</P>
    </EmailShell>
  );
}
