'use client';

import { useState, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';

interface ChapterForm {
  slug: string;
  short_name: string;
  school_name: string;
  display_name: string;
  tagline: string;
  from_display_name: string;
  color_primary: string;
  color_secondary: string;
  color_header_bg: string;
  color_header_text: string;
  color_accent: string;
  font_family: string;
  is_active: boolean;
}

const empty: ChapterForm = {
  slug: '',
  short_name: '',
  school_name: '',
  display_name: '',
  tagline: '',
  from_display_name: '',
  color_primary: '#1a1a1a',
  color_secondary: '#ffffff',
  color_header_bg: '#f5f5f5',
  color_header_text: '#1a1a1a',
  color_accent: '#c8553d',
  font_family: 'Inter, system-ui, sans-serif',
  is_active: true,
};

export default function NewChapterPage() {
  const router = useRouter();
  const [form, setForm] = useState<ChapterForm>(empty);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function setField<K extends keyof ChapterForm>(k: K, v: ChapterForm[K]) {
    setForm((f) => ({ ...f, [k]: v }));
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    const res = await fetch('/api/admin/chapters', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(form),
    });
    if (!res.ok) {
      const j = await res.json().catch(() => ({}));
      setError(j.error ?? 'create_failed');
      setSubmitting(false);
      return;
    }
    router.push('/admin/chapters');
  }

  return (
    <div>
      <h1 className="text-2xl font-semibold mb-6">New chapter</h1>
      <form onSubmit={onSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-4 max-w-3xl">
        <TextField label="Slug" value={form.slug} onChange={(v) => setField('slug', v)} required />
        <TextField label="Short name" value={form.short_name} onChange={(v) => setField('short_name', v)} required />
        <TextField label="Display name" value={form.display_name} onChange={(v) => setField('display_name', v)} required />
        <TextField label="School name" value={form.school_name} onChange={(v) => setField('school_name', v)} required />
        <TextField label="Tagline" value={form.tagline} onChange={(v) => setField('tagline', v)} />
        <TextField label="From display name" value={form.from_display_name} onChange={(v) => setField('from_display_name', v)} required />
        <TextField label="Color primary" value={form.color_primary} onChange={(v) => setField('color_primary', v)} required />
        <TextField label="Color secondary" value={form.color_secondary} onChange={(v) => setField('color_secondary', v)} required />
        <TextField label="Color header bg" value={form.color_header_bg} onChange={(v) => setField('color_header_bg', v)} required />
        <TextField label="Color header text" value={form.color_header_text} onChange={(v) => setField('color_header_text', v)} required />
        <TextField label="Color accent" value={form.color_accent} onChange={(v) => setField('color_accent', v)} required />
        <TextField label="Font family" value={form.font_family} onChange={(v) => setField('font_family', v)} />
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={form.is_active}
            onChange={(e) => setField('is_active', e.target.checked)}
          />
          Active
        </label>
        {error ? <p className="text-sm text-red-600 col-span-full">{error}</p> : null}
        <div className="col-span-full">
          <button
            type="submit"
            disabled={submitting}
            className="bg-neutral-900 text-white px-4 py-2 rounded text-sm disabled:opacity-50"
          >
            {submitting ? 'Creating…' : 'Create chapter'}
          </button>
        </div>
      </form>
    </div>
  );
}

function TextField({
  label,
  value,
  onChange,
  required,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  required?: boolean;
}) {
  return (
    <label className="block">
      <span className="block text-sm mb-1">{label}{required ? ' *' : ''}</span>
      <input
        type="text"
        required={required}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full border border-neutral-300 rounded px-3 py-2 text-sm"
      />
    </label>
  );
}
