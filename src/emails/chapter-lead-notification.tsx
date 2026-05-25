import * as React from 'react';
import { EmailShell, H1, P, Eyebrow } from './_shared';

export interface ChapterLeadNotificationProps {
  contactName: string;
  contactEmail: string;
  contactRole: string | null;
  chapterName: string;
  approximateSize: number | null;
  goals: string | null;
}

export default function ChapterLeadNotification(p: ChapterLeadNotificationProps) {
  return (
    <EmailShell>
      <Eyebrow>New chapter lead</Eyebrow>
      <H1>{p.chapterName}</H1>
      <P><strong>{p.contactName}</strong> ({p.contactEmail})</P>
      {p.contactRole ? <P>Role: {p.contactRole}</P> : null}
      {p.approximateSize ? <P>Approx. active members: {p.approximateSize}</P> : null}
      {p.goals ? <P style={{ whiteSpace: 'pre-line' }}>Goals: {p.goals}</P> : null}
    </EmailShell>
  );
}
