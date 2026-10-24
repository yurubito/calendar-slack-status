import { AppsCalendarReader } from './adapters/calendar';
import { sanitizeSettings, UserSettingsStore } from './adapters/settings';
function store(locale?: string) {
  return new UserSettingsStore(
    PropertiesService.getUserProperties(),
    CalendarApp.getDefaultCalendar().getId(),
    locale === 'ja' ? 'ja' : 'en',
  );
}
export function doGet() {
  return HtmlService.createHtmlOutputFromFile('Index')
    .setTitle('Calendar Slack Status')
    .addMetaTag('viewport', 'width=device-width, initial-scale=1');
}
export function getSettings(locale?: string) {
  return {
    settings: store(locale).load(),
    calendars: CalendarApp.getAllCalendars().map((c) => ({
      id: c.getId(),
      name: c.getName(),
    })),
  };
}
export function saveSettings(value: unknown) {
  const s = sanitizeSettings(value, CalendarApp.getDefaultCalendar().getId());
  store().save(s);
  return s;
}
export function listUpcomingEvents() {
  return new AppsCalendarReader(CalendarApp).readUpcoming(
    store().load().calendarIds,
    Date.now(),
    Session.getScriptTimeZone(),
  );
}
