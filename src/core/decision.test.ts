import { describe, expect, it } from 'vitest';
import {
  buildStatus,
  decide,
  defaultSettings,
  matchRule,
  resolveOptions,
  selectEvent,
} from './decision';
import type { AutomationState, CalendarEvent, Rule, Settings } from './types';

const now = 1_800_000;
const event: CalendarEvent = {
  id: 'event-a',
  calendarId: 'primary',
  seriesId: 'series-a',
  title: 'Focus session',
  start: now - 600_000,
  end: now + 600_000,
  allDay: false,
  free: false,
  declined: false,
};
const settings = (patch: Partial<Settings> = {}): Settings => ({
  ...defaultSettings('primary'),
  ...patch,
});
const rule = (patch: Partial<Rule> = {}): Rule => ({
  keyword: 'Focus',
  match: 'contains',
  enabled: true,
  text: 'Rule text',
  ...patch,
});
const state: AutomationState = {
  currentStatus: { text: '', emoji: '', expiresAt: 0 },
  manualPauseUntilResumed: false,
};

describe('§8 keyword matching', () => {
  it('matches contains and exact literally and case-sensitively', () => {
    expect(matchRule(event.title, [rule()])).toBe(0);
    expect(matchRule(event.title, [rule({ match: 'exact' })])).toBe(-1);
    expect(
      matchRule(event.title, [rule({ match: 'exact', keyword: event.title })]),
    ).toBe(0);
    expect(matchRule(event.title, [rule({ keyword: 'focus' })])).toBe(-1);
    expect(matchRule(event.title, [rule({ keyword: '.*' })])).toBe(-1);
  });
  it('uses the first matching row and skips disabled rows', () => {
    const rules = [
      rule({ enabled: false }),
      rule({ text: 'First' }),
      rule({ text: 'Second' }),
    ];
    expect(matchRule(event.title, rules)).toBe(1);
    expect(resolveOptions(event, settings({ rules })).text).toBe('First');
  });
});

describe('§8 precedence', () => {
  it('uses event overrides above keyword rules above base settings', () => {
    const base = settings({ displayMode: 'fixed', fixedText: 'Base' });
    expect(buildStatus(event, base)?.text).toBe('Base');
    const withRule = {
      ...base,
      rules: [rule({ emoji: ':books:', pauseNotifications: true })],
    };
    expect(buildStatus(event, withRule)?.text).toBe('Rule text');
    const overridden = {
      ...withRule,
      overrides: [
        {
          calendarId: 'primary',
          target: { eventId: event.id },
          text: 'Override',
          pauseNotifications: false,
        },
      ],
    };
    expect(buildStatus(event, overridden)).toMatchObject({
      text: 'Override',
      emoji: ':books:',
    });
    expect(resolveOptions(event, overridden).pauseNotifications).toBe(false);
  });
  it('prefers occurrence over series overrides and scopes them to the calendar', () => {
    const config = settings({
      overrides: [
        {
          calendarId: 'other',
          target: { eventId: event.id },
          text: 'Wrong calendar',
        },
        {
          calendarId: 'primary',
          target: { seriesId: 'series-a' },
          text: 'Series',
          emoji: ':books:',
        },
        {
          calendarId: 'primary',
          target: { eventId: event.id },
          text: 'Occurrence',
        },
      ],
    });
    expect(buildStatus(event, config)).toMatchObject({
      text: 'Occurrence',
      emoji: ':books:',
    });
    expect(buildStatus({ ...event, id: 'event-b' }, config)?.text).toBe(
      'Series',
    );
  });
  it('allows an explicit false override to undo a rule ignore', () => {
    expect(
      selectEvent([event], settings({ rules: [rule({ ignore: true })] }), now),
    ).toBeUndefined();
    expect(
      selectEvent(
        [event],
        settings({
          rules: [rule({ ignore: true })],
          overrides: [
            {
              calendarId: 'primary',
              target: { eventId: event.id },
              ignore: false,
            },
          ],
        }),
        now,
      ),
    ).toEqual(event);
  });
});

