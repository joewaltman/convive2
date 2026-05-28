import { NextResponse } from 'next/server';
import { promises as fs } from 'fs';
import path from 'path';
import crypto from 'crypto';
import sharp from 'sharp';
import { requireSuperAdmin } from '@/lib/auth/admin';

export const runtime = 'nodejs';

const MAX_BYTES = 12 * 1024 * 1024; // 12 MB upload limit
const OUT_WIDTH = 1600;
const OUT_HEIGHT = 1200; // 4:3

function uploadDir(): string {
  return (process.env.UPLOAD_DIR ?? '/data/uploads/venues').replace(/\/+$/, '');
}

interface CropRect {
  x: number;
  y: number;
  width: number;
  height: number;
}

function parseCrop(raw: string | null): CropRect | null {
  if (!raw) return null;
  try {
    const j = JSON.parse(raw) as Record<string, unknown>;
    const x = Number(j.x);
    const y = Number(j.y);
    const width = Number(j.width);
    const height = Number(j.height);
    if (![x, y, width, height].every((n) => Number.isFinite(n) && n >= 0)) return null;
    if (width <= 0 || height <= 0) return null;
    return { x, y, width, height };
  } catch {
    return null;
  }
}

export async function POST(req: Request) {
  await requireSuperAdmin();

  const form = await req.formData().catch(() => null);
  if (!form) {
    return NextResponse.json({ error: 'invalid_form' }, { status: 400 });
  }

  const file = form.get('file');
  if (!(file instanceof File)) {
    return NextResponse.json({ error: 'file_required' }, { status: 400 });
  }
  if (file.size > MAX_BYTES) {
    return NextResponse.json({ error: 'file_too_large' }, { status: 413 });
  }

  const type = (file.type || '').toLowerCase();
  if (!/^image\/(jpeg|jpg|png|webp|heic|heif)$/.test(type)) {
    return NextResponse.json({ error: 'unsupported_type' }, { status: 415 });
  }

  const buf = Buffer.from(await file.arrayBuffer());

  // Optional crop rect in source image coordinates.
  const cropRaw = form.get('crop');
  const crop = typeof cropRaw === 'string' ? parseCrop(cropRaw) : null;

  let pipeline = sharp(buf, { failOn: 'none' }).rotate(); // honor EXIF orientation
  const meta = await pipeline.metadata();
  const srcW = meta.width ?? 0;
  const srcH = meta.height ?? 0;
  if (srcW < 200 || srcH < 200) {
    return NextResponse.json({ error: 'image_too_small' }, { status: 400 });
  }

  if (crop) {
    const left = Math.max(0, Math.min(Math.round(crop.x), srcW - 1));
    const top = Math.max(0, Math.min(Math.round(crop.y), srcH - 1));
    const width = Math.max(1, Math.min(Math.round(crop.width), srcW - left));
    const height = Math.max(1, Math.min(Math.round(crop.height), srcH - top));
    pipeline = pipeline.extract({ left, top, width, height });
  }

  // Resize to 4:3 cover. If user supplied crop, this still trims any rounding error.
  pipeline = pipeline.resize(OUT_WIDTH, OUT_HEIGHT, {
    fit: 'cover',
    position: 'centre',
  });

  let outBuf: Buffer;
  try {
    outBuf = await pipeline.jpeg({ quality: 85, mozjpeg: true }).toBuffer();
  } catch (err) {
    console.error('venue_upload_processing_failed', err);
    return NextResponse.json({ error: 'processing_failed' }, { status: 500 });
  }

  const hash = crypto.createHash('sha256').update(outBuf).digest('hex').slice(0, 16);
  const filename = `v-${hash}.jpg`;
  const dir = uploadDir();
  await fs.mkdir(dir, { recursive: true });
  const fullPath = path.join(dir, filename);
  await fs.writeFile(fullPath, outBuf);

  return NextResponse.json({
    url: `/uploads/venues/${filename}`,
    filename,
    width: OUT_WIDTH,
    height: OUT_HEIGHT,
    bytes: outBuf.length,
  });
}
