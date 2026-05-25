'use client';

import { useState } from 'react';

interface SerializableChapterLead {
  id: number;
  contact_name: string;
  contact_email: string;
  contact_role: string | null;
  chapter_name: string;
  approximate_size: number | null;
  goals: string | null;
  status: 'new' | 'contacted' | 'call_scheduled' | 'partnered' | 'declined';
  internal_notes: string | null;
  created_at: string;
}

const STATUSES: SerializableChapterLead['status'][] = [
  'new',
  'contacted',
  'call_scheduled',
  'partnered',
  'declined',
];

export default function ChapterLeadRow({ lead }: { lead: SerializableChapterLead }) {
  const [status, setStatus] = useState<SerializableChapterLead['status']>(lead.status);
  const [notes, setNotes] = useState(lead.internal_notes ?? '');
  const [saving, setSaving] = useState(false);
  const [savedAt, setSavedAt] = useState<string | null>(null);

  async function patch(fields: Partial<{ status: SerializableChapterLead['status']; internal_notes: string }>) {
    setSaving(true);
    const res = await fetch(`/api/admin/leads/chapter/${lead.id}`, {
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
        {lead.contact_role ? <div className="text-xs text-neutral-500">{lead.contact_role}</div> : null}
      </td>
      <td className="px-3 py-2">{lead.chapter_name}</td>
      <td className="px-3 py-2">{lead.approximate_size ?? '—'}</td>
      <td className="px-3 py-2 max-w-xs">{lead.goals ?? '—'}</td>
      <td className="px-3 py-2">
        <select
          value={status}
          onChange={(e) => {
            const s = e.target.value as SerializableChapterLead['status'];
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
