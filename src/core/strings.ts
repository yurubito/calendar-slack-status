import type { Locale } from './types';

export const strings = {
  en: { fixedStatus: 'Busy', defaultEmoji: ':calendar:' },
  ja: { fixedStatus: '予定あり', defaultEmoji: ':calendar:' },
} as const satisfies Record<
  Locale,
  { fixedStatus: string; defaultEmoji: string }
>;
