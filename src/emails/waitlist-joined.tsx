import * as React from 'react';
import { EmailShell, H1, P, Eyebrow } from './_shared';
import { formatLAClock } from '@/lib/time';

export interface WaitlistJoinedProps {
  chapterDisplayName: string;
  chapterAccent: string;
  dinnerTitle: string;
  dinnerStartsAt: Date;
  positionApprox?: number;
}

export default function WaitlistJoined(p: WaitlistJoinedProps) {
  return (
    <EmailShell accent={p.chapterAccent}>
      <Eyebrow>{p.chapterDisplayName}</Eyebrow>
      <H1>You&apos;re on the waitlist</H1>
      <P>
        We added you to the waitlist for <strong>{p.dinnerTitle}</strong> on {formatLAClock(p.dinnerStartsAt)}.
      </P>
      {p.positionApprox ? <P>You are roughly number {p.positionApprox} on the list.</P> : null}
      <P>If a seat opens up, you&apos;ll get an email with a 24-hour claim link.</P>
    </EmailShell>
  );
}
