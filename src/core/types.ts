// All timestamps are Unix milliseconds. Adapters convert service-specific units.
export type Locale = 'en' | 'ja';

export interface CalendarEvent {
  readonly id: string;
  readonly calendarId: string;
  readonly seriesId?: string;
  readonly title: string;
  readonly start: number;
  readonly end: number;
  readonly allDay: boolean;
  readonly free: boolean;
  readonly declined: boolean;
}

export interface EventOptions {
  readonly text?: string;
  readonly emoji?: string;
  readonly pauseNotifications?: boolean;
  readonly ignore?: boolean;
}

export interface Rule extends EventOptions {
  readonly keyword: string;
  readonly match: 'contains' | 'exact';
  readonly enabled: boolean;
}

export interface EventOverride extends EventOptions {
  readonly calendarId: string;
  readonly target: { readonly eventId: string } | { readonly seriesId: string };
}

export interface Settings {
  readonly locale: Locale;
  readonly automatic: boolean;
  readonly calendarIds: readonly string[];
  readonly displayMode: 'title' | 'fixed' | 'none';
  readonly fixedText: string;
  readonly emoji: string;
  readonly prefix: string;
  readonly maxLength: number;
  readonly pauseNotifications: boolean;
  readonly ignoreAllDay: boolean;
  readonly ignoreFree: boolean;
  readonly overlap: 'latestStart' | 'ruleOrder';
  readonly beforeMinutes: number;
  readonly afterMinutes: number;
  readonly rules: readonly Rule[];
  readonly overrides: readonly EventOverride[];
}

export interface Status {
  readonly text: string;
  readonly emoji: string;
  readonly expiresAt: number;
}

export type NotificationAction =
  | { readonly type: 'snooze'; readonly until: number }
  | { readonly type: 'resume' };

export interface AutomationState {
  readonly currentStatus: Status;
  // Adapters persist these only after successful API calls, never on dry runs.
  readonly lastAppliedStatus?: Status;
  readonly lastAppliedNotification?: NotificationAction;
  readonly manualPauseUntilResumed: boolean;
}

export interface Decision {
  readonly event?: CalendarEvent;
  readonly status?: Status;
  readonly notification?: NotificationAction;
}

// Ports for future adapters; the core never invokes them.
export interface CalendarReader {
  // Return a unique id for each occurrence and a shared seriesId for recurrence.
  readEvents(
    calendarIds: readonly string[],
    from: number,
    to: number,
  ): readonly CalendarEvent[];
}

export interface SettingsStore {
  load(): Settings;
  save(settings: Settings): void;
}

export interface AutomationStateStore {
  load(): AutomationState;
  save(state: AutomationState): void;
}

export interface SlackClient {
  readStatus(): Status;
  setStatus(status: Status): void;
  setNotifications(action: NotificationAction): void;
}
