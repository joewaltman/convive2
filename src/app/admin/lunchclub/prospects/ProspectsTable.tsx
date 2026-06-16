'use client';

import { useMemo, useState } from 'react';
import type { ProspectRow } from '@/lib/lunchclub/types';

type SerializableProspect = Omit<ProspectRow, 'contacted_at' | 'created_at'> & {
  contacted_at: string | null;
  created_at: string;
};

function csvEscape(value: string): string {
  if (/[",\n\r]/.test(value)) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

function toE164(phoneClean: string | null): string {
  if (!phoneClean) return '';
  const digits = phoneClean.replace(/\D/g, '');
  if (digits.length !== 10) return '';
  return `+1${digits}`;
}

export default function ProspectsTable({
  rows,
  baseUrl,
}: {
  rows: SerializableProspect[];
  baseUrl: string;
}) {
  const initialContactedAt = useMemo(() => {
    const m: Record<number, string | null> = {};
    for (const r of rows) m[r.id] = r.contacted_at;
    return m;
  }, [rows]);
  const [contactedAt, setContactedAt] =
    useState<Record<number, string | null>>(initialContactedAt);
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [markingIds, setMarkingIds] = useState<Set<number>>(new Set());
  const [bulkBusy, setBulkBusy] = useState(false);
  const [copiedId, setCopiedId] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  function toggle(id: number) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  const allOnPageSelected = rows.length > 0 && rows.every((r) => selected.has(r.id));

  function toggleAll() {
    setSelected((prev) => {
      if (allOnPageSelected) {
        const next = new Set(prev);
        for (const r of rows) next.delete(r.id);
        return next;
      }
      const next = new Set(prev);
      for (const r of rows) next.add(r.id);
      return next;
    });
  }

  async function markOne(id: number) {
    setError(null);
    setMarkingIds((prev) => new Set(prev).add(id));
    try {
      const res = await fetch(`/api/admin/lunchclub/prospects/${id}/contacted`, {
        method: 'POST',
      });
      if (res.ok) {
        const body = (await res.json()) as { contacted_at: string };
        setContactedAt((prev) => ({ ...prev, [id]: body.contacted_at }));
      } else {
        const body = await res.json().catch(() => null);
        setError(body?.error ?? `HTTP ${res.status}`);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'network_error');
    } finally {
      setMarkingIds((prev) => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
    }
  }

  async function markBulk() {
    if (selected.size === 0) return;
    setError(null);
    setBulkBusy(true);
    const ids = Array.from(selected);
    try {
      const res = await fetch(`/api/admin/lunchclub/prospects/contacted`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ ids }),
      });
      if (res.ok) {
        const body = (await res.json()) as { contacted_at: string };
        setContactedAt((prev) => {
          const next = { ...prev };
          for (const id of ids) next[id] = body.contacted_at;
          return next;
        });
        setSelected(new Set());
      } else {
        const body = await res.json().catch(() => null);
        setError(body?.error ?? `HTTP ${res.status}`);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'network_error');
    } finally {
      setBulkBusy(false);
    }
  }

  function exportCsv() {
    if (selected.size === 0) return;
    const selectedRows = rows.filter((r) => selected.has(r.id));
    const lines = ['FirstName,phone_e164,link'];
    for (const r of selectedRows) {
      const first = csvEscape(r.first_name ?? '');
      const phone = csvEscape(toE164(r.phone_clean));
      const link = csvEscape(`${baseUrl}/lunchclub/${r.token}`);
      lines.push(`${first},${phone},${link}`);
    }
    const blob = new Blob([lines.join('\n')], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `lunchclub-prospects-${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  async function copy(id: number, url: string) {
    try {
      await navigator.clipboard.writeText(url);
      setCopiedId(id);
      setTimeout(() => setCopiedId((cur) => (cur === id ? null : cur)), 1500);
    } catch {
      // ignore
    }
  }

  return (
    <div>
      <div className="flex flex-wrap gap-2 items-center mb-3">
        <label className="inline-flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={allOnPageSelected}
            onChange={toggleAll}
            className="border border-neutral-300 rounded"
          />
          Select all on page
        </label>
        <button
          type="button"
          onClick={markBulk}
          disabled={selected.size === 0 || bulkBusy}
          className="bg-neutral-900 text-white px-3 py-1.5 rounded text-xs disabled:opacity-40"
        >
          {bulkBusy ? 'Marking…' : `Mark selected contacted (${selected.size})`}
        </button>
        <button
          type="button"
          onClick={exportCsv}
          disabled={selected.size === 0}
          className="border border-neutral-300 px-3 py-1.5 rounded text-xs disabled:opacity-40"
        >
          Export selected CSV
        </button>
        {error ? <span className="text-xs text-red-600">Error: {error}</span> : null}
      </div>

      <div className="overflow-x-auto border border-neutral-200 rounded">
        <table className="w-full text-sm">
          <thead className="bg-neutral-50 border-b border-neutral-200">
            <tr>
              <th className="text-left px-3 py-2 w-8"></th>
              <th className="text-left px-3 py-2">Name</th>
              <th className="text-left px-3 py-2">Phone</th>
              <th className="text-left px-3 py-2">Signed up</th>
              <th className="text-left px-3 py-2">Contacted</th>
              <th className="text-left px-3 py-2">Reactivation link</th>
              <th className="text-left px-3 py-2"></th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => {
              const name = [r.first_name, r.last_name].filter(Boolean).join(' ') || '—';
              const link = `${baseUrl}/lunchclub/${r.token}`;
              const isMarking = markingIds.has(r.id);
              const contactedVal = contactedAt[r.id];
              return (
                <tr key={r.id} className="border-b border-neutral-100 align-top">
                  <td className="px-3 py-2">
                    <input
                      type="checkbox"
                      checked={selected.has(r.id)}
                      onChange={() => toggle(r.id)}
                      className="border border-neutral-300 rounded"
                    />
                  </td>
                  <td className="px-3 py-2">
                    <div className="font-medium">{name}</div>
                    {r.email ? (
                      <div className="text-xs text-neutral-500">{r.email}</div>
                    ) : null}
                  </td>
                  <td className="px-3 py-2 whitespace-nowrap">{r.phone_clean ?? '—'}</td>
                  <td className="px-3 py-2">
                    {r.signed_up ? (
                      <span className="inline-block bg-green-100 text-green-800 text-xs px-2 py-0.5 rounded">
                        Signed up
                      </span>
                    ) : (
                      <span className="inline-block bg-neutral-100 text-neutral-700 text-xs px-2 py-0.5 rounded">
                        Not yet
                      </span>
                    )}
                  </td>
                  <td className="px-3 py-2 whitespace-nowrap">
                    {contactedVal ? new Date(contactedVal).toLocaleString() : '—'}
                  </td>
                  <td className="px-3 py-2">
                    <div className="flex items-center gap-2">
                      <input
                        type="text"
                        readOnly
                        value={link}
                        className="border border-neutral-300 rounded px-2 py-1 text-xs w-72 font-mono"
                      />
                      <button
                        type="button"
                        onClick={() => copy(r.id, link)}
                        className="border border-neutral-300 px-2 py-1 rounded text-xs"
                      >
                        {copiedId === r.id ? 'Copied' : 'Copy'}
                      </button>
                    </div>
                  </td>
                  <td className="px-3 py-2">
                    <button
                      type="button"
                      onClick={() => markOne(r.id)}
                      disabled={contactedVal !== null || isMarking}
                      className="bg-neutral-900 text-white px-3 py-1.5 rounded text-xs disabled:opacity-40"
                    >
                      {isMarking ? 'Marking…' : 'Mark contacted'}
                    </button>
                  </td>
                </tr>
              );
            })}
            {rows.length === 0 ? (
              <tr>
                <td className="px-3 py-4 text-neutral-500" colSpan={7}>
                  No prospects match these filters.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </div>
  );
}
