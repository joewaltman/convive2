/**
 * Normalize a phone number to a 10-digit US string.
 * - Strips non-digits.
 * - If 11 digits starting with 1, drops the leading 1.
 * - If exactly 10 digits, returns it.
 * - Otherwise returns null.
 */
export function normalizePhone(input: unknown): string | null {
  if (typeof input !== 'string') return null;
  const digits = input.replace(/\D+/g, '');
  if (digits.length === 11 && digits.startsWith('1')) {
    return digits.slice(1);
  }
  if (digits.length === 10) return digits;
  return null;
}

export function formatPhone(digits: string | null | undefined): string {
  if (!digits) return '';
  const d = digits.replace(/\D+/g, '');
  if (d.length !== 10) return digits ?? '';
  return `(${d.slice(0, 3)}) ${d.slice(3, 6)}-${d.slice(6)}`;
}
