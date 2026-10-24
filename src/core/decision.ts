import { strings } from './strings';
import type {
  AutomationState,
  CalendarEvent,
  Decision,
  EventOptions,
  Rule,
  Settings,
  Status,
  Locale,
} from './types';

export function defaultSettings(
  primaryCalendarId: string,
  locale: Locale = 'en',
): Settings {
  return {
    locale,
    automatic: true,
    calendarIds: [primaryCalendarId],
    displayMode: 'title',
    fixedText: strings[locale].fixedStatus,
    emoji: strings[locale].defaultEmoji,
    prefix: '',
    maxLength: 100,
    pauseNotifications: false,
    ignoreAllDay: true,
    ignoreFree: true,
    overlap: 'latestStart',
    beforeMinutes: 0,
    afterMinutes: 0,
    rules: [],
    overrides: [],
  };
}

export function matchRule(title: string, rules: readonly Rule[]): number {
  return rules.findIndex(
    (rule) =>
      rule.enabled &&
      (rule.match === 'exact'
        ? title === rule.keyword
        : title.includes(rule.keyword)),
  );
}

export function resolveOptions(
  event: CalendarEvent,
  settings: Settings,
): EventOptions {
  const ruleIndex = matchRule(event.title, settings.rules);
  const overrides = settings.overrides.filter(
    (o) => o.calendarId === event.calendarId,
  );
  const occurrence = overrides.find(
    (o) => 'eventId' in o.target && o.target.eventId === event.id,
  );
  const series = overrides.find(
    (o) => 'seriesId' in o.target && o.target.seriesId === event.seriesId,
  );
  // Missing override fields inherit from the next priority level.
  return { ...settings.rules[ruleIndex], ...series, ...occurrence };
}

export function selectEvent(
  events: readonly CalendarEvent[],
  settings: Settings,
  now: number,
): CalendarEvent | undefined {
  const candidates = events.filter(
    (event) =>
      settings.calendarIds.includes(event.calendarId) &&
      !event.declined &&
      !(settings.ignoreAllDay && event.allDay) &&
      !(settings.ignoreFree && event.free) &&
      event.end > event.start &&
      event.start - settings.beforeMinutes * 60000 <= now &&
      now < event.end + settings.afterMinutes * 60000 &&
      !resolveOptions(event, settings).ignore,
  );
  return candidates.sort((a, b) => {
    if (settings.overlap === 'ruleOrder') {
      const rank = (event: CalendarEvent) => {
        const index = matchRule(event.title, settings.rules);
        return index < 0 ? Infinity : index;
      };
      const order = rank(a) - rank(b);
      if (order && !Number.isNaN(order)) return order;
    }
    // Stable sorting preserves input order when start times are identical.
    return b.start - a.start;
  })[0];
}

export function buildStatus(
  event: CalendarEvent,
  settings: Settings,
): Status | undefined {
  const options = resolveOptions(event, settings);
  if (options.text === undefined && settings.displayMode === 'none')
    return undefined;
  const text =
    options.text === undefined
      ? settings.displayMode === 'fixed'
        ? settings.fixedText
        : event.title
      : options.text === ''
        ? event.title
        : options.text.split('{title}').join(event.title);
  const limit = Math.max(0, Math.min(100, Math.floor(settings.maxLength)));
  return {
    text: Array.from(settings.prefix + text)
      .slice(0, limit)
      .join(''),
    emoji:
      options.emoji || settings.emoji || strings[settings.locale].defaultEmoji,
    // Treat trailing padding as part of the effective event window.
    expiresAt: event.end + settings.afterMinutes * 60000,
  };
}

function equalStatus(a: Status, b: Status): boolean {
  return (
    a.text === b.text && a.emoji === b.emoji && a.expiresAt === b.expiresAt
  );
}

export function decide(
  events: readonly CalendarEvent[],
  settings: Settings,
  state: AutomationState,
  now: number,
): Decision {
  if (!settings.automatic) return {};
  const event = selectEvent(events, settings, now);
  if (!event) return {};
  const decision: {
    event: CalendarEvent;
    status?: Status;
    notification?: Decision['notification'];
  } = { event };
  const desired = buildStatus(event, settings);
  const current = state.currentStatus;
  const empty = current.text === '' && current.emoji === '';
  const owned =
    state.lastAppliedStatus !== undefined &&
    equalStatus(current, state.lastAppliedStatus);
  if (desired && (empty || owned) && !equalStatus(desired, current))
    decision.status = desired;

  if (!state.manualPauseUntilResumed) {
    const pause =
      resolveOptions(event, settings).pauseNotifications ??
      settings.pauseNotifications;
    const previous = state.lastAppliedNotification;
    const until = event.end + settings.afterMinutes * 60000;
    if (pause && !(previous?.type === 'snooze' && previous.until === until)) {
      decision.notification = { type: 'snooze', until };
    } else if (!pause && previous?.type === 'snooze' && previous.until > now) {
      decision.notification = { type: 'resume' };
    }
  }
  return decision;
}
