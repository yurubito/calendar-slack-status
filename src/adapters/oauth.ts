import type { Properties, StateStore } from './state';
import { request, type Fetch } from './slack';
export const userScopes = 'users.profile:read,users.profile:write,dnd:write';
export interface Crypto {
  random(): string;
  sign(value: string, secret: string): string;
}
export class OAuth {
  constructor(
    private script: Properties,
    private user: Properties,
    private state: StateStore,
    private fetch: Fetch,
    private crypto: Crypto,
    private now: () => number,
    private userId: string,
    private appUrl: string,
    private triggers: { ensure(): void; remove(): void },
  ) {}
  private redirect() {
    return this.script.getProperty('REDIRECT_URL') || this.appUrl;
  }
  private secret() {
    let key = this.script.getProperty('OAUTH_STATE_SECRET');
    if (!key) {
      key = this.crypto.random();
      this.script.setProperty('OAUTH_STATE_SECRET', key);
    }
    return key;
  }
  getAuthUrl() {
    const client = this.script.getProperty('SLACK_CLIENT_ID');
    if (
      !client ||
      !this.script.getProperty('SLACK_CLIENT_SECRET') ||
      !this.redirect()
    )
      throw new Error('oauth_not_configured');
    const nonce = this.crypto.random();
    const payload = encodeURIComponent(
      JSON.stringify({ nonce, user: this.userId, time: this.now() }),
    );
    const state = `${payload}.${this.crypto.sign(payload, this.secret())}`;
    this.user.setProperty('oauth_nonce', nonce);
    const fields = {
      client_id: client,
      user_scope: userScopes,
      redirect_uri: this.redirect(),
      state,
    };
    return (
      'https://slack.com/oauth/v2/authorize?' +
      Object.entries(fields)
        .map(([k, v]) => `${k}=${encodeURIComponent(v)}`)
        .join('&')
    );
  }
  callback(params: Record<string, string | undefined>) {
    const state = params.state ?? '';
    const split = state.lastIndexOf('.');
    const payload = state.slice(0, split),
      signature = state.slice(split + 1);
    const expected = this.crypto.sign(payload, this.secret());
    let diff = signature.length ^ expected.length;
    for (let i = 0; i < expected.length; i++)
      diff |= expected.charCodeAt(i) ^ (signature.charCodeAt(i) || 0);
    if (diff || split < 1) throw new Error('invalid_state');
    let data: { nonce: string; user: string; time: number };
    try {
      data = JSON.parse(decodeURIComponent(payload));
    } catch {
      throw new Error('invalid_state');
    }
    if (
      data.user !== this.userId ||
      typeof data.nonce !== 'string' ||
      data.nonce !== this.user.getProperty('oauth_nonce') ||
      !Number.isFinite(data.time) ||
      this.now() < data.time ||
      this.now() - data.time >= 600000
    )
      throw new Error('invalid_state');
    this.user.deleteProperty('oauth_nonce');
    if (params.error || !params.code) throw new Error('authorization_failed');
    const r = request(this.fetch, 'oauth.v2.access', {
      client_id: this.script.getProperty('SLACK_CLIENT_ID') ?? '',
      client_secret: this.script.getProperty('SLACK_CLIENT_SECRET') ?? '',
      redirect_uri: this.redirect(),
      code: params.code,
    });
    const auth = r.authed_user as Record<string, unknown> | undefined;
    const team = r.team as Record<string, unknown> | undefined;
    if (
      typeof auth?.access_token !== 'string' ||
      auth.token_type !== 'user' ||
      typeof auth.scope !== 'string' ||
      !userScopes
        .split(',')
        .every((s) => (auth.scope as string).split(',').includes(s))
    )
      throw new Error('invalid_oauth_response');
    this.triggers.remove();
    this.user.setProperty('slack_token', auth.access_token);
    this.user.setProperty(
      'slack_team',
      typeof team?.name === 'string' ? team.name.slice(0, 200) : '',
    );
    try {
      this.triggers.ensure();
      this.state.save({ connection: 'connected' });
    } catch {
      this.state.save({ connection: 'needs_reconnect' });
      throw new Error('trigger_setup_failed');
    }
  }
  disconnect() {
    const token = this.user.getProperty('slack_token');
    try {
      if (token) request(this.fetch, 'auth.revoke', {}, token);
    } catch {
      /* Local cleanup must succeed even if revocation fails. */
    }
    this.triggers.remove();
    for (const key of [
      'slack_token',
      'slack_team',
      'oauth_nonce',
      'automation',
    ])
      this.user.deleteProperty(key);
  }
}
export const appsCrypto: Crypto = {
  random: () => Utilities.getUuid() + Utilities.getUuid(),
  sign: (value, secret) =>
    Utilities.base64EncodeWebSafe(
      Utilities.computeHmacSha256Signature(value, secret),
    ),
};
