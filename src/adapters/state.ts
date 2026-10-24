import type { Status, NotificationAction } from '../core/types';
export type Properties = Pick<
  GoogleAppsScript.Properties.Properties,
  'getProperty' | 'setProperty' | 'deleteProperty'
>;
export interface RunState {
  manualPauseUntilResumed?: boolean;
  connection?: 'connected' | 'needs_reconnect';
  lastAppliedStatus?: Status;
  lastAppliedNotification?: NotificationAction;
  lastRun?: number;
  lastResult?: string;
  lastEmailDate?: string;
}
export interface StateStore {
  load(): RunState;
  save(s: RunState): void;
}
export class UserStateStore implements StateStore {
  constructor(private p: Properties) {}
  load(): RunState {
    try {
      const e = JSON.parse(this.p.getProperty('automation') ?? 'null');
      if (e?.version !== 1 || !e.state || typeof e.state !== 'object')
        return {};
      const s = e.state;
      const out: RunState = {};
      if (typeof s.manualPauseUntilResumed === 'boolean')
        out.manualPauseUntilResumed = s.manualPauseUntilResumed;
      if (['connected', 'needs_reconnect'].includes(s.connection))
        out.connection = s.connection;
      const status = s.lastAppliedStatus;
      if (
        status &&
        typeof status.text === 'string' &&
        typeof status.emoji === 'string' &&
        Number.isFinite(status.expiresAt) &&
        status.expiresAt >= 0 &&
        Array.from(status.text).length <= 100
      )
        out.lastAppliedStatus = {
          text: status.text,
          emoji: status.emoji,
          expiresAt: status.expiresAt,
        };
      const n = s.lastAppliedNotification;
      if (
        n?.type === 'resume' ||
        (n?.type === 'snooze' && Number.isFinite(n.until) && n.until >= 0)
      )
        out.lastAppliedNotification =
          n.type === 'resume'
            ? { type: 'resume' }
            : { type: 'snooze', until: n.until };
      if (Number.isFinite(s.lastRun)) out.lastRun = s.lastRun;
      if (
        typeof s.lastResult === 'string' &&
        /^(applied|nothing|dry_run|error:[a-z_]+)$/.test(s.lastResult)
      )
        out.lastResult = s.lastResult;
      if (
        typeof s.lastEmailDate === 'string' &&
        /^\d{4}-\d{2}-\d{2}$/.test(s.lastEmailDate)
      )
        out.lastEmailDate = s.lastEmailDate;
      return out;
    } catch {
      return {};
    }
  }
  save(state: RunState) {
    this.p.setProperty('automation', JSON.stringify({ version: 1, state }));
  }
}
