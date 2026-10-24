import { describe, it, expect } from 'vitest';
import {
  decodeSettings,
  sanitizeSettings,
  UserSettingsStore,
} from './settings';
import { defaultSettings } from '../core/decision';
describe('stored settings', () => {
  it.each(['{', 'null', '[]', '{"version":2,"settings":{"automatic":false}}'])(
    'falls back for %s',
    (json) =>
      expect(decodeSettings(json, 'primary')).toEqual(
        defaultSettings('primary'),
      ),
  );
  it('sanitizes wrong types, ranges and unknown fields', () => {
    const s = sanitizeSettings(
      {
        automatic: 'false',
        calendarIds: ['a', 7, 'a'],
        maxLength: 500,
        beforeMinutes: -4,
        afterMinutes: Infinity,
        ignoreFree: 0,
        rules: [null, { keyword: 'Focus', enabled: 'no', text: 5 }],
        overrides: [
          {},
          { calendarId: 'a', target: { seriesId: 's' }, ignore: true },
        ],
        secret: 'discard',
      },
      'primary',
    );
    expect(s).toMatchObject({
      automatic: true,
      calendarIds: ['a'],
      maxLength: 100,
      beforeMinutes: 0,
      afterMinutes: 0,
      ignoreFree: true,
      rules: [{ keyword: 'Focus', enabled: true }],
      overrides: [{ calendarId: 'a', target: { seriesId: 's' }, ignore: true }],
    });
    expect(s).not.toHaveProperty('secret');
    expect(s.rules[0]).not.toHaveProperty('text');
  });
  it('preserves valid settings and versioned round trips', () => {
    let json: string | null = null;
    const store = new UserSettingsStore(
      {
        getProperty: () => json,
        setProperty: (_key, value) => {
          json = value;
          return {} as GoogleAppsScript.Properties.Properties;
        },
      },
      'primary',
    );
    const s = { ...defaultSettings('primary', 'ja'), automatic: false };
    store.save(s);
    expect(JSON.parse(json!).version).toBe(1);
    expect(store.load()).toEqual(s);
  });
  it('clamps numeric boundaries and rejects numeric strings', () => {
    expect(
      sanitizeSettings(
        { maxLength: 0, beforeMinutes: 9999, afterMinutes: '5' },
        'p',
      ),
    ).toMatchObject({ maxLength: 100, beforeMinutes: 1440, afterMinutes: 0 });
  });
  it('loads legacy hidden fields using fixed defaults while preserving other preferences', () => {
    const legacy = {
      ...defaultSettings('primary'),
      displayMode: 'fixed',
      fixedText: 'Learning',
      prefix: 'Legacy prefix ',
      maxLength: 25,
      automatic: false,
      rules: [
        { keyword: 'Lesson', text: 'Learning', enabled: false, match: 'exact' },
      ],
    };
    const settings = decodeSettings(
      JSON.stringify({ version: 1, settings: legacy }),
      'primary',
    );
    expect(settings).toEqual({ ...legacy, prefix: '', maxLength: 100 });
    expect(legacy.prefix).toBe('Legacy prefix ');
  });
  it.each([
    { prefix: { invalid: true }, maxLength: 'invalid' },
    { prefix: 42, maxLength: -1 },
    { prefix: null, maxLength: Number.NaN },
    {},
  ])('always normalizes removed UI fields: %j', (fields) => {
    expect(sanitizeSettings(fields, 'primary')).toMatchObject({
      prefix: '',
      maxLength: 100,
    });
  });
});
