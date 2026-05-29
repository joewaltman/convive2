import * as React from 'react';
import { EmailShell, H1, P, Button, Divider, Eyebrow, palette } from './_shared';

export interface PostDinnerThankYouProps {
  chapterDisplayName: string;
  chapterAccent: string;
  chapterPageUrl: string;
  surveyUrl: string;
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

      <Divider />
      <Eyebrow>How was it?</Eyebrow>
      <P>
        We&apos;d love a quick read on the venue, the food, and the value. It takes about a minute.
      </P>
      <Button color={p.chapterAccent} href={p.surveyUrl}>Share feedback</Button>

      <P style={{ color: palette.warm, fontSize: 12, marginTop: 24 }}>
        <a href={p.unsubscribeUrl} style={{ color: palette.warm }}>Unsubscribe</a>
      </P>
    </EmailShell>
  );
}
