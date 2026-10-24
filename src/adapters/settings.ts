import { defaultSettings } from '../core/decision';
import type { EventOptions, Settings, SettingsStore } from '../core/types';
const record = (v: unknown): Record<string, unknown> =>
  v !== null && typeof v === 'object' && !Array.isArray(v)
    ? (v as Record<string, unknown>)
    : {};
const str = (v: unknown, fallback = '') =>
  typeof v === 'string' ? v.slice(0, 2000) : fallback;
const bool = (v: unknown, fallback: boolean) =>
  typeof v === 'boolean' ? v : fallback;
const num = (v: unknown, fallback: number, min: number, max: number) =>
  typeof v === 'number' && Number.isFinite(v)
    ? Math.max(min, Math.min(max, Math.floor(v)))
    : fallback;
export function options(v: unknown): EventOptions {
  const r = record(v);
  return {
    ...(typeof r.text === 'string' ? { text: str(r.text) } : {}),
    ...(typeof r.emoji === 'string' ? { emoji: str(r.emoji) } : {}),
    ...(typeof r.pauseNotifications === 'boolean'
      ? { pauseNotifications: r.pauseNotifications }
      : {}),
    ...(typeof r.ignore === 'boolean' ? { ignore: r.ignore } : {}),
  };
}
export function sanitizeSettings(
  value: unknown,
  primary: string,
  locale: 'en' | 'ja' = 'en',
): Settings {
  const r = record(value),
    d = defaultSettings(primary, locale);
  return {
    locale: r.locale === 'ja' || r.locale === 'en' ? r.locale : d.locale,
    automatic: bool(r.automatic, d.automatic),
    calendarIds: Array.isArray(r.calendarIds)
      ? [
          ...new Set(
            r.calendarIds.filter(
              (v): v is string =>
                typeof v === 'string' && v.length > 0 && v.length <= 2000,
            ),
          ),
        ]
      : d.calendarIds,
    displayMode:
      r.displayMode === 'fixed' || r.displayMode === 'none'
        ? r.displayMode
        : 'title',
    fixedText: str(r.fixedText, d.fixedText),
    emoji: str(r.emoji, d.emoji),
    prefix: str(r.prefix),
    maxLength: num(r.maxLength, 100, 1, 100),
    pauseNotifications: bool(r.pauseNotifications, false),
    ignoreAllDay: bool(r.ignoreAllDay, true),
    ignoreFree: bool(r.ignoreFree, true),
    overlap: r.overlap === 'ruleOrder' ? 'ruleOrder' : 'latestStart',
    beforeMinutes: num(r.beforeMinutes, 0, 0, 1440),
    afterMinutes: num(r.afterMinutes, 0, 0, 1440),
    rules: Array.isArray(r.rules)
      ? r.rules
          .filter((v) => typeof record(v).keyword === 'string')
          .map((v) => {
            const x = record(v);
            return {
              ...options(x),
              keyword: str(x.keyword),
              match:
                x.match === 'exact'
                  ? ('exact' as const)
                  : ('contains' as const),
              enabled: bool(x.enabled, true),
            };
          })
      : [],
    overrides: Array.isArray(r.overrides)
      ? r.overrides.flatMap((v) => {
          const x = record(v),
            t = record(x.target);
          if (
            typeof x.calendarId !== 'string' ||
            !(typeof t.eventId === 'string' || typeof t.seriesId === 'string')
          )
            return [];
          return [
            {
              ...options(x),
              calendarId: str(x.calendarId),
              target:
                typeof t.eventId === 'string'
                  ? { eventId: str(t.eventId) }
                  : { seriesId: str(t.seriesId) },
            },
          ];
        })
      : [],
  };
}
export function decodeSettings(
  json: string | null,
  primary: string,
  locale: 'en' | 'ja' = 'en',
): Settings {
  try {
    const envelope = record(JSON.parse(json ?? 'null'));
    return envelope.version === 1
      ? sanitizeSettings(envelope.settings, primary, locale)
      : defaultSettings(primary, locale);
  } catch {
    return defaultSettings(primary, locale);
  }
}
export class UserSettingsStore implements SettingsStore {
  constructor(
    private properties: Pick<
      GoogleAppsScript.Properties.Properties,
      'getProperty' | 'setProperty'
    >,
    private primary: string,
    private locale: 'en' | 'ja' = 'en',
  ) {}
  load() {
    return decodeSettings(
      this.properties.getProperty('settings'),
      this.primary,
      this.locale,
    );
  }
  save(settings: Settings) {
    this.properties.setProperty(
      'settings',
      JSON.stringify({
        version: 1,
        settings: sanitizeSettings(settings, this.primary, this.locale),
      }),
    );
  }
}
