import http from 'node:http';
import { URLSearchParams } from 'node:url';
import { setTimeout } from 'node:timers';
import process from 'node:process';
const requests = [],
  failures = [];
let profile = { status_text: '', status_emoji: '', status_expiration: 0 };
let scopes = ['users.profile:read', 'users.profile:write', 'dnd:write'];
let revoked = false;
const codes = new Set();
const token = 'fixture-user-credential',
  secret = 'fixture-client-credential';
const server = http.createServer(async (req, res) => {
  let body = '';
  for await (const chunk of req) body += chunk;
  const method = req.url.slice(1);
  const fields = Object.fromEntries(new URLSearchParams(body));
  const reply = (data, status = 200, headers = {}) => {
    res.writeHead(status, { 'Content-Type': 'application/json', ...headers });
    res.end(JSON.stringify(data));
  };
  if (method === '_control') {
    const c = JSON.parse(fields.data);
    if (c.failure) failures.push(c.failure);
    if (c.profile) profile = c.profile;
    if (c.scopes) scopes = c.scopes;
    return reply({ ok: true, requests, profile });
  }
  requests.push({ method, url: req.url, headers: req.headers, fields });
  if (
    req.method !== 'POST' ||
    !req.headers['content-type']?.startsWith(
      'application/x-www-form-urlencoded',
    )
  )
    return reply({ ok: false, error: 'invalid_arguments' });
  const f = failures.findIndex((f) => f.method === method);
  if (f >= 0) {
    const failure = failures.splice(f, 1)[0];
    if (failure.delay)
      await new Promise((resolve) => setTimeout(resolve, failure.delay));
    return reply(
      { ok: false, error: failure.error ?? 'server_error' },
      failure.status ?? 200,
      failure.status === 429 ? { 'Retry-After': '30' } : {},
    );
  }
  if (method === 'oauth.v2.access') {
    if (
      fields.client_id !== 'fixture-client' ||
      fields.client_secret !== secret
    )
      return reply({ ok: false, error: 'bad_client_secret' });
    if (!fields.code || codes.has(fields.code) || fields.code === 'bad')
      return reply({ ok: false, error: 'invalid_code' });
    codes.add(fields.code);
    revoked = false;
    return reply({
      ok: true,
      authed_user: {
        access_token: token,
        token_type: 'user',
        scope: scopes.join(','),
      },
      team: { name: 'Sample team' },
    });
  }
  if (req.headers.authorization !== `Bearer ${token}` || revoked)
    return reply({ ok: false, error: 'invalid_auth' });
  const required = {
    'users.profile.get': 'users.profile:read',
    'users.profile.set': 'users.profile:write',
    'dnd.setSnooze': 'dnd:write',
    'dnd.endSnooze': 'dnd:write',
  }[method];
  if (required && !scopes.includes(required))
    return reply({ ok: false, error: 'missing_scope' });
  if (method === 'auth.revoke') {
    revoked = true;
    return reply({ ok: true });
  }
  if (method === 'auth.test') return reply({ ok: true });
  if (method === 'users.profile.get') return reply({ ok: true, profile });
  if (method === 'users.profile.set') {
    let p;
    try {
      p = JSON.parse(fields.profile);
    } catch {
      return reply({ ok: false, error: 'invalid_profile' });
    }
    if (
      typeof p.status_text !== 'string' ||
      Array.from(p.status_text).length > 100 ||
      typeof p.status_emoji !== 'string' ||
      !Number.isInteger(p.status_expiration) ||
      p.status_expiration < 0
    )
      return reply({ ok: false, error: 'invalid_profile' });
    profile = p;
    return reply({ ok: true });
  }
  if (method === 'dnd.setSnooze') {
    if (!/^\d+$/.test(fields.num_minutes) || Number(fields.num_minutes) < 1)
      return reply({ ok: false, error: 'invalid_arguments' });
    return reply({ ok: true });
  }
  if (method === 'dnd.endSnooze') return reply({ ok: true });
  reply({ ok: false, error: 'unknown_method' });
});
server.listen(0, '127.0.0.1', () =>
  process.send({ port: server.address().port }),
);
