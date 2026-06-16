import { NextResponse } from 'next/server';
import { checkAndRecord } from '@/lib/auth/rate-limit';
import { createSignup, getProspectByToken } from '@/lib/lunchclub/data';
import { validateSignupBody } from '@/lib/lunchclub/validation';
import { sendJoeNotification } from '@/lib/lunchclub/notify';

function clientIp(req: Request): string {
  const xff = req.headers.get('x-forwarded-for');
  if (xff) {
    const first = xff.split(',')[0]?.trim();
    if (first) return first;
  }
  const real = req.headers.get('x-real-ip');
  if (real) return real.trim();
  return 'unknown';
}

export async function POST(req: Request) {
  try {
    const ip = clientIp(req);
    const key = `lunchclub:signup:${ip}`;
    if (!checkAndRecord(key)) {
      return NextResponse.json({ error: 'rate_limited' }, { status: 429 });
    }

    let raw: unknown;
    try {
      raw = await req.json();
    } catch {
      return NextResponse.json({ error: 'invalid_json' }, { status: 400 });
    }

    const result = validateSignupBody(raw);
    if (!result.ok) {
      return NextResponse.json(
        { error: result.code, field: result.field },
        { status: 400 },
      );
    }

    const input = result.value;

    if (input.prospect_token) {
      const prospect = await getProspectByToken(input.prospect_token);
      if (prospect) {
        input.source = 'reactivation';
      } else {
        // Silent fallback: deleted prospects should not 4xx a real submission.
        input.prospect_token = null;
        input.source = 'organic';
      }
    }

    const { id, markedProspectSignedUp } = await createSignup(input);

    if (process.env.LUNCHCLUB_NOTIFY_JOE !== 'false') {
      try {
        await sendJoeNotification({ signupId: id, input, markedProspectSignedUp });
      } catch (err) {
        // Email failure does not fail the request.
        console.error('[lunchclub] joe notification failed', err);
      }
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error('[lunchclub] signup server error', err);
    return NextResponse.json({ error: 'server_error' }, { status: 500 });
  }
}
