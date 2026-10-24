import { AppsCalendarReader } from './adapters/calendar';
import { sanitizeSettings, UserSettingsStore } from './adapters/settings';
import { OAuth, appsCrypto } from './adapters/oauth';
import { appsFetch, SlackAdapter } from './adapters/slack';
import { UserStateStore } from './adapters/state';
import { Triggers } from './adapters/triggers';
import { runTick } from './tick';
import { messages } from './ui/strings';
function oauth() {
  return new OAuth(
    PropertiesService.getScriptProperties(),
    PropertiesService.getUserProperties(),
    new UserStateStore(PropertiesService.getUserProperties()),
    appsFetch,
    appsCrypto,
    Date.now,
    Session.getTemporaryActiveUserKey(),
    ScriptApp.getService().getUrl(),
    new Triggers(ScriptApp),
  );
}
export function getAuthUrl() {
  const userLock = LockService.getUserLock();
  userLock.waitLock(10000);
  const lock = LockService.getScriptLock();
  try {
    lock.waitLock(10000);
    try {
      return oauth().getAuthUrl();
    } finally {
      lock.releaseLock();
    }
  } finally {
    userLock.releaseLock();
  }
}
export function getConnection() {
  const s = new UserStateStore(PropertiesService.getUserProperties()).load();
  return {
    connection: s.connection ?? 'not_connected',
    team: PropertiesService.getUserProperties().getProperty('slack_team') ?? '',
    lastRun: s.lastRun,
    lastResult: s.lastResult,
  };
}
export function disconnect() {
  const lock = LockService.getUserLock();
  lock.waitLock(10000);
  try {
    oauth().disconnect();
    return getConnection();
  } finally {
    lock.releaseLock();
  }
}
export function tick() {
  const user = PropertiesService.getUserProperties();
  return runTick({
    calendar: new AppsCalendarReader(CalendarApp),
    settings: store(),
    state: new UserStateStore(user),
    slack: new SlackAdapter(
      appsFetch,
      user.getProperty('slack_token') ?? '',
      Date.now,
    ),
    now: Date.now,
    log: (message) => console.log(message),
    lock: LockService.getUserLock(),
    mail: () =>
      MailApp.sendEmail(
        CalendarApp.getDefaultCalendar().getId(),
        messages.en.reconnect,
        messages.en.reconnectMail + '\n\n' + messages.ja.reconnectMail,
      ),
    removeTrigger: () => new Triggers(ScriptApp).remove(),
    dryRun:
      PropertiesService.getScriptProperties().getProperty('DRY_RUN') === 'true',
  });
}
export function checkNow() {
  tick();
  return getConnection();
}
function store(locale?: string) {
  return new UserSettingsStore(
    PropertiesService.getUserProperties(),
    CalendarApp.getDefaultCalendar().getId(),
    locale === 'ja' ? 'ja' : 'en',
  );
}
export function doGet(e?: GoogleAppsScript.Events.DoGet) {
  if (e && ['code', 'state', 'error'].some((k) => k in e.parameter)) {
    let success = false;
    const lock = LockService.getUserLock();
    lock.waitLock(10000);
    try {
      oauth().callback(e.parameter);
      success = true;
    } catch {
      /* Only fixed text is exposed to the browser. */
    } finally {
      lock.releaseLock();
    }
    const escape = (v: string) =>
      v.replace(
        /[&<>"']/g,
        (c) =>
          ({
            '&': '&amp;',
            '<': '&lt;',
            '>': '&gt;',
            '"': '&quot;',
            "'": '&#39;',
          })[c]!,
      );
    return HtmlService.createHtmlOutput(
      `<meta name="viewport" content="width=device-width,initial-scale=1"><p>${messages.en[success ? 'oauthSuccess' : 'oauthError']}</p><p lang="ja">${messages.ja[success ? 'oauthSuccess' : 'oauthError']}</p><a target="_top" href="${escape(ScriptApp.getService().getUrl())}">${messages.en.backToApp} / ${messages.ja.backToApp}</a>`,
    );
  }
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
