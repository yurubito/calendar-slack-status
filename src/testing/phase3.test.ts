import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { createHmac, randomUUID } from 'node:crypto';
import { fakeSlack, TOKEN, SECRET } from './fake-slack';
import { SlackAdapter, request, SlackError } from '../adapters/slack';
import { OAuth, userScopes } from '../adapters/oauth';
import { UserStateStore, type Properties } from '../adapters/state';
import { defaultSettings } from '../core/decision';
import type { CalendarEvent, Settings } from '../core/types';
import { runTick, type TickPorts } from '../tick';
import { connectionMarkup, reconnectBanner } from '../ui/connection';
import { messages } from '../ui/strings';
import { Triggers } from '../adapters/triggers';
function properties(): Properties {
  const m = new Map<string, string>();
  return {
    getProperty: (k) => m.get(k) ?? null,
    setProperty(k, v) {
      m.set(k, v);
      return this as GoogleAppsScript.Properties.Properties;
    },
    deleteProperty(k) {
      m.delete(k);
      return this as GoogleAppsScript.Properties.Properties;
    },
  };
}
let fake: Awaited<ReturnType<typeof fakeSlack>>;
let user: Properties, script: Properties, state: UserStateStore, oauth: OAuth;
let now: number, settings: Settings, events: CalendarEvent[], p: TickPorts;
const triggers = { ensure: vi.fn(), remove: vi.fn() };
beforeEach(async () => {
  fake = await fakeSlack();
  user = properties();
  script = properties();
  state = new UserStateStore(user);
  now = Date.parse('2026-10-25T09:00:00Z');
  script.setProperty('SLACK_CLIENT_ID', 'fixture-client');
  script.setProperty('SLACK_CLIENT_SECRET', SECRET);
  triggers.ensure.mockReset();
  triggers.remove.mockReset();
  oauth = new OAuth(
    script,
    user,
    state,
    fake.fetch,
    {
      random: randomUUID,
      sign: (v, k) => createHmac('sha256', k).update(v).digest('hex'),
    },
    () => now,
    'fixture-user',
    'https://example.invalid/exec',
    triggers,
  );
  settings = { ...defaultSettings('sample'), pauseNotifications: true };
  events = [
    {
      id: 'event-1',
      calendarId: 'sample',
      title: 'Fixture activity',
      start: now - 60000,
      end: now + 3600000,
      allDay: false,
      free: false,
      declined: false,
    },
  ];
  state.save({ connection: 'connected' });
  p = {
    calendar: { readEvents: () => events },
    settings: { load: () => settings, save: () => {} },
    state,
    slack: new SlackAdapter(fake.fetch, TOKEN, () => now),
    now: () => now,
    log: vi.fn(),
    lock: { tryLock: vi.fn(() => true), releaseLock: vi.fn() },
    mail: vi.fn(),
    removeTrigger: triggers.remove,
    dryRun: false,
  };
});
afterEach(() => {
  fake.close();
});
const writes = () =>
  fake.requests.filter((r) =>
    ['users.profile.set', 'dnd.setSnooze', 'dnd.endSnooze'].includes(r.method),
  );
