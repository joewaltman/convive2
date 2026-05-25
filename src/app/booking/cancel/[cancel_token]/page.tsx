import { redirect } from 'next/navigation';

interface BookingCancelPageProps {
  params: Promise<{ cancel_token: string }>;
}

/**
 * This page redirects to the canonical cancel URL at /cancel/[cancel_token].
 * The admin resend-confirmation endpoint uses /booking/cancel/[cancel_token],
 * so we provide this redirect for compatibility.
 */
export default async function BookingCancelPage({ params }: BookingCancelPageProps) {
  const { cancel_token } = await params;
  redirect(`/cancel/${cancel_token}`);
}
