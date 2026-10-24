import type { SlackClient, Status, NotificationAction } from '../core/types';
export interface Response {
  status: number;
  body: string;
  retryAfter?: string;
}
export type Fetch = (
  url: string,
  fields: Record<string, string>,
  token?: string,
) => Response;
export class SlackError extends Error {
  constructor(
    public code: string,
    public kind: 'auth' | 'rate' | 'other' = 'other',
    public retryAfter?: number,
  ) {
    super(code);
  }
}
const authErrors = [
  'invalid_auth',
  'not_authed',
  'token_revoked',
  'token_expired',
  'account_inactive',
  'missing_scope',
];
export function request(
  fetch: Fetch,
  method: string,
  fields: Record<string, string>,
  token?: string,
): Record<string, unknown> {
  let r: Response;
  try {
    r = fetch(`https://slack.com/api/${method}`, fields, token);
  } catch {
    throw new SlackError('transport');
  }
  if (r.status === 429)
    throw new SlackError(
      'rate_limited',
      'rate',
      Number(r.retryAfter) || undefined,
    );
  if (r.status < 200 || r.status >= 300) throw new SlackError('http_error');
  let data: Record<string, unknown>;
  try {
    data = JSON.parse(r.body);
  } catch {
    throw new SlackError('invalid_response');
  }
  if (data?.ok !== true) {
    const raw = typeof data?.error === 'string' ? data.error : '';
    const code = [
      ...authErrors,
      'ratelimited',
      'rate_limited',
      'invalid_code',
      'bad_client_secret',
      'bad_client_id',
      'invalid_arguments',
      'invalid_profile',
      'access_denied',
      'code_already_used',
      'invalid_redirect_uri',
      'redirect_uri_mismatch',
      'not_allowed',
      'service_unavailable',
      'internal_error',
      'fatal_error',
    ].includes(raw)
      ? raw
      : 'api_error';
    throw new SlackError(
      code,
      authErrors.includes(code)
        ? 'auth'
        : ['ratelimited', 'rate_limited'].includes(code)
          ? 'rate'
          : 'other',
    );
  }
  return data;
}
export class SlackAdapter implements SlackClient {
  constructor(
    private fetch: Fetch,
    private token: string,
    private now: () => number,
  ) {}
  readStatus(): Status {
    const p = request(this.fetch, 'users.profile.get', {}, this.token)
      .profile as Record<string, unknown>;
    if (!p || typeof p !== 'object') throw new SlackError('invalid_response');
    // A profile that never had a status may omit these fields: read as empty.
    const text = p.status_text ?? '';
    const emoji = p.status_emoji ?? '';
    const expiration = p.status_expiration ?? 0;
    if (
      typeof text !== 'string' ||
      typeof emoji !== 'string' ||
      !Number.isInteger(expiration)
    )
      throw new SlackError('invalid_response');
    return { text, emoji, expiresAt: Number(expiration) * 1000 };
  }
  setStatus(s: Status) {
    request(
      this.fetch,
      'users.profile.set',
      {
        profile: JSON.stringify({
          status_text: s.text,
          status_emoji: s.emoji,
          status_expiration: Math.floor(s.expiresAt / 1000),
        }),
      },
      this.token,
    );
  }
  setNotifications(a: NotificationAction) {
    request(
      this.fetch,
      a.type === 'resume' ? 'dnd.endSnooze' : 'dnd.setSnooze',
      a.type === 'resume'
        ? {}
        : {
            num_minutes: String(
              Math.max(1, Math.ceil((a.until - this.now()) / 60000)),
            ),
          },
      this.token,
    );
  }
}
export const appsFetch: Fetch = (url, payload, token) => {
  const r = UrlFetchApp.fetch(url, {
    method: 'post',
    contentType: 'application/x-www-form-urlencoded',
    payload,
    headers: token ? { Authorization: `Bearer ${token}` } : {},
    muteHttpExceptions: true,
  });
  return {
    status: r.getResponseCode(),
    body: r.getContentText(),
    retryAfter: String(
      (r.getHeaders() as Record<string, unknown>)['Retry-After'] ?? '',
    ),
  };
};
