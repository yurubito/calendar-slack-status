import type { CalendarEvent, CalendarReader } from '../core/types';
export interface CalendarEventLike {
  getId(): string;
  getTitle(): string;
  getStartTime(): { getTime(): number };
  getEndTime(): { getTime(): number };
  isAllDayEvent(): boolean;
  isRecurringEvent(): boolean;
  getTransparency(): unknown;
  getMyStatus(): unknown;
}
export function mapCalendarEvent(
  event: CalendarEventLike,
  calendarId: string,
): CalendarEvent {
  const start = event.getStartTime().getTime(),
    series = event.getId();
  return {
    id: JSON.stringify([series, start]),
    calendarId,
    ...(event.isRecurringEvent() ? { seriesId: series } : {}),
    title: event.getTitle(),
    start,
    end: event.getEndTime().getTime(),
    allDay: event.isAllDayEvent(),
    free: String(event.getTransparency()) === 'TRANSPARENT',
    declined: String(event.getMyStatus()) === 'NO',
  };
}
export interface CalendarServiceLike {
  getCalendarById(
    id: string,
  ): { getEvents(from: Date, to: Date): CalendarEventLike[] } | null;
}
export class AppsCalendarReader implements CalendarReader {
  constructor(private service: CalendarServiceLike) {}
  readEvents(ids: readonly string[], from: number, to: number) {
    return ids
      .flatMap((id) => {
        const calendar = this.service.getCalendarById(id);
        if (!calendar) throw new Error('Calendar unavailable');
        return calendar
          .getEvents(new Date(from), new Date(to))
          .map((e) => mapCalendarEvent(e, id));
      })
      .sort((a, b) => a.start - b.start);
  }
}
