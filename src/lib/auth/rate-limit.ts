type Bucket = Map<string, number>;
declare global {
  // eslint-disable-next-line no-var
  var __cv_rate_limit: Bucket | undefined;
}

function bucket(): Bucket {
  if (!globalThis.__cv_rate_limit) globalThis.__cv_rate_limit = new Map();
  return globalThis.__cv_rate_limit;
}

const MIN_INTERVAL_MS = 60_000;

/**
 * Returns true if the request is allowed (and records the timestamp).
 * Returns false if the same key has been hit within MIN_INTERVAL_MS.
 */
export function checkAndRecord(key: string, now: number = Date.now()): boolean {
  const b = bucket();
  const last = b.get(key);
  if (last && now - last < MIN_INTERVAL_MS) return false;
  b.set(key, now);
  return true;
}

export function codeRequestKey(purpose: 'guest' | 'admin', email: string): string {
  return `${purpose}:${email.toLowerCase().trim()}`;
}
