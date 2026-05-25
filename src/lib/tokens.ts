import { createHash, randomBytes, randomInt } from 'crypto';

export function generateUrlSafeToken(bytes = 32): string {
  return randomBytes(bytes).toString('base64url');
}

export function sha256Hex(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

/** 6-digit numeric code, zero-padded. */
export function generateNumericCode(): string {
  return String(randomInt(0, 1_000_000)).padStart(6, '0');
}
