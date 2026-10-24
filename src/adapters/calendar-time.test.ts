import { describe, expect, it } from 'vitest';
import { calendarTimeZone, upcomingWindow } from './calendar-time';
import { AppsCalendarReader } from './calendar';

describe('calendar-zone boundaries', () => {
  it.each([
    [
      'Asia/Tokyo',
      '2026-10-25T02:00:00Z',
      '2026-10-24T15:00:00Z',
      '2026-11-01T15:00:00Z',
    ],
    [
      'Asia/Kolkata',
      '2026-10-24T21:00:00Z',
      '2026-10-24T18:30:00Z',
      '2026-11-01T18:30:00Z',
    ],
    [
      'America/New_York',
      '2026-03-07T12:00:00Z',
      '2026-03-07T05:00:00Z',
      '2026-03-15T04:00:00Z',
    ],
    [
      'America/New_York',
      '2026-10-31T12:00:00Z',
      '2026-10-31T04:00:00Z',
      '2026-11-08T05:00:00Z',
    ],
    [
      'America/New_York',
      '2026-11-01T06:30:00Z',
      '2026-11-01T04:00:00Z',
      '2026-11-09T05:00:00Z',
    ],
    [
      'Asia/Tokyo',
      '2026-12-31T17:00:00Z',
      '2026-12-31T15:00:00Z',
      '2027-01-08T15:00:00Z',
    ],
  ])(
    '%s at %s uses local midnight and an exclusive day +8 boundary',
    (zone, now, from, to) => {
      expect(upcomingWindow(Date.parse(now), zone)).toEqual({
        from: Date.parse(from),
        to: Date.parse(to),
      });
    },
  );
  it('includes midnight and excludes the next boundary regardless of the host zone', () => {
    const now = Date.parse('2026-10-24T18:30:00Z');
    const range = upcomingWindow(now, 'Asia/Kolkata');
    expect(range.from).toBe(now);
    expect(range.to - range.from).toBe(8 * 86400000);
  });
  it('falls back for missing, invalid or unavailable calendar zones', () => {
    expect(calendarTimeZone(() => 'Asia/Kolkata', 'Etc/UTC')).toBe(
      'Asia/Kolkata',
    );
    for (const zone of ['', 'invalid-zone'])
      expect(calendarTimeZone(() => zone, 'Asia/Tokyo')).toBe('Asia/Tokyo');
    expect(
      calendarTimeZone(() => {
        throw new Error('unavailable');
      }, 'Asia/Tokyo'),
    ).toBe('Asia/Tokyo');
  });
  it('returns the calendar zone and passes its window to CalendarApp-like objects', () => {
    let range: number[] = [];
    const reader = new AppsCalendarReader({
      getDefaultCalendar: () => ({ getTimeZone: () => 'Asia/Kolkata' }),
      getCalendarById: () => ({
        getEvents: (from, to) => {
          range = [from.getTime(), to.getTime()];
          return [];
        },
      }),
    });
    expect(
      reader.readUpcoming(
        ['sample'],
        Date.parse('2026-10-25T12:00:00Z'),
        'Etc/UTC',
      ),
    ).toEqual({ timeZone: 'Asia/Kolkata', events: [] });
    expect(range).toEqual([
      Date.parse('2026-10-24T18:30:00Z'),
      Date.parse('2026-11-01T18:30:00Z'),
    ]);
  });
});
