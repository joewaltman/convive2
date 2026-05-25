import * as React from 'react';
import { EmailShell, H1, P, Button, Divider, Eyebrow, palette } from './_shared';
import { formatLAClock } from '../lib/time';

export interface WaitlistPromotedProps {
  chapterDisplayName: string;
  chapterAccent: string;
  dinnerTitle: string;
  dinnerStartsAt: Date;
  priceDollars: string;
  claimUrl: string;
}

export default function WaitlistPromoted(p: WaitlistPromotedProps) {
  return (
    <EmailShell accent={p.chapterAccent}>
      <Eyebrow>{p.chapterDisplayName}</Eyebrow>
      <H1>A seat opened up. Claim it within 24 hours.</H1>
      <P>
        A seat just freed up for <strong>{p.dinnerTitle}</strong> on {formatLAClock(p.dinnerStartsAt)}.
      </P>
      <P>Claim it within 24 hours, or it will go to the next person on the waitlist.</P>
      <Divider />
      <Button color={p.chapterAccent} href={p.claimUrl}>Pay ${p.priceDollars} and claim my seat</Button>
      <P style={{ color: palette.warm, fontSize: 13 }}>
        If this link expires, you can re-join the waitlist from the dinner page.
      </P>
    </EmailShell>
  );
}
