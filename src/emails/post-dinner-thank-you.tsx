import * as React from 'react';
import { EmailShell, H1, P, Eyebrow, palette } from './_shared';

export interface PostDinnerThankYouProps {
  chapterDisplayName: string;
  chapterAccent: string;
  chapterPageUrl: string;
  unsubscribeUrl: string;
}

export default function PostDinnerThankYou(p: PostDinnerThankYouProps) {
  return (
    <EmailShell accent={p.chapterAccent}>
      <Eyebrow>{p.chapterDisplayName}</Eyebrow>
      <H1>Thanks for joining us</H1>
      <P>It was good to share the table with you.</P>
      <P>
        Upcoming dinners are on <a href={p.chapterPageUrl} style={{ color: palette.terracotta }}>your chapter page</a>.
      </P>
      <P style={{ color: palette.warm, fontSize: 12, marginTop: 24 }}>
        <a href={p.unsubscribeUrl} style={{ color: palette.warm }}>Unsubscribe</a>
      </P>
    </EmailShell>
  );
}
