export interface AttendeeForReminder {
  guest_id: number;
  first_name: string | null;
  last_name: string | null;
  grad_year: number;
  major: string | null;
  what_do_you_do: string | null;
}

export interface CompanionBlock {
  line1: string;
  line2: string | null;
}

export function selectCompanions(
  attendees: AttendeeForReminder[],
  recipientGuestId: number,
  dinnerId: number,
): AttendeeForReminder[] {
  const others = attendees.filter((a) => a.guest_id !== recipientGuestId);
  if (others.length <= 10) return others;

  const recipient = attendees.find((a) => a.guest_id === recipientGuestId);
  if (!recipient) return others.slice(0, 8);

  const scored = others.map((a) => ({
    a,
    score: 1 / (1 + Math.abs(a.grad_year - recipient.grad_year) / 5),
    tiebreak: 0,
  }));

  let lcg = (dinnerId * 10000 + recipientGuestId) >>> 0;
  for (const s of scored) {
    lcg = (lcg * 1103515245 + 12345) >>> 0;
    s.tiebreak = lcg;
  }

  scored.sort((x, y) => {
    if (y.score !== x.score) return y.score - x.score;
    return x.tiebreak - y.tiebreak;
  });

  return scored.slice(0, 8).map((s) => s.a);
}

export function trimWhatDoYouDo(text: string | null): string | null {
  if (!text) return null;
  const t = text.trim();
  if (!t) return null;
  const m = t.match(/^[^.!?]*[.!?]/);
  if (m) return m[0].trim();
  return t.length > 140 ? `${t.slice(0, 140)}...` : t;
}

export function renderCompanionBlock(a: AttendeeForReminder): CompanionBlock | null {
  const firstName = a.first_name?.trim() || null;
  const lastName = a.last_name?.trim() || null;
  if (!firstName && !lastName) return null;

  const name = [firstName, lastName].filter(Boolean).join(' ');
  const classPart = `Class of '${String(a.grad_year).slice(-2)}`;
  const majorPart = a.major?.trim();
  const line1 = majorPart ? `${name}, ${classPart}, ${majorPart}` : `${name}, ${classPart}`;
  const line2 = trimWhatDoYouDo(a.what_do_you_do);
  return { line1, line2 };
}
