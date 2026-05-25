import * as React from 'react';
import { EmailShell, H1, P, Eyebrow } from './_shared';

export interface VenueLeadNotificationProps {
  contactName: string;
  contactEmail: string;
  venueName: string | null;
  venueType: string | null;
  neighborhood: string | null;
  capacity: number | null;
  notes: string | null;
}

export default function VenueLeadNotification(p: VenueLeadNotificationProps) {
  return (
    <EmailShell>
      <Eyebrow>New venue lead</Eyebrow>
      <H1>{p.venueName ?? 'Unknown venue'}</H1>
      <P><strong>{p.contactName}</strong> ({p.contactEmail})</P>
      {p.venueType ? <P>Type: {p.venueType}</P> : null}
      {p.neighborhood ? <P>Neighborhood: {p.neighborhood}</P> : null}
      {p.capacity ? <P>Capacity: {p.capacity}</P> : null}
      {p.notes ? <P style={{ whiteSpace: 'pre-line' }}>Notes: {p.notes}</P> : null}
    </EmailShell>
  );
}
