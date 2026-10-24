import { decide } from './core/decision';
import type { CalendarReader, SettingsStore, SlackClient } from './core/types';
import type { StateStore, RunState } from './adapters/state';
import { SlackError } from './adapters/slack';
export interface TickPorts {
  calendar: CalendarReader;
  settings: SettingsStore;
  state: StateStore;
  slack: SlackClient;
  now(): number;
  log(message: string): void;
  lock: { tryLock(ms: number): boolean; releaseLock(): void };
  mail(): void;
  removeTrigger(): void;
  dryRun: boolean;
}
export function runTick(p: TickPorts): string {
  if (!p.lock.tryLock(0)) return 'locked';
  let s: RunState = p.state.load();
  const now = p.now();
  const email = () => {
    const day = new Date(now).toISOString().slice(0, 10);
    if (s.lastEmailDate !== day) {
      s = { ...s, lastEmailDate: day };
      p.state.save(s);
      try {
        p.mail();
        p.log('reconnect_email');
      } catch {
        p.log('email_failed');
      }
    }
  };
  const finish = (result: string) => {
    s = { ...s, lastRun: now, lastResult: result };
    p.state.save(s);
    return result;
  };
  try {
    if (s.connection === 'needs_reconnect') {
      p.removeTrigger();
      email();
      return 'needs_reconnect';
    }
    if (s.connection !== 'connected') return 'not_connected';
    const settings = p.settings.load();
    if (!settings.automatic) return finish('nothing');
    const currentStatus = p.slack.readStatus();
    const events = p.calendar.readEvents(
      settings.calendarIds,
      now - settings.afterMinutes * 60000,
      now + settings.beforeMinutes * 60000 + 1,
    );
    const d = {
      ...decide(
        events,
        settings,
        {
          ...s,
          currentStatus,
          manualPauseUntilResumed: s.manualPauseUntilResumed ?? false,
        },
        now,
      ),
    };
    if (d.status) {
      d.status = {
        ...d.status,
        expiresAt: Math.floor(d.status.expiresAt / 1000) * 1000,
      };
      if (
        d.status.text === currentStatus.text &&
        d.status.emoji === currentStatus.emoji &&
        d.status.expiresAt === currentStatus.expiresAt
      )
        delete d.status;
    }
    if (p.dryRun) {
      if (d.status)
        p.log(
          JSON.stringify({
            method: 'users.profile.set',
            profile: JSON.stringify({
              status_text: d.status.text,
              status_emoji: d.status.emoji,
              status_expiration: Math.floor(d.status.expiresAt / 1000),
            }),
          }),
        );
      if (d.notification)
        p.log(
          JSON.stringify(
            d.notification.type === 'resume'
              ? { method: 'dnd.endSnooze' }
              : {
                  method: 'dnd.setSnooze',
                  num_minutes: Math.max(
                    1,
                    Math.ceil((d.notification.until - now) / 60000),
                  ),
                },
          ),
        );
      return finish('dry_run');
    }
    if (d.status) {
      const status = {
        ...d.status,
        expiresAt: Math.floor(d.status.expiresAt / 1000) * 1000,
      };
      p.slack.setStatus(status);
      s = { ...s, lastAppliedStatus: status };
      p.state.save(s);
    }
    if (d.notification) {
      p.slack.setNotifications(d.notification);
      s = { ...s, lastAppliedNotification: d.notification };
      p.state.save(s);
    }
    p.log(JSON.stringify({ eventId: d.event?.id, count: events.length }));
    return finish(d.status || d.notification ? 'applied' : 'nothing');
  } catch (error) {
    const e = error instanceof SlackError ? error : new SlackError('internal');
    p.log(`error:${e.code}`);
    if (e.kind === 'auth') {
      s = { ...s, connection: 'needs_reconnect' };
      p.state.save(s);
      p.removeTrigger();
      email();
    }
    return finish(`error:${e.code}`);
  } finally {
    if (p.now() - now >= 240000) p.log('runtime_near_limit');
    p.lock.releaseLock();
  }
}
