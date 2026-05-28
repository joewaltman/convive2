'use client';

import { useEffect, useRef, useState } from 'react';
import ReactCrop, { centerCrop, makeAspectCrop, type Crop, type PixelCrop } from 'react-image-crop';
import 'react-image-crop/dist/ReactCrop.css';

interface Props {
  value: string;
  onChange: (v: string) => void;
}

const ASPECT = 4 / 3;

export function VenuePhotoField({ value, onChange }: Props) {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewSrc, setPreviewSrc] = useState<string | null>(null);
  const [crop, setCrop] = useState<Crop>();
  const [pixelCrop, setPixelCrop] = useState<PixelCrop | null>(null);
  const [showCropUI, setShowCropUI] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const imgRef = useRef<HTMLImageElement | null>(null);

  useEffect(() => {
    return () => {
      if (previewSrc) URL.revokeObjectURL(previewSrc);
    };
  }, [previewSrc]);

  function onPickFile(file: File | null) {
    setError(null);
    setPixelCrop(null);
    setCrop(undefined);
    setShowCropUI(false);
    setSelectedFile(file);
    if (previewSrc) URL.revokeObjectURL(previewSrc);
    setPreviewSrc(file ? URL.createObjectURL(file) : null);
  }

  function onImageLoaded(e: React.SyntheticEvent<HTMLImageElement>) {
    const img = e.currentTarget;
    imgRef.current = img;
    const initial = centerCrop(
      makeAspectCrop({ unit: '%', width: 90 }, ASPECT, img.width, img.height),
      img.width,
      img.height,
    );
    setCrop(initial);
  }

  async function onUpload() {
    if (!selectedFile) return;
    setUploading(true);
    setError(null);
    try {
      const fd = new FormData();
      fd.append('file', selectedFile);
      if (showCropUI && pixelCrop && imgRef.current) {
        const img = imgRef.current;
        const scaleX = img.naturalWidth / img.width;
        const scaleY = img.naturalHeight / img.height;
        const rect = {
          x: Math.round(pixelCrop.x * scaleX),
          y: Math.round(pixelCrop.y * scaleY),
          width: Math.round(pixelCrop.width * scaleX),
          height: Math.round(pixelCrop.height * scaleY),
        };
        fd.append('crop', JSON.stringify(rect));
      }
      const res = await fetch('/api/admin/venues/upload', {
        method: 'POST',
        body: fd,
      });
      const data = (await res.json().catch(() => ({}))) as Record<string, unknown>;
      if (!res.ok) {
        throw new Error(typeof data.error === 'string' ? data.error : 'upload_failed');
      }
      if (typeof data.url !== 'string') {
        throw new Error('upload_failed');
      }
      onChange(data.url);
      onPickFile(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'upload_failed');
    } finally {
      setUploading(false);
    }
  }

  function onRemove() {
    onChange('');
  }

  return (
    <div className="border border-neutral-200 rounded p-3 bg-neutral-50">
      <span className="block text-sm font-medium mb-2">Photo</span>

      {value ? (
        <div className="mb-3 flex items-start gap-3">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={value}
            alt="Current venue photo"
            className="w-48 aspect-[4/3] object-cover rounded border border-neutral-300"
          />
          <div className="flex flex-col gap-2">
            <p className="text-xs text-neutral-600 break-all">{value}</p>
            <button
              type="button"
              onClick={onRemove}
              className="text-xs text-red-700 border border-red-300 rounded px-2 py-1 self-start"
            >
              Remove photo
            </button>
          </div>
        </div>
      ) : null}

      <div className="flex flex-wrap items-center gap-2">
        <input
          type="file"
          accept="image/jpeg,image/png,image/webp,image/heic,image/heif"
          onChange={(e) => onPickFile(e.target.files?.[0] ?? null)}
          className="text-sm"
        />
        {selectedFile ? (
          <label className="flex items-center gap-1 text-xs text-neutral-700">
            <input
              type="checkbox"
              checked={showCropUI}
              onChange={(e) => setShowCropUI(e.target.checked)}
            />
            Adjust crop
          </label>
        ) : null}
      </div>

      {selectedFile && previewSrc && !showCropUI ? (
        <p className="text-xs text-neutral-600 mt-2">
          Auto-fit to 4:3 (center crop). Check &ldquo;Adjust crop&rdquo; to choose the framing.
        </p>
      ) : null}

      {selectedFile && previewSrc && showCropUI ? (
        <div className="mt-3 max-w-md">
          <ReactCrop
            crop={crop}
            onChange={(c) => setCrop(c)}
            onComplete={(c) => setPixelCrop(c)}
            aspect={ASPECT}
            keepSelection
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={previewSrc}
              alt="Selected"
              onLoad={onImageLoaded}
              style={{ maxWidth: '100%', display: 'block' }}
            />
          </ReactCrop>
          <p className="text-xs text-neutral-600 mt-1">
            Drag the handles to adjust. The crop is locked to 4:3.
          </p>
        </div>
      ) : null}

      {selectedFile ? (
        <div className="mt-3 flex items-center gap-2">
          <button
            type="button"
            onClick={onUpload}
            disabled={uploading}
            className="bg-neutral-900 text-white text-sm px-3 py-1.5 rounded disabled:opacity-50"
          >
            {uploading ? 'Uploading…' : 'Upload photo'}
          </button>
          <button
            type="button"
            onClick={() => onPickFile(null)}
            disabled={uploading}
            className="text-sm border border-neutral-300 px-3 py-1.5 rounded"
          >
            Cancel
          </button>
        </div>
      ) : null}

      {error ? <p className="text-sm text-red-600 mt-2">Upload failed: {error}</p> : null}
    </div>
  );
}
