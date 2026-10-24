import { defaultSettings } from '../core/decision';
import { sanitizeSettings } from '../adapters/settings';
import type { Settings } from '../core/types';
import { upcomingWindow } from '../adapters/calendar-time';
const timeZone = 'Asia/Tokyo';
let settings: Settings = defaultSettings('sample');
let initialized = false;
const methods: Record<string, (...args: unknown[]) => unknown> = {
  getSettings(locale) {
    if (!initialized) {
      settings = {
        ...defaultSettings('sample', locale === 'ja' ? 'ja' : 'en'),
        rules: [
          {
            keyword: 'Lesson',
            match: 'contains',
            enabled: true,
            text: 'Learning',
            pauseNotifications: true,
          },
          {
            keyword: 'Focus',
            match: 'contains',
            enabled: true,
            text: '{title}',
          },
        ],
      };
      initialized = true;
    }
    return { settings, calendars: [{ id: 'sample', name: 'Sample calendar' }] };
  },
  saveSettings(value) {
    settings = sanitizeSettings(value, 'sample');
    return settings;
  },
  listUpcomingEvents() {
    const { from } = upcomingWindow(Date.now(), timeZone);
    const events = settings.calendarIds.includes('sample')
      ? ['Team sync', 'Lesson', 'Focus time'].map((title, i) => {
          const start = from + (9 + i * 2) * 3600000;
          return {
            id: `sample-${i}`,
            calendarId: 'sample',
            ...(i === 1 ? { seriesId: 'sample-series' } : {}),
            title,
            start,
            end: start + 3600000,
            allDay: false,
            free: false,
            declined: false,
          };
        })
      : [];
    return { events, timeZone };
  },
  notificationAction() {
    return { connected: false };
  },
};
function runner(
  success: (value: unknown) => void = () => {},
  failure: (error: unknown) => void = () => {},
): unknown {
  return new Proxy(
    {},
    {
      get(_, key) {
        if (key === 'withSuccessHandler')
          return (fn: typeof success) => runner(fn, failure);
        if (key === 'withFailureHandler')
          return (fn: typeof failure) => runner(success, fn);
        return (...args: unknown[]) =>
          queueMicrotask(() => {
            try {
              success(structuredClone(methods[String(key)](...args)));
            } catch (e) {
              failure(e);
            }
          });
      },
    },
  );
}
Object.assign(globalThis, { google: { script: { run: runner() } } });
