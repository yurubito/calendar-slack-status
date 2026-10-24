import { it, expect } from 'vitest';
import { reorder, mergeOverride } from './logic';
it('reorders without mutating and guards boundaries', () => {
  const rows = ['a', 'b', 'c'];
  expect(reorder(rows, 1, -1)).toEqual(['b', 'a', 'c']);
  expect(rows).toEqual(['a', 'b', 'c']);
  expect(reorder(rows, 0, -1)).toEqual(rows);
  expect(reorder(rows, 2, 1)).toEqual(rows);
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
