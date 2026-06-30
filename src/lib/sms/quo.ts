/**
 * Shared SMS sender backed by OpenPhone ("Quo") REST API.
 *
 * Reads QUO_API_KEY and QUO_FROM_PHONE from env. POSTs to
 * https://api.openphone.com/v1/messages with header
 * `Authorization: <key>` (no Bearer prefix).
 *
 * Never throws: callers branch on result.ok so a Quo outage doesn't break
 * a webhook or cron transaction.
 */

export interface SendSmsArgs {
  to: string;
  body: string;
}

export interface SendSmsResult {
  ok: boolean;
  id?: string;
  status?: number;
  error?: string;
}

const QUO_URL = 'https://api.openphone.com/v1/messages';

export async function sendSms(args: SendSmsArgs): Promise<SendSmsResult> {
  const apiKey = process.env.QUO_API_KEY;
  const fromPhone = process.env.QUO_FROM_PHONE;
  if (!apiKey) {
    return { ok: false, error: 'QUO_API_KEY not configured' };
  }
  if (!fromPhone) {
    return { ok: false, error: 'QUO_FROM_PHONE not configured' };
  }
  if (!args.to || !args.body) {
    return { ok: false, error: 'missing to or body' };
  }

  try {
    const res = await fetch(QUO_URL, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        Authorization: apiKey,
      },
      body: JSON.stringify({
        from: fromPhone,
        to: [args.to],
        content: args.body,
      }),
    });
    const text = await res.text();
    if (!res.ok) {
      return {
        ok: false,
        status: res.status,
        error: text.slice(0, 500),
      };
    }
    let id: string | undefined;
    try {
      const parsed = JSON.parse(text) as { data?: { id?: string }; id?: string };
      id = parsed?.data?.id ?? parsed?.id;
    } catch {
      /* ignore parse errors */
    }
    return { ok: true, id, status: res.status };
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : String(err),
    };
  }
}
