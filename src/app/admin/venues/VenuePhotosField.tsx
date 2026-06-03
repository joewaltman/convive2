'use client';

import { useState } from 'react';
import { VenuePhotoField } from './VenuePhotoField';

export interface VenuePhotoFormItem {
  url: string;
  caption: string | null;
}

interface Props {
  value: VenuePhotoFormItem[];
  onChange: (next: VenuePhotoFormItem[]) => void;
}

export function VenuePhotosField({ value, onChange }: Props) {
  // Buffer URL for a new upload before it is appended.
  const [pendingUrl, setPendingUrl] = useState<string>('');

  function setCaption(i: number, caption: string) {
    const next = value.slice();
    next[i] = { ...next[i], caption: caption.length === 0 ? null : caption };
    onChange(next);
  }

  function remove(i: number) {
    const next = value.slice();
    next.splice(i, 1);
    onChange(next);
  }

  function move(i: number, delta: number) {
    const j = i + delta;
    if (j < 0 || j >= value.length) return;
    const next = value.slice();
    const [item] = next.splice(i, 1);
    next.splice(j, 0, item);
    onChange(next);
  }

  function onUploadComplete(url: string) {
    if (!url) return;
    onChange([...value, { url, caption: null }]);
    setPendingUrl('');
  }

  return (
    <div className="border border-neutral-200 rounded p-3 bg-neutral-50">
      <span className="block text-sm font-medium mb-2">Photos</span>

      {value.length === 0 ? (
        <p className="text-xs text-neutral-600 mb-3">
          No photos yet. Upload one below to get started.
        </p>
      ) : (
        <ul className="space-y-3 mb-4">
          {value.map((p, i) => (
            <li
              key={`${p.url}-${i}`}
              className="flex items-start gap-3 border border-neutral-200 rounded bg-white p-2"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={p.url}
                alt={p.caption ?? `Photo ${i + 1}`}
                className="w-32 aspect-[4/3] object-cover rounded border border-neutral-300"
              />
              <div className="flex-1 flex flex-col gap-2">
                <input
                  type="text"
                  placeholder="Caption (optional)"
                  value={p.caption ?? ''}
                  onChange={(e) => setCaption(i, e.target.value)}
                  className="w-full border border-neutral-300 rounded px-2 py-1 text-sm"
                />
                <p className="text-xs text-neutral-500 break-all">{p.url}</p>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => move(i, -1)}
                    disabled={i === 0}
                    className="text-xs border border-neutral-300 rounded px-2 py-1 disabled:opacity-40"
                  >
                    Move up
                  </button>
                  <button
                    type="button"
                    onClick={() => move(i, 1)}
                    disabled={i === value.length - 1}
                    className="text-xs border border-neutral-300 rounded px-2 py-1 disabled:opacity-40"
                  >
                    Move down
                  </button>
                  <button
                    type="button"
                    onClick={() => remove(i)}
                    className="text-xs text-red-700 border border-red-300 rounded px-2 py-1"
                  >
                    Remove
                  </button>
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}

      <div className="border-t border-neutral-200 pt-3">
        <p className="text-xs text-neutral-700 mb-2">Add a photo:</p>
        <VenuePhotoField value={pendingUrl} onChange={onUploadComplete} />
      </div>
    </div>
  );
}
