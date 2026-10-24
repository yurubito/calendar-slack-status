import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { createHmac, randomUUID } from 'node:crypto';
import { fakeSlack, TOKEN, SECRET } from './fake-slack';
import {
  getAuthUrl,
  getConnection,
  doGet,
  checkNow,
  disconnect,
} from '../server';
import { messages } from '../ui/strings';
let fake: Awaited<ReturnType<typeof fakeSlack>>;
let user: Map<string, string>, script: Map<string, string>;
let lock: {
  waitLock: ReturnType<typeof vi.fn>;
  tryLock: ReturnType<typeof vi.fn>;
  releaseLock: ReturnType<typeof vi.fn>;
};
let list: { getHandlerFunction(): string }[];
const now = Date.parse('2026-10-25T09:00:00Z');
function prop(m: Map<string, string>) {
  return {
    getProperty: (k: string) => m.get(k) ?? null,
    setProperty: (k: string, v: string) => m.set(k, v),
    deleteProperty: (k: string) => m.delete(k),
  };
}
beforeEach(async () => {
  fake = await fakeSlack();
  user = new Map();
  script = new Map([
    ['SLACK_CLIENT_ID', 'fixture-client'],
    ['SLACK_CLIENT_SECRET', SECRET],
  ]);
  list = [];
  vi.spyOn(Date, 'now').mockReturnValue(now);
  vi.spyOn(console, 'log').mockImplementation(() => {});
  lock = {
    waitLock: vi.fn(),
    tryLock: vi.fn(() => true),
    releaseLock: vi.fn(),
  };
  vi.stubGlobal('LockService', {
    getUserLock: () => lock,
    getScriptLock: () => lock,
  });
  vi.stubGlobal('PropertiesService', {
    getUserProperties: () => prop(user),
    getScriptProperties: () => prop(script),
  });
  vi.stubGlobal('Utilities', {
    getUuid: randomUUID,
    computeHmacSha256Signature: (v: string, k: string) =>
      createHmac('sha256', k).update(v).digest(),
    base64EncodeWebSafe: (v: Buffer) => v.toString('base64url'),
  });
  vi.stubGlobal('Session', {
    getTemporaryActiveUserKey: () => 'fixture-user',
    getScriptTimeZone: () => 'Etc/UTC',
  });
  vi.stubGlobal('MailApp', { sendEmail: vi.fn() });
  vi.stubGlobal('ScriptApp', {
    getService: () => ({ getUrl: () => 'https://example.invalid/exec' }),
    getProjectTriggers: () => [...list],
    deleteTrigger: (t: (typeof list)[number]) =>
      list.splice(list.indexOf(t), 1),
    newTrigger: () => ({
      timeBased: () => ({
        everyMinutes: () => ({
          create: () => list.push({ getHandlerFunction: () => 'tick' }),
        }),
      }),
    }),
  });
  vi.stubGlobal('CalendarApp', {
    getDefaultCalendar: () => ({ getId: () => 'sample' }),
    getAllCalendars: () => [],
    getCalendarById: () => ({
      getEvents: () => [
        {
          getId: () => 'fixture-event',
          getTitle: () => 'Fixture activity',
          getStartTime: () => new Date(now - 60000),
          getEndTime: () => new Date(now + 3600000),
          isAllDayEvent: () => false,
          isRecurringEvent: () => false,
          getTransparency: () => 'OPAQUE',
          getMyStatus: () => 'YES',
        },
      ],
    }),
  });
  vi.stubGlobal('HtmlService', {
    createHtmlOutput: (html: string) => ({ html }),
    createHtmlOutputFromFile: () => ({
      setTitle() {
        return this;
      },
      addMetaTag() {
        return this;
      },
    }),
  });
  vi.stubGlobal('UrlFetchApp', {
    fetch: (
      url: string,
      options: GoogleAppsScript.URL_Fetch.URLFetchRequestOptions,
    ) => {
      expect(options.method).toBe('post');
      expect(options.contentType).toBe('application/x-www-form-urlencoded');
      expect(options.muteHttpExceptions).toBe(true);
      const token = (
        options.headers?.Authorization as string | undefined
      )?.replace(/^Bearer /, '');
      const r = fake.fetch(
        url,
        options.payload as Record<string, string>,
        token,
      );
      return {
        getResponseCode: () => r.status,
        getContentText: () => r.body,
        getHeaders: () => ({ 'Retry-After': r.retryAfter }),
      };
    },
  });
});
afterEach(() => {
  fake.close();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});
function callback(parameter: Record<string, string>) {
  return doGet({ parameter } as GoogleAppsScript.Events.DoGet) as unknown as {
    html: string;
  };
}
it('server connect callback check-now disconnect uses real glue without exposing credentials', () => {
  const value = new URL(getAuthUrl()).searchParams.get('state')!;
  const page = callback({ code: 'server-code', state: value });
  expect(page.html).toContain(messages.en.oauthSuccess);
  expect(page.html).toContain(messages.ja.oauthSuccess);
  expect(page.html).toContain('target="_top"');
  expect(list).toHaveLength(1);
  expect(checkNow().lastResult).toBe('applied');
  expect(checkNow().lastResult).toBe('nothing');
  const visible = JSON.stringify({
    page,
    payload: getConnection(),
    logs: vi.mocked(console.log).mock.calls,
    urls: fake.requests.map((r) => r.url),
  });
  expect(visible).not.toContain(TOKEN);
  expect(visible).not.toContain(SECRET);
  expect(visible).not.toContain('Fixture activity');
  disconnect();
  expect(getConnection()).toEqual({
    connection: 'not_connected',
    team: '',
    lastRun: undefined,
    lastResult: undefined,
  });
  expect(list).toHaveLength(0);
  expect(lock.releaseLock).toHaveBeenCalled();
});
it.each(['tampered', 'denied', 'exchange_error'])(
  'callback %s renders fixed bilingual error with app link',
  (kind) => {
    const value = new URL(getAuthUrl()).searchParams.get('state')!;
    if (kind === 'exchange_error')
      fake.control({ failure: { method: 'oauth.v2.access', error: SECRET } });
    const page = callback({
      code: 'failure-code',
      state: kind === 'tampered' ? value + 'x' : value,
      ...(kind === 'denied' ? { error: 'access_denied' } : {}),
    });
    expect(page.html).toContain(messages.en.oauthError);
    expect(page.html).toContain(messages.ja.oauthError);
    expect(page.html).toContain('https://example.invalid/exec');
    expect(page.html).not.toContain(SECRET);
    expect(page.html).not.toContain(TOKEN);
    expect(list).toHaveLength(0);
  },
);
it('glue dry-run flag blocks writes and invalid auth mails bilingually without identity scope', () => {
  callback({
    code: 'dry-code',
    state: new URL(getAuthUrl()).searchParams.get('state')!,
  });
  script.set('DRY_RUN', 'true');
  expect(checkNow().lastResult).toBe('dry_run');
  expect(
    fake.requests.filter((r) => r.method === 'users.profile.set'),
  ).toHaveLength(0);
  fake.control({
    failure: { method: 'users.profile.get', error: 'invalid_auth' },
  });
  expect(checkNow().connection).toBe('needs_reconnect');
  expect(list).toHaveLength(0);
  expect(MailApp.sendEmail).toHaveBeenCalledWith(
    'sample',
    messages.en.reconnect,
    expect.stringContaining(messages.ja.reconnectMail),
  );
  checkNow();
  expect(MailApp.sendEmail).toHaveBeenCalledTimes(1);
});
