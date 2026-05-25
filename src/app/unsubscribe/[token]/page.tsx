// v1 simplification per spec: token is the plain guest id integer
// (see unsubscribeUrl() in @/lib/email). Acceptable for v1 since the spec
// just says "per-guest unsubscribe URL"; harden later with a salted hash.

import { setUnsubscribed, getGuestById } from '@/lib/guests';

export default async function UnsubscribePage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const guestId = parseInt(token, 10);
  let ok = false;
  if (Number.isFinite(guestId) && guestId > 0) {
    const guest = await getGuestById(guestId);
    if (guest) {
      await setUnsubscribed(guestId, true);
      ok = true;
    }
  }
  return (
    <main style={{ padding: 32, fontFamily: 'system-ui, sans-serif', maxWidth: 560 }}>
      <h1 style={{ fontSize: 24, marginBottom: 16 }}>
        {ok ? "You're unsubscribed" : 'Unsubscribe link not recognized'}
      </h1>
      <p style={{ color: '#555' }}>
        {ok
          ? "You're unsubscribed from reminder emails. You'll still receive transactional emails about reservations you make."
          : "We couldn't find this unsubscribe token. If you continue to receive emails you don't want, reply directly and we'll remove you manually."}
      </p>
    </main>
  );
}