describe('§8 status formatting', () => {
  it('substitutes every {title} literally and uses the title for empty rule text', () => {
    const title = '$& lesson';
    expect(
      buildStatus(
        { ...event, title },
        settings({ rules: [rule({ keyword: '', text: '{title} / {title}' })] }),
      )?.text,
    ).toBe(`${title} / ${title}`);
    expect(
      buildStatus(event, settings({ rules: [rule({ text: '' })] }))?.text,
    ).toBe(event.title);
  });
  it('truncates to 100 Unicode code points including the prefix', () => {
    const result = buildStatus(
      { ...event, title: '😀'.repeat(110) },
      settings({ prefix: 'A', maxLength: 200 }),
    );
    expect(result?.text).toBe('A' + '😀'.repeat(99));
    expect(
      buildStatus(event, settings({ prefix: 'X', maxLength: 4 }))?.text,
    ).toBe('XFoc');
  });
  it('defaults emoji to calendar and centralizes English and Japanese defaults', () => {
    expect(buildStatus(event, settings({ emoji: '' }))?.emoji).toBe(
      ':calendar:',
    );
    expect(defaultSettings('primary', 'en').fixedText).toBe('Busy');
    expect(defaultSettings('primary', 'ja').fixedText).toBe('予定あり');
    expect(defaultSettings('primary')).toMatchObject({
      displayMode: 'title',
      pauseNotifications: false,
      calendarIds: ['primary'],
    });
  });
  it('supports fixed and hidden modes, with rule text taking precedence', () => {
    expect(
      buildStatus(
        event,
        settings({ displayMode: 'fixed', fixedText: 'Private' }),
      )?.text,
    ).toBe('Private');
    expect(
      buildStatus(event, settings({ displayMode: 'none' })),
    ).toBeUndefined();
    expect(
      buildStatus(event, settings({ displayMode: 'none', rules: [rule()] }))
        ?.text,
    ).toBe('Rule text');
    expect(
      decide(
        [event],
        settings({ displayMode: 'none', pauseNotifications: true }),
        state,
        now,
      ),
    ).toEqual({ event, notification: { type: 'snooze', until: event.end } });
  });
});

describe('§8 event exclusions', () => {
  it.each(['allDay', 'free', 'declined'] as const)(
    'ignores %s events by default',
    (flag) => {
      expect(
        selectEvent([{ ...event, [flag]: true }], settings(), now),
      ).toBeUndefined();
    },
  );
  it('can include all-day and free events but always excludes declined events', () => {
    const config = settings({ ignoreAllDay: false, ignoreFree: false });
    expect(
      selectEvent([{ ...event, allDay: true, free: true }], config, now),
    ).toBeDefined();
    expect(
      selectEvent([{ ...event, declined: true }], config, now),
    ).toBeUndefined();
  });
  it('filters selected calendars and ignored events before choosing', () => {
    const other = { ...event, calendarId: 'other', start: now - 1 };
    expect(selectEvent([event, other], settings(), now)).toEqual(event);
    expect(
      selectEvent(
        [other],
        settings({ calendarIds: ['primary', 'other'] }),
        now,
      ),
    ).toEqual(other);
  });
});

describe('§8 overlap selection', () => {
  const later = { ...event, id: 'event-b', title: 'Other', start: now - 1 };
  it('chooses the latest starting event', () => {
    expect(selectEvent([event, later], settings(), now)).toEqual(later);
  });
  it('chooses the highest rule row, ranking unmatched events last', () => {
    expect(
      selectEvent(
        [later, event],
        settings({ overlap: 'ruleOrder', rules: [rule()] }),
        now,
      ),
    ).toEqual(event);
    expect(
      selectEvent(
        [later, event],
        settings({
          overlap: 'ruleOrder',
          rules: [rule(), rule({ keyword: 'Other' })],
        }),
        now,
      ),
    ).toEqual(event);
  });
  it('breaks rule ties by latest start and start ties by input order', () => {
    expect(
      selectEvent([event, later], settings({ overlap: 'ruleOrder' }), now),
    ).toEqual(later);
    expect(
      selectEvent([event, { ...later, start: event.start }], settings(), now),
    ).toEqual(event);
  });
});

describe('§8 manual status protection', () => {
  const manual = { text: 'Custom', emoji: ':pencil:', expiresAt: 0 };
  it('preserves a pre-existing manual status without ownership history', () => {
    expect(
      decide([event], settings(), { ...state, currentStatus: manual }, now)
        .status,
    ).toBeUndefined();
  });
  it.each(['text', 'emoji', 'expiresAt'] as const)(
    'detects a manually changed %s',
    (field) => {
      const previous = buildStatus(event, settings())!;
      const current = {
        ...previous,
        [field]: field === 'expiresAt' ? 0 : 'Changed',
      };
      expect(
        decide(
          [event],
          settings(),
          { ...state, lastAppliedStatus: previous, currentStatus: current },
          now,
        ).status,
      ).toBeUndefined();
    },
  );
  it('updates an owned status and permits an expired empty status', () => {
    const previous = {
      text: 'Previous',
      emoji: ':calendar:',
      expiresAt: now + 1,
    };
    expect(
      decide(
        [event],
        settings(),
        { ...state, lastAppliedStatus: previous, currentStatus: previous },
        now,
      ).status,
    ).toEqual(buildStatus(event, settings()));
    expect(
      decide(
        [event],
        settings(),
        { ...state, lastAppliedStatus: previous },
        now,
      ).status,
    ).toBeDefined();
  });
});

