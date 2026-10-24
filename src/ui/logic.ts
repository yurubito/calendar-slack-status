import type { EventOverride, Locale, Rule } from '../core/types';
import { messages } from './strings';

export function truncateSummary(text: string, limit: number): string {
  const points = Array.from(text);
  const size = Math.max(1, Math.floor(limit));
  return points.length <= size
    ? text
    : points.slice(0, size - 1).join('') + '…';
}

export function ruleSummary(rule: Rule, locale: Locale, limit = 100) {
  const copy = messages[locale];
  const fullText = `${rule.keyword || copy.noKeyword}${rule.match === 'exact' ? ` (${copy.exact})` : ''} → ${rule.text || copy.eventTitle}${rule.emoji ? ` ${rule.emoji}` : ''}`;
  return {
    text: truncateSummary(fullText, limit),
    fullText,
    badges: [
      ...(!rule.enabled ? [copy.disabled] : []),
      ...(rule.pauseNotifications ? [copy.pauseNotifications] : []),
      ...(rule.ignore ? [copy.ignore] : []),
    ],
  };
}

export interface RuleCards {
  readonly nextId: number;
  readonly cards: readonly { readonly id: number; readonly open: boolean }[];
}
export type CardAction =
  | { type: 'load'; count: number }
  | { type: 'add' }
  | { type: 'move'; index: number; delta: number }
  | { type: 'delete'; index: number }
  | { type: 'toggle'; id: number; open: boolean }
  | { type: 'all'; open: boolean };

export function updateCards(state: RuleCards, action: CardAction): RuleCards {
  switch (action.type) {
    case 'load':
      return {
        nextId: state.nextId + action.count,
        cards: Array.from({ length: action.count }, (_, i) => ({
          id: state.nextId + i,
          open: false,
        })),
      };
    case 'add':
      return {
        nextId: state.nextId + 1,
        cards: [...state.cards, { id: state.nextId, open: true }],
      };
    case 'move':
      return {
        ...state,
        cards: reorder(state.cards, action.index, action.delta),
      };
    case 'delete':
      return {
        ...state,
        cards: state.cards.filter((_, i) => i !== action.index),
      };
    case 'toggle':
      return {
        ...state,
        cards: state.cards.map((c) =>
          c.id === action.id ? { ...c, open: action.open } : c,
        ),
      };
    case 'all':
      return {
        ...state,
        cards: state.cards.map((c) => ({ ...c, open: action.open })),
      };
  }
}
export function reorder<T>(
  items: readonly T[],
  index: number,
  delta: number,
): T[] {
  const result = [...items],
    to = index + delta;
  if (index >= 0 && index < items.length && to >= 0 && to < items.length)
    [result[index], result[to]] = [result[to], result[index]];
  return result;
}
export function mergeOverride(
  items: readonly EventOverride[],
  next: EventOverride,
): EventOverride[] {
  return [
    ...items.filter(
      (o) =>
        !(
          o.calendarId === next.calendarId &&
          JSON.stringify(o.target) === JSON.stringify(next.target)
        ),
    ),
    next,
  ];
}
