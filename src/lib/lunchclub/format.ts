/**
 * Title-case a person name for display. Handles all-caps and all-lower
 * legacy data, plus internal separators (spaces, hyphens, apostrophes).
 * Returns '' for null/undefined/blank input.
 */
export function formatDisplayName(input: string | null | undefined): string {
  if (!input) return '';
  const trimmed = input.trim();
  if (trimmed.length === 0) return '';
  const lower = trimmed.toLowerCase();
  return lower.replace(/(^|[^\p{L}])(\p{L})/gu, (_m, sep, ch) => sep + ch.toUpperCase());
}
