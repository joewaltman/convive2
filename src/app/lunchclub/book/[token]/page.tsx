import { getBookingByToken } from '@/lib/lunchclub/data';
import {
  formatDateTimeLA,
  formatDollars,
  formatDisplayName,
} from '@/lib/lunchclub/format';
import BookButton from './BookButton';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

interface PageProps {
  params: Promise<{ token: string }>;
  searchParams: Promise<{ paid?: string }>;
}

export default async function BookingPage({ params, searchParams }: PageProps) {
  const { token } = await params;
  const sp = await searchParams;
  const ctx = await getBookingByToken(token);

  if (!ctx) {
    return (
      <Wrapper>
        <h1 className="text-2xl font-semibold mb-3">Link unavailable</h1>
        <p>This link isn't valid or has expired.</p>
      </Wrapper>
    );
  }

  const firstName = formatDisplayName(ctx.signup.first_name) || 'there';
  const when = formatDateTimeLA(ctx.lunch.starts_at);
  const total = formatDollars(ctx.booking.seats * ctx.lunch.price_cents);

  if (ctx.booking.status === 'paid' || sp.paid === '1') {
    return (
      <Wrapper>
        <h1 className="text-2xl font-semibold mb-3">You're confirmed</h1>
        <p className="mb-2">
          Hi {firstName}, you're confirmed for lunch on {when} at {ctx.lunch.venue}.
        </p>
        <p className="text-base text-ink/80 mb-1">{ctx.lunch.address}</p>
        {ctx.lunch.menu ? (
          <p className="text-base text-ink/80 mt-3">Menu: {ctx.lunch.menu}</p>
        ) : null}
        <p className="mt-4 text-base text-ink/80">See you there.</p>
      </Wrapper>
    );
  }

  if (ctx.booking.status === 'cancelled' || ctx.booking.status === 'refunded') {
    return (
      <Wrapper>
        <h1 className="text-2xl font-semibold mb-3">Reservation cancelled</h1>
        <p>This reservation was cancelled.</p>
      </Wrapper>
    );
  }

  if (ctx.lunch.status === 'cancelled') {
    return (
      <Wrapper>
        <h1 className="text-2xl font-semibold mb-3">Lunch cancelled</h1>
        <p>This lunch was cancelled.</p>
      </Wrapper>
    );
  }

  if (Date.now() > ctx.lunch.booking_cutoff_at.getTime()) {
    return (
      <Wrapper>
        <h1 className="text-2xl font-semibold mb-3">Booking closed</h1>
        <p>Booking closed for this lunch.</p>
      </Wrapper>
    );
  }

  return (
    <Wrapper>
      <h1 className="text-2xl font-semibold mb-3">{ctx.standingTable.name}</h1>
      <p className="mb-2">
        Hi {firstName}, your standing table meets on {when}.
      </p>
      <dl className="my-6 space-y-2 text-base">
        <Row label="When" value={when} />
        <Row label="Venue" value={ctx.lunch.venue} />
        <Row label="Address" value={ctx.lunch.address} />
        {ctx.lunch.menu ? <Row label="Menu" value={ctx.lunch.menu} /> : null}
        <Row
          label="Cost"
          value={`${total} (${ctx.booking.seats} seat${ctx.booking.seats === 2 ? 's' : ''})`}
        />
      </dl>
      <BookButton token={token} />
    </Wrapper>
  );
}

function Wrapper({ children }: { children: React.ReactNode }) {
  return <div className="space-y-3">{children}</div>;
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex gap-3">
      <dt className="w-20 shrink-0 text-ink/60">{label}</dt>
      <dd className="text-ink">{value}</dd>
    </div>
  );
}