function connect(code = 'fixture-code') {
  const url = new URL(oauth.getAuthUrl());
  oauth.callback({ code, state: url.searchParams.get('state')! });
  return url;
}
it('a event starts: exact profile seconds and snooze minutes', () => {
  expect(runTick(p)).toBe('applied');
  expect(JSON.parse(writes()[0].fields.profile)).toEqual({
    status_text: events[0].title,
    status_emoji: ':calendar:',
    status_expiration: events[0].end / 1000,
  });
  expect(writes()[1].fields).toEqual({ num_minutes: '60' });
  expect(state.load().lastAppliedStatus?.expiresAt).toBe(events[0].end);
});
it('b unchanged next tick has zero additional writes', () => {
  runTick(p);
  const n = writes().length;
  now += 300000;
  expect(runTick(p)).toBe('nothing');
  expect(writes()).toHaveLength(n);
});
it('c manually changed status is untouched', () => {
  fake.control({
    profile: {
      status_text: 'Manual',
      status_emoji: ':wave:',
      status_expiration: 0,
    },
  });
  settings = { ...settings, pauseNotifications: false };
  runTick(p);
  expect(writes()).toHaveLength(0);
});
it('d empty status may be set', () => {
  runTick(p);
  expect(writes()[0].method).toBe('users.profile.set');
});
it('e ended event makes no writes', () => {
  now = events[0].end;
  expect(runTick(p)).toBe('nothing');
  expect(writes()).toHaveLength(0);
});
it('f ignore and disabled rules and none with pausing rule', () => {
  settings = {
    ...settings,
    rules: [
      { keyword: 'Fixture', match: 'contains', enabled: true, ignore: true },
    ],
  };
  runTick(p);
  expect(writes()).toHaveLength(0);
  settings = {
    ...settings,
    displayMode: 'none',
    pauseNotifications: false,
    rules: [
      { keyword: 'Fixture', match: 'contains', enabled: false, ignore: true },
      {
        keyword: 'Fixture',
        match: 'contains',
        enabled: true,
        pauseNotifications: true,
      },
    ],
  };
  runTick(p);
  expect(writes().map((r) => r.method)).toEqual(['dnd.setSnooze']);
});
it.each(['latestStart', 'ruleOrder'] as const)(
  'g overlap strategy %s',
  (overlap) => {
    events.push({
      ...events[0],
      id: 'event-2',
      title: 'Later activity',
      start: now,
    });
    settings = {
      ...settings,
      overlap,
      rules: [{ keyword: 'Fixture', enabled: true, match: 'contains' }],
    };
    runTick(p);
    expect(JSON.parse(writes()[0].fields.profile).status_text).toBe(
      overlap === 'latestStart' ? 'Later activity' : 'Fixture activity',
    );
  },
);
it('h dry run logs exact intended calls without persisting writes', () => {
  p.dryRun = true;
  expect(runTick(p)).toBe('dry_run');
  expect(writes()).toHaveLength(0);
  expect(state.load().lastAppliedStatus).toBeUndefined();
  expect(state.load().lastAppliedNotification).toBeUndefined();
  expect(p.log).toHaveBeenCalledWith(
    JSON.stringify({ method: 'dnd.setSnooze', num_minutes: 60 }),
  );
  expect(JSON.stringify(vi.mocked(p.log).mock.calls)).toContain(
    'status_expiration',
  );
  expect(JSON.stringify(vi.mocked(p.log).mock.calls)).not.toContain(TOKEN);
});
it('i HTTP 500 does not persist failed status and retries next tick', () => {
  fake.control({ failure: { method: 'users.profile.set', status: 500 } });
  expect(runTick(p)).toBe('error:http_error');
  expect(state.load().lastAppliedStatus).toBeUndefined();
  expect(state.load().lastAppliedNotification).toBeUndefined();
  expect(runTick(p)).toBe('applied');
  expect(writes().filter((r) => r.method === 'users.profile.set')).toHaveLength(
    2,
  );
});
it('j invalid auth reconnect removes trigger and sends at most one daily email', () => {
  fake.control({
    failure: { method: 'users.profile.get', error: 'invalid_auth' },
  });
  runTick(p);
  expect(state.load().connection).toBe('needs_reconnect');
  expect(triggers.remove).toHaveBeenCalled();
  runTick(p);
  expect(p.mail).toHaveBeenCalledTimes(1);
  now += 86400000;
  runTick(p);
  expect(p.mail).toHaveBeenCalledTimes(2);
  expect(fake.requests).toHaveLength(1);
});
it('k HTTP 429 skips writes and preserves applied state', () => {
  fake.control({ failure: { method: 'users.profile.get', status: 429 } });
  expect(runTick(p)).toBe('error:rate_limited');
  expect(state.load().lastAppliedStatus).toBeUndefined();
  expect(writes()).toHaveLength(0);
});
it('l held lock skips all work', () => {
  p.lock.tryLock = () => false;
  expect(runTick(p)).toBe('locked');
  expect(fake.requests).toHaveLength(0);
  expect(p.lock.releaseLock).not.toHaveBeenCalled();
});
it('m disconnected skips all work', () => {
  state.save({});
  expect(runTick(p)).toBe('not_connected');
  expect(fake.requests).toHaveLength(0);
});
it('n DST crossing uses epoch expiry and duration', () => {
  now = Date.parse('2026-11-01T01:30:00-04:00');
  events = [
    { ...events[0], start: now, end: Date.parse('2026-11-01T02:30:00-05:00') },
  ];
  runTick(p);
  expect(JSON.parse(writes()[0].fields.profile).status_expiration).toBe(
    events[0].end / 1000,
  );
  expect(writes()[1].fields.num_minutes).toBe('120');
});
it('partial success persists status but retries only failed DND', () => {
  fake.control({ failure: { method: 'dnd.setSnooze', status: 500 } });
  runTick(p);
  expect(state.load().lastAppliedStatus).toBeDefined();
  expect(state.load().lastAppliedNotification).toBeUndefined();
  runTick(p);
  expect(writes().map((r) => r.method)).toEqual([
    'users.profile.set',
    'dnd.setSnooze',
    'dnd.setSnooze',
  ]);
});
it('resume notifications and minimum rounded snooze', () => {
  const slack = p.slack;
  slack.setNotifications({ type: 'snooze', until: now + 1 });
  slack.setNotifications({ type: 'resume' });
  expect(writes().map((r) => r.fields)).toEqual([{ num_minutes: '1' }, {}]);
});
it.each([
  'invalid_auth',
  'not_authed',
  'token_revoked',
  'token_expired',
  'account_inactive',
  'missing_scope',
])('typed authentication error %s', (error) => {
  fake.control({ failure: { method: 'users.profile.get', error } });
  try {
    p.slack.readStatus();
    throw new Error('expected error');
  } catch (e) {
    expect(e).toBeInstanceOf(SlackError);
    expect((e as SlackError).kind).toBe('auth');
  }
});
it('rate retry-after and timeout produce sanitized typed errors', () => {
  fake.control({ failure: { method: 'users.profile.get', status: 429 } });
  try {
    p.slack.readStatus();
  } catch (e) {
    expect((e as SlackError).retryAfter).toBe(30);
  }
  fake.control({ failure: { method: 'users.profile.get', delay: 400 } });
  expect(() => p.slack.readStatus()).toThrow('transport');
});
it('OAuth URL has only user scopes and server redirect fallback', () => {
  const u = new URL(oauth.getAuthUrl());
  expect(u.searchParams.get('user_scope')).toBe(userScopes);
  expect(u.searchParams.has('scope')).toBe(false);
  expect(u.searchParams.get('redirect_uri')).toBe(
    'https://example.invalid/exec',
  );
  expect(u.href).not.toContain(SECRET);
  script.setProperty('REDIRECT_URL', 'https://example.invalid/custom');
  expect(new URL(oauth.getAuthUrl()).searchParams.get('redirect_uri')).toBe(
    'https://example.invalid/custom',
  );
});
it.each(['tampered', 'expired', 'reused', 'foreign', 'future'] as const)(
  'rejects %s OAuth state',
  (kind) => {
    const original = new URL(oauth.getAuthUrl()).searchParams.get('state')!;
    let value = original;
    if (kind === 'tampered') value += 'x';
    if (kind === 'expired') now += 600000;
    if (kind === 'future') now -= 1;
    if (kind === 'reused') oauth.callback({ code: 'once', state: value });
    if (kind === 'foreign')
      oauth = new OAuth(
        script,
        user,
        state,
        fake.fetch,
        {
          random: randomUUID,
          sign: (v, k) => createHmac('sha256', k).update(v).digest('hex'),
        },
        () => now,
        'other-user',
        'https://example.invalid/exec',
        triggers,
      );
    expect(() => oauth.callback({ code: 'twice', state: value })).toThrow(
      'invalid_state',
    );
  },
);
it('OAuth success stores only user token and metadata and clears nonce', () => {
  connect();
  expect(user.getProperty('slack_token')).toBe(TOKEN);
  expect(user.getProperty('slack_team')).toBe('Sample team');
  expect(user.getProperty('oauth_nonce')).toBeNull();
  expect(script.getProperty('slack_token')).toBeNull();
  expect(state.load()).toEqual({ connection: 'connected' });
});
it.each([
  'invalid_code',
  'bad_client_secret',
  'invalid_auth',
  'ratelimited',
  'http500',
  'timeout',
  'denied',
  'missing_code',
  'missing_scope',
])('OAuth exchange failure %s', (kind) => {
  const value = new URL(oauth.getAuthUrl()).searchParams.get('state')!;
  if (kind === 'bad_client_secret')
    script.setProperty('SLACK_CLIENT_SECRET', 'wrong');
  else if (kind === 'missing_scope') fake.control({ scopes: [] });
  else if (!['denied', 'missing_code', 'invalid_code'].includes(kind))
    fake.control({
      failure: {
        method: 'oauth.v2.access',
        error: kind,
        status: kind === 'http500' ? 500 : 200,
        delay: kind === 'timeout' ? 400 : 0,
      },
    });
  expect(() =>
    oauth.callback({
      state: value,
      code:
        kind === 'missing_code'
          ? undefined
          : kind === 'invalid_code'
            ? 'bad'
            : 'valid',
      error: kind === 'denied' ? 'access_denied' : undefined,
    }),
  ).toThrow();
  expect(user.getProperty('slack_token')).toBeNull();
  expect(triggers.ensure).not.toHaveBeenCalled();
  expect(user.getProperty('oauth_nonce')).toBeNull();
});
it('authorization codes are single use', () => {
  connect('single');
  const s = new URL(oauth.getAuthUrl()).searchParams.get('state')!;
  expect(() => oauth.callback({ code: 'single', state: s })).toThrow(
    'invalid_code',
  );
});
it.each([false, true])(
  'disconnect cleans user data even with revoke failure %s',
  (fail) => {
    connect();
    oauth.getAuthUrl();
    state.save({ ...state.load(), lastRun: now, lastResult: 'applied' });
    if (fail) fake.control({ failure: { method: 'auth.revoke', status: 500 } });
    oauth.disconnect();
    for (const k of ['slack_token', 'slack_team', 'oauth_nonce', 'automation'])
      expect(user.getProperty(k)).toBeNull();
    expect(triggers.remove).toHaveBeenCalled();
  },
);
it('trigger ensure removes stale duplicates and connect twice leaves one', () => {
  const list: { getHandlerFunction(): string }[] = [];
  const service = {
    getProjectTriggers: () => [...list],
    deleteTrigger: (t: unknown) => {
      list.splice(list.indexOf(t as (typeof list)[number]), 1);
    },
    newTrigger: () => ({
      timeBased: () => ({
        everyMinutes: (n: number) => ({
          create: () => {
            expect(n).toBe(5);
            list.push({ getHandlerFunction: () => 'tick' });
          },
        }),
      }),
    }),
  };
  const actual = new Triggers(
    service as unknown as GoogleAppsScript.Script.ScriptApp,
  );
  triggers.ensure.mockImplementation(() => actual.ensure());
  triggers.remove.mockImplementation(() => actual.remove());
  list.push(
    { getHandlerFunction: () => 'tick' },
    { getHandlerFunction: () => 'tick' },
  );
  connect('one');
  connect('two');
  expect(list).toHaveLength(1);
  oauth.disconnect();
  expect(list).toHaveLength(0);
});
it('full lifecycle token hygiene in logs errors UI payloads and URLs', () => {
  connect();
  runTick(p);
  now += 300000;
  runTick(p);
  p.dryRun = true;
  runTick(p);
  fake.control({
    failure: { method: 'users.profile.get', error: 'token_revoked' },
  });
  runTick(p);
  const s = state.load();
  const payload = {
    connection: s.connection,
    team: user.getProperty('slack_team') ?? '',
    lastRun: s.lastRun,
    lastResult: s.lastResult,
  };
  const visible = JSON.stringify({
    logs: vi.mocked(p.log).mock.calls,
    payload,
    urls: fake.requests.map((r) => r.url),
    ui: connectionMarkup({ ...payload, connection: s.connection! }, 'en'),
  });
  expect(visible).not.toContain(TOKEN);
  expect(visible).not.toContain(SECRET);
  expect(visible).not.toContain(events[0].title);
  for (const r of fake.requests.filter((r) => r.method !== 'oauth.v2.access'))
    expect(r.headers.authorization).toBe(`Bearer ${TOKEN}`);
});
it.each(['en', 'ja'] as const)(
  'connection states and global banner in %s',
  (locale) => {
    for (const connection of [
      'connected',
      'not_connected',
      'needs_reconnect',
    ] as const) {
      const c = {
        connection,
        team: '<sample>',
        lastRun: now,
        lastResult: 'applied',
      };
      const html = connectionMarkup(c, locale);
      expect(html).toContain(messages[locale].checkNow);
      expect(html).toContain(messages[locale].lastCheck);
      expect(html).toContain(
        messages[locale][
          connection === 'connected'
            ? 'connected'
            : connection === 'not_connected'
              ? 'notConnected'
              : 'reconnect'
        ],
      );
      expect(reconnectBanner(c, locale).includes('role="alert"')).toBe(
        connection === 'needs_reconnect',
      );
      expect(html).not.toContain('<sample>');
    }
  },
);
it('state store rejects corruption unknown versions and malformed fields', () => {
  for (const raw of ['bad', 'null', '{"version":2,"state":{}}']) {
    user.setProperty('automation', raw);
    expect(state.load()).toEqual({});
  }
  user.setProperty(
    'automation',
    JSON.stringify({
      version: 1,
      state: {
        connection: 'bad',
        lastAppliedStatus: { text: 1 },
        lastAppliedNotification: { type: 'snooze', until: 'bad' },
        lastRun: 'bad',
        lastResult: TOKEN,
        lastEmailDate: 'bad',
      },
    }),
  );
  expect(state.load()).toEqual({});
});
it('fake rejects missing scopes malformed profile and snooze fields', () => {
  fake.control({ scopes: [] });
  expect(() =>
    p.slack.setStatus({ text: 'x', emoji: '', expiresAt: now }),
  ).toThrow('missing_scope');
  fake.control({ scopes: userScopes.split(',') });
  for (const fields of [
    { profile: 'not json' },
    {
      profile: JSON.stringify({
        status_text: 'x'.repeat(101),
        status_emoji: '',
        status_expiration: 1,
      }),
    },
    {
      profile: JSON.stringify({
        status_text: 'x',
        status_emoji: '',
        status_expiration: 1.5,
      }),
    },
  ])
    expect(() =>
      request(fake.fetch, 'users.profile.set', fields, TOKEN),
    ).toThrow('invalid_profile');
  expect(() =>
    request(fake.fetch, 'dnd.setSnooze', { num_minutes: '0' }, TOKEN),
  ).toThrow('invalid_arguments');
  expect(() => request(fake.fetch, 'users.profile.get', {})).toThrow(
    'invalid_auth',
  );
});
it('manual indefinite pause survives ticks without notification calls', () => {
  state.save({ connection: 'connected', manualPauseUntilResumed: true });
  runTick(p);
  expect(writes().map((r) => r.method)).toEqual(['users.profile.set']);
});
it('transport and hostile raw responses never escape as errors or logs', () => {
  for (const response of [
    { status: 200, body: TOKEN },
    { status: 500, body: SECRET },
    { status: 200, body: JSON.stringify({ ok: false, error: SECRET }) },
  ]) {
    p.slack = new SlackAdapter(
      () => response,
      TOKEN,
      () => now,
    );
    runTick(p);
    expect(JSON.stringify(vi.mocked(p.log).mock.calls)).not.toContain(SECRET);
    expect(JSON.stringify(vi.mocked(p.log).mock.calls)).not.toContain(TOKEN);
  }
});
it('second precision at Slack boundary avoids repeated subsecond writes', () => {
  events = [{ ...events[0], end: events[0].end + 123 }];
  runTick(p);
  runTick(p);
  expect(writes().filter((r) => r.method === 'users.profile.set')).toHaveLength(
    1,
  );
});
it('trigger setup failure never reports a connected working installation', () => {
  triggers.ensure.mockImplementation(() => {
    throw new Error('quota');
  });
  expect(() => connect()).toThrow('trigger_setup_failed');
  expect(state.load().connection).toBe('needs_reconnect');
});
it('approaching execution budget logs fixed warning and releases lock', () => {
  let calls = 0;
  p.now = () => now + (calls++ === 0 ? 0 : 240000);
  runTick(p);
  expect(p.log).toHaveBeenCalledWith('runtime_near_limit');
  expect(p.lock.releaseLock).toHaveBeenCalledTimes(1);
});