describe('§8 duplicate API suppression', () => {
  it('emits no API actions when status and notification content are unchanged', () => {
    const config = settings({ pauseNotifications: true });
    const first = decide([event], config, state, now);
    const second = decide(
      [event],
      config,
      {
        ...state,
        currentStatus: first.status!,
        lastAppliedStatus: first.status,
        lastAppliedNotification: first.notification,
      },
      now + 1,
    );
    expect(second).toEqual({ event });
  });
  it('includes expiration in equality and retries effects not recorded as applied', () => {
    const config = settings({ pauseNotifications: true });
    const first = decide([event], config, state, now);
    expect(decide([event], config, state, now)).toEqual(first);
    const extended = { ...event, end: event.end + 60_000 };
    expect(
      decide(
        [extended],
        config,
        {
          ...state,
          currentStatus: first.status!,
          lastAppliedStatus: first.status,
          lastAppliedNotification: first.notification,
        },
        now,
      ),
    ).toMatchObject({
      status: { expiresAt: extended.end },
      notification: { type: 'snooze', until: extended.end },
    });
  });
});

describe('§8 manual notification pause', () => {
  it.each([false, true])(
    'preserves until-manually-resumed mode when automatic pause is %s',
    (pauseNotifications) => {
      const result = decide(
        [event],
        settings({ pauseNotifications }),
        {
          ...state,
          manualPauseUntilResumed: true,
          lastAppliedNotification: { type: 'snooze', until: event.end },
        },
        now,
      );
      expect(result.notification).toBeUndefined();
      expect(result.status).toBeDefined();
    },
  );
  it('never resumes after an event has ended', () => {
    expect(
      decide([], settings(), { ...state, manualPauseUntilResumed: true }, now),
    ).toEqual({});
    expect(
      decide(
        [event],
        settings(),
        {
          ...state,
          lastAppliedNotification: { type: 'snooze', until: event.end },
        },
        event.end,
      ),
    ).toEqual({});
  });
  it('resumes only an active script-owned snooze for a non-pausing event', () => {
    expect(
      decide(
        [event],
        settings(),
        {
          ...state,
          lastAppliedNotification: { type: 'snooze', until: event.end },
        },
        now,
      ).notification,
    ).toEqual({ type: 'resume' });
    expect(
      decide([event], settings(), state, now).notification,
    ).toBeUndefined();
    expect(
      decide(
        [event],
        settings(),
        { ...state, lastAppliedNotification: { type: 'resume' } },
        now,
      ).notification,
    ).toBeUndefined();
  });
});

describe('§3-5 and §4 timing and automation', () => {
  it('does nothing with automation off or no current event', () => {
    expect(decide([event], settings({ automatic: false }), state, now)).toEqual(
      {},
    );
    expect(decide([], settings(), state, now)).toEqual({});
  });
  it('uses inclusive starts, exclusive ends and configurable margins', () => {
    expect(selectEvent([event], settings(), event.start)).toEqual(event);
    expect(selectEvent([event], settings(), event.start - 1)).toBeUndefined();
    expect(selectEvent([event], settings(), event.end)).toBeUndefined();
    const config = settings({ beforeMinutes: 5, afterMinutes: 5 });
    expect(selectEvent([event], config, event.start - 300_000)).toEqual(event);
    expect(selectEvent([event], config, event.end + 299_999)).toEqual(event);
    expect(selectEvent([event], config, event.end + 300_000)).toBeUndefined();
    expect(buildStatus(event, config)?.expiresAt).toBe(event.end + 300_000);
  });
  it('does not mutate events, settings or state', () => {
    const events = [event];
    const config = settings({ rules: [rule()] });
    const before = JSON.stringify({ events, config, state });
    decide(events, config, state, now);
    expect(JSON.stringify({ events, config, state })).toBe(before);
  });
});
