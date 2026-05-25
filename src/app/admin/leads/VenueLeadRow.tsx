'use client';

import { useState } from 'react';

interface SerializableVenueLead {
  id: number;
  contact_name: string;
  contact_email: string;
  venue_name: string | null;
  venue_type: string | null;
  neighborhood: string | null;
  capacity: number | null;
  notes: string | null;
  status: 'new' | 'contacted' | 'visited' | 'partnered' | 'declined';
  internal_notes: string | null;
  created_at: string;
}

const STATUSES: SerializableVenueLead['status'][] = [
  'new',
  'contacted',
  'visited',
  'partnered',
  'declined',
];

export default function VenueLeadRow({ lead }: { lead: SerializableVenueLead }) {
  const [status, setStatus] = useState<SerializableVenueLead['status']>(lead.status);
  const [notes, setNotes] = useState(lead.internal_notes ?? '');
  const [saving, setSaving] = useState(false);
  const [savedAt, setSavedAt] = useState<string | null>(null);

  async function patch(fields: Partial<{ status: SerializableVenueLead['status']; internal_notes: string }>) {
    setSaving(true);
    const res = await fetch(`/api/admin/leads/venue/${lead.id}`, {
      method: 'PATCH',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(fields),
    });
    setSaving(false);
    if (res.ok) setSavedAt(new Date().toLocaleTimeString());
  }

  return (
    <tr className="border-b border-neutral-100 align-top">
      <td className="px-3 py-2">
        <div className="font-medium">{lead.contact_name}</div>
        <div className="text-xs text-neutral-500">{lead.contact_email}</div>
      </td>
      <td className="px-3 py-2">{lead.venue_name ?? '—'}</td>
      <td className="px-3 py-2">{lead.venue_type ?? '—'}</td>
      <td className="px-3 py-2">{lead.neighborhood ?? '—'}</td>
      <td className="px-3 py-2">{lead.capacity ?? '—'}</td>
      <td className="px-3 py-2 max-w-xs">{lead.notes ?? '—'}</td>
      <td className="px-3 py-2">
        <select
          value={status}
          onChange={(e) => {
            const s = e.target.value as SerializableVenueLead['status'];
            setStatus(s);
            patch({ status: s });
          }}
          className="border border-neutral-300 rounded px-2 py-1 text-xs"
        >
          {STATUSES.map((s) => (
            <option key={s} value={s}>{s}</option>
          ))}
        </select>
      </td>
      <td className="px-3 py-2">
        <textarea
          rows={2}
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          onBlur={() => patch({ internal_notes: notes })}
          className="border border-neutral-300 rounded px-2 py-1 text-xs w-48"
        />
        <div className="text-[10px] text-neutral-500 mt-1">
          {saving ? 'Saving…' : savedAt ? `Saved ${savedAt}` : ''}
        </div>
      </td>
      <td className="px-3 py-2 whitespace-nowrap">{new Date(lead.created_at).toLocaleString()}</td>
    </tr>
  );
}
