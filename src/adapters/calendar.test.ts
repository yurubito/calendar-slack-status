import { it, expect } from 'vitest';
import { AppsCalendarReader, mapCalendarEvent } from './calendar';
const stub = (start: number, recurring = true) => ({
  getId: () => 'series',
  getTitle: () => 'Lesson',
  getStartTime: () => new Date(start),
  getEndTime: () => new Date(start + 1000),
  isAllDayEvent: () => true,
  isRecurringEvent: () => recurring,
  getTransparency: () => 'TRANSPARENT',
  getMyStatus: () => 'NO',
});
it('maps occurrence identity, shared series and flags without Google globals', () => {
  const a = mapCalendarEvent(stub(1), 'c'),
    b = mapCalendarEvent(stub(2), 'c');
  expect(a.id).not.toBe(b.id);
  expect(a.seriesId).toBe(b.seriesId);
  expect(a).toMatchObject({
    calendarId: 'c',
    start: 1,
    end: 1001,
    allDay: true,
    free: true,
    declined: true,
  });
  expect(mapCalendarEvent(stub(1, false), 'c')).not.toHaveProperty('seriesId');
});
it('reads only requested calendars and passes the time window', () => {
  const ranges: Date[][] = [];
  const reader = new AppsCalendarReader({
    getCalendarById: () => ({
      getEvents: (a, b) => {
        ranges.push([a, b]);
        return [stub(3)];
      },
    }),
  });
  expect(reader.readEvents(['c'], 1, 9)).toHaveLength(1);
  expect(ranges[0].map((d) => d.getTime())).toEqual([1, 9]);
});
