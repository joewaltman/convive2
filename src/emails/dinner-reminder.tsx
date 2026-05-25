import * as React from 'react';
import { EmailShell, H1, P, Button, Divider, Eyebrow, palette } from './_shared';
import { formatLAClock } from '@/lib/time';
import type { CompanionBlock } from '@/lib/reminder-companions';

export interface DinnerReminderProps {
  chapterDisplayName: string;
  chapterAccent: string;
  dinnerTitle: string;
  dinnerStartsAt: Date;
  venueName: string;
  fullAddress: string;
  parkingNote: string | null;
  googleCalendarUrl: string;
  outlookUrl: string;
  icsUrl: string;
  companions: CompanionBlock[];
  unsubscribeUrl: string;
}

export default function DinnerReminder(p: DinnerReminderProps) {
  return (
    <EmailShell accent={p.chapterAccent}>
      <Eyebrow>{p.chapterDisplayName}</Eyebrow>
      <H1>Tomorrow at {p.venueName}</H1>
      <P>{formatLAClock(p.dinnerStartsAt)}</P>
      <P style={{ color: palette.warm }}>{p.fullAddress}</P>
      {p.parkingNote ? <P style={{ color: palette.warm, fontSize: 13 }}>Parking: {p.parkingNote}</P> : null}

      <Divider />
      <Eyebrow>Add to calendar</Eyebrow>
      <div>
        <Button color={p.chapterAccent} href={p.googleCalendarUrl}>Google Calendar</Button>
        <Button color={p.chapterAccent} href={p.outlookUrl}>Outlook</Button>
        <Button color={p.chapterAccent} href={p.icsUrl}>Download .ics</Button>
      </div>

      {p.companions.length > 0 ? (
        <>
          <Divider />
          <Eyebrow>Who you&apos;ll be dining with</Eyebrow>
          {p.companions.map((c, i) => (
            <div key={i} style={{ marginBottom: 12 }}>
              <P style={{ margin: 0, color: palette.ink, fontWeight: 600 }}>{c.line1}</P>
              {c.line2 ? <P style={{ margin: 0, color: palette.warm, fontSize: 13 }}>{c.line2}</P> : null}
            </div>
          ))}
        </>
      ) : null}

      <Divider />
      <P style={{ color: palette.warm, fontSize: 12 }}>
        <a href={p.unsubscribeUrl} style={{ color: palette.warm }}>Unsubscribe from reminders</a>
      </P>
    </EmailShell>
  );
}
