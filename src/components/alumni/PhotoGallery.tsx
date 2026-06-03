'use client';

import { useState } from 'react';

export interface GalleryPhoto {
  url: string;
  caption: string | null;
}

interface Props {
  photos: GalleryPhoto[];
  title: string;
  neighborhoodLabel: string;
  showRevealChip: boolean;
}

export function PhotoGallery({ photos, title, neighborhoodLabel, showRevealChip }: Props) {
  const [active, setActive] = useState(0);

  if (photos.length === 0) {
    return (
      <div className="h-28 bg-surface relative flex items-end">
        <span
          className="m-3 px-3 py-1 rounded-md body-sm font-medium text-white"
          style={{ backgroundColor: 'var(--chapter-primary)' }}
        >
          {neighborhoodLabel}
        </span>
      </div>
    );
  }

  const hero = photos[Math.min(active, photos.length - 1)];

  return (
    <div>
      <div className="relative">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={hero.url}
          alt={hero.caption ?? title}
          className="w-full aspect-[16/9] object-cover"
        />
        <span
          className="absolute top-3 left-3 px-3 py-1 rounded-md body-sm font-medium text-white"
          style={{ backgroundColor: 'var(--chapter-primary)' }}
        >
          {neighborhoodLabel}
        </span>
        {showRevealChip && (
          <span className="absolute bottom-3 left-3 px-3 py-1 rounded-md body-sm bg-white/90 text-body border border-border">
            Exact venue shared when you reserve
          </span>
        )}
      </div>

      {photos.length > 1 && (
        <div className="flex gap-2 p-3 overflow-x-auto">
          {photos.map((p, i) => {
            const isActive = i === active;
            return (
              <button
                key={i}
                type="button"
                onClick={() => setActive(i)}
                aria-label={`Show photo ${i + 1}`}
                aria-current={isActive}
                className="shrink-0 rounded overflow-hidden border-2 focus:outline-none focus-visible:ring-2"
                style={{ borderColor: isActive ? 'var(--chapter-accent)' : 'transparent' }}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={p.url}
                  alt=""
                  className={`h-16 w-24 object-cover transition-opacity ${isActive ? '' : 'opacity-70 hover:opacity-100'}`}
                />
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
