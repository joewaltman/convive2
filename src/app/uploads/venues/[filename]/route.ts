import { NextResponse } from 'next/server';
import { promises as fs } from 'fs';
import path from 'path';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

function uploadDir(): string {
  return (process.env.UPLOAD_DIR ?? '/data/uploads/venues').replace(/\/+$/, '');
}

// Allow only content-hash filenames produced by our upload route.
const FILENAME_RE = /^v-[a-f0-9]{16}\.jpg$/;

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ filename: string }> },
) {
  const { filename } = await params;
  if (!FILENAME_RE.test(filename)) {
    return NextResponse.json({ error: 'not_found' }, { status: 404 });
  }
  const dir = uploadDir();
  const full = path.join(dir, filename);
  // Defense in depth against any traversal slipping past the regex.
  const resolved = path.resolve(full);
  if (!resolved.startsWith(path.resolve(dir) + path.sep)) {
    return NextResponse.json({ error: 'not_found' }, { status: 404 });
  }
  let buf: Buffer;
  try {
    buf = await fs.readFile(resolved);
  } catch {
    return NextResponse.json({ error: 'not_found' }, { status: 404 });
  }
  // Cast to Uint8Array for the Response body (Node Buffer is one).
  return new Response(new Uint8Array(buf), {
    status: 200,
    headers: {
      'Content-Type': 'image/jpeg',
      'Content-Length': String(buf.length),
      'Cache-Control': 'public, max-age=31536000, immutable',
    },
  });
}
