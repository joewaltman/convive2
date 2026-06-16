'use client';

import { useState } from 'react';
import type { SignupRow, SignupStatus } from '@/lib/lunchclub/types';

type SerializableSignup = Omit<SignupRow, 'created_at'> & { created_at: string };

const STATUSES: SignupStatus[] = ['new', 'contacted', 'invited', 'seated'];

export default function SignupsTable({ rows }: { rows: SerializableSignup[] }) {
  return (
    <div className="overflow-x-auto border border-neutral-200 rounded">
      <table className="w-full text-sm">
        <thead className="bg-neutral-50 border-b border-neutral-200">
          <tr>
            <th className="text-left px-3 py-2">Name</th>
            <th className="text-left px-3 py-2">Source</th>
            <th className="text-left px-3 py-2">Life stage</th>
            <th className="text-left px-3 py-2">Status</th>
            <th className="text-left px-3 py-2">Arm</th>
            <th className="text-left px-3 py-2">Note</th>
            <th className="text-left px-3 py-2">Created</th>
            <th className="text-left px-3 py-2"></th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <SignupRowView key={r.id} row={r} />
          ))}
          {rows.length === 0 ? (
            <tr>
              <td className="px-3 py-4 text-neutral-500" colSpan={8}>
                No signups match these filters.
              </td>
            </tr>
          ) : null}
        </tbody>
      </table>
    </div>
  );
}

function SignupRowView({ row }: { row: SerializableSignup }) {
  const [status, setStatus] = useState<SignupStatus>(row.status);
  const [arm, setArm] = useState<'A' | 'C' | null>(row.arm);
  const [note, setNote] = useState(row.admin_note ?? '');
  const [saving, setSaving] = useState(false);
  const [savedAt, setSavedAt] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [expanded, setExpanded] = useState(false);

  async function patch(fields: {
    status?: SignupStatus;
    arm?: 'A' | 'C' | null;
    admin_note?: string | null;
  }) {
    setSaving(true);
    setError(null);
    try {
      const res = await fetch(`/api/admin/lunchclub/signups/${row.id}`, {
        method: 'PATCH',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(fields),
      });
      if (res.ok) {
        setSavedAt(new Date().toLocaleTimeString());
      } else {
        const body = await res.json().catch(() => null);
        setError(body?.error ?? `HTTP ${res.status}`);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'network_error');
    } finally {
      setSaving(false);
    }
  }

  const name = [row.first_name, row.last_name].filter(Boolean).join(' ') || '—';

  return (
    <>
      <tr className="border-b border-neutral-100 align-top">
        <td className="px-3 py-2">
          <div className="font-medium">{name}</div>
          {row.email ? <div className="text-xs text-neutral-500">{row.email}</div> : null}
          {row.phone ? <div className="text-xs text-neutral-500">{row.phone}</div> : null}
        </td>
        <td className="px-3 py-2">{row.source}</td>
        <td className="px-3 py-2">{row.life_stage ?? '—'}</td>
        <td className="px-3 py-2">
          <select
            value={status}
            onChange={(e) => {
              const s = e.target.value as SignupStatus;
              setStatus(s);
              patch({ status: s });
            }}
            className="border border-neutral-300 rounded px-2 py-1 text-xs"
          >
            {STATUSES.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </td>
        <td className="px-3 py-2">
          <select
            value={arm ?? ''}
            onChange={(e) => {
              const v = e.target.value;
              const next: 'A' | 'C' | null = v === 'A' || v === 'C' ? v : null;
              setArm(next);
              patch({ arm: next });
            }}
            className="border border-neutral-300 rounded px-2 py-1 text-xs"
          >
            <option value="">none</option>
            <option value="A">A</option>
            <option value="C">C</option>
          </select>
        </td>
        <td className="px-3 py-2">
          <textarea
            rows={2}
            value={note}
            onChange={(e) => setNote(e.target.value)}
            onBlur={() => patch({ admin_note: note })}
            className="border border-neutral-300 rounded px-2 py-1 text-xs w-48"
          />
          <div className="text-[10px] text-neutral-500 mt-1">
            {saving ? 'Saving…' : error ? `Error: ${error}` : savedAt ? `Saved ${savedAt}` : ''}
          </div>
        </td>
        <td className="px-3 py-2 whitespace-nowrap">{new Date(row.created_at).toLocaleString()}</td>
        <td className="px-3 py-2">
          <button
            type="button"
            onClick={() => setExpanded((v) => !v)}
            className="text-xs text-neutral-600 hover:underline"
            aria-expanded={expanded}
          >
            {expanded ? '▾' : '▸'}
          </button>
        </td>
      </tr>
      {expanded ? (
        <tr className="border-b border-neutral-100 bg-neutral-50">
          <td colSpan={8} className="px-3 py-3">
            <Details row={row} />
          </td>
        </tr>
      ) : null}
    </>
  );
}

function Details({ row }: { row: SerializableSignup }) {
  const weekdays = row.weekday_availability.length > 0 ? row.weekday_availability.join(', ') : null;
  const dietary = row.dietary_restrictions.length > 0 ? row.dietary_restrictions.join(', ') : null;
  return (
    <dl className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-2 text-xs">
      <Field label="Who for" value={row.who_for} />
      <Field label="Prospect token" value={row.prospect_token} mono />
      <Field label="Buyer name" value={row.buyer_name} />
      <Field label="Buyer email" value={row.buyer_email} />
      <Field label="Buyer phone" value={row.buyer_phone} />
      <Field label="Buyer relationship" value={row.buyer_relationship} />
      <Field label="ZIP" value={row.zip_code} />
      <Field label="Weekday availability" value={weekdays} />
      <Field label="Age range" value={row.age_range} />
      <Field label="Solo or with" value={row.solo_or_with} />
      <Field label="Companion name" value={row.companion_name} />
      <Field label="Dietary restrictions" value={dietary} />
      <Field label="Comfort notes" value={row.comfort_notes} multiline />
      <Field label="Dietary notes" value={row.dietary_notes} multiline />
      <Field label="Q: Career" value={row.q_career} multiline />
      <Field label="Q: Chapter" value={row.q_chapter} multiline />
      <Field label="Q: Curious" value={row.q_curious} multiline />
      <Field label="Q: Surprising" value={row.q_surprising} multiline />
      <Field label="Q: Best gathering" value={row.q_best_gathering} multiline />
      <Field label="Q: Hopes" value={row.q_hopes} multiline />
      <Field label="Q: Anything else" value={row.q_anything_else} multiline />
    </dl>
  );
}

function Field({
  label,
  value,
  multiline,
  mono,
}: {
  label: string;
  value: string | null;
  multiline?: boolean;
  mono?: boolean;
}) {
  const empty = value === null || value === undefined || value === '';
  return (
    <div>
      <dt className="text-neutral-500">{label}</dt>
      <dd
        className={`${multiline ? 'whitespace-pre-line' : ''} ${mono ? 'font-mono' : ''} ${
          empty ? 'text-neutral-400' : ''
        }`}
      >
        {empty ? '—' : value}
      </dd>
    </div>
  );
}
