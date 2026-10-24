import { it, expect } from 'vitest';
import { reorder, mergeOverride, settleNotification } from './logic';
it('reorders without mutating and guards boundaries', () => {
  const rows = ['a', 'b', 'c'];
  expect(reorder(rows, 1, -1)).toEqual(['b', 'a', 'c']);
  expect(rows).toEqual(['a', 'b', 'c']);
  expect(reorder(rows, 0, -1)).toEqual(rows);
  expect(reorder(rows, 2, 1)).toEqual(rows);
});
it('resets a requested pause when the Phase 3 stub is unconnected or malformed', () => {
  for (const result of [
    { connected: false },
    null,
    undefined,
    {},
    { connected: 'true' },
  ]) {
    expect(settleNotification(true, result)).toEqual({
      paused: false,
      failed: true,
    });
    expect(settleNotification(false, result)).toEqual({
      paused: false,
      failed: true,
    });
  }
  expect(settleNotification(true, { connected: true })).toEqual({
    paused: true,
    failed: false,
  });
  expect(settleNotification(false, { connected: true })).toEqual({
    paused: false,
    failed: false,
  });
});
it('replaces matching overrides while preserving other calendars and scopes', () => {
  const a = { calendarId: 'a', target: { eventId: 'e' }, text: 'old' },
    b = { calendarId: 'b', target: { eventId: 'e' } },
    c = { calendarId: 'a', target: { seriesId: 's' } };
  expect(mergeOverride([a, b, c], { ...a, text: 'new' })).toEqual([
    b,
    c,
    { ...a, text: 'new' },
  ]);
});
