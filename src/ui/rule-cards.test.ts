import { describe, expect, it } from 'vitest';
import type { Rule } from '../core/types';
import { ruleSummary, truncateSummary, updateCards } from './logic';
import { messages } from './strings';

const rule: Rule = {
  keyword: 'Lesson',
  text: 'Learning',
  enabled: true,
  match: 'contains',
};
describe('rule summaries', () => {
  it('orders keyword, exact match, arrow, text, emoji and badges', () => {
    expect(
      ruleSummary(
        {
          ...rule,
          match: 'exact',
          emoji: ':books:',
          enabled: false,
          pauseNotifications: true,
          ignore: true,
        },
        'en',
      ),
    ).toEqual({
      text: 'Lesson (Exact match) → Learning :books:',
      fullText: 'Lesson (Exact match) → Learning :books:',
      badges: ['Disabled', 'Pause notifications', 'Ignore event'],
    });
  });
  it.each(['en', 'ja'] as const)(
    'uses translated placeholders in %s',
    (locale) => {
      const summary = ruleSummary({ ...rule, keyword: '', text: '' }, locale);
      expect(summary.text).toBe(
        `${messages[locale].noKeyword} → ${messages[locale].eventTitle}`,
      );
      expect(summary.badges).toEqual([]);
      expect(ruleSummary({ ...rule, text: undefined }, locale).text).toContain(
        messages[locale].eventTitle,
      );
    },
  );
  it('truncates by Unicode code points, keeping complete text for the accessible title', () => {
    const summary = ruleSummary(
      { ...rule, keyword: '📚'.repeat(30) },
      'en',
      12,
    );
    expect(summary.text).toBe('📚'.repeat(11) + '…');
    expect(Array.from(summary.text)).toHaveLength(12);
    expect(summary.fullText).toContain('Learning');
    expect(truncateSummary('abc', 3)).toBe('abc');
    expect(truncateSummary('abc', 1)).toBe('…');
  });
});
describe('UI-only card state', () => {
  it('loads collapsed, adds expanded, and preserves identity/open state across move/delete', () => {
    const loaded = updateCards(
      { nextId: 0, cards: [] },
      { type: 'load', count: 2 },
    );
    expect(loaded.cards).toEqual([
      { id: 0, open: false },
      { id: 1, open: false },
    ]);
    const added = updateCards(loaded, { type: 'add' });
    expect(added.cards[2]).toEqual({ id: 2, open: true });
    const opened = updateCards(added, { type: 'toggle', id: 0, open: true });
    const moved = updateCards(opened, { type: 'move', index: 2, delta: -1 });
    expect(moved.cards).toEqual([
      { id: 0, open: true },
      { id: 2, open: true },
      { id: 1, open: false },
    ]);
    const deleted = updateCards(moved, { type: 'delete', index: 0 });
    expect(deleted.cards).toEqual([
      { id: 2, open: true },
      { id: 1, open: false },
    ]);
    expect(updateCards(deleted, { type: 'add' }).cards[2]).toEqual({
      id: 3,
      open: true,
    });
    expect(loaded.cards.every((c) => !c.open)).toBe(true);
  });
  it('expands/collapses all without changing identities and ignores invalid moves', () => {
    const initial = updateCards(
      { nextId: 0, cards: [] },
      { type: 'load', count: 3 },
    );
    const expanded = updateCards(initial, { type: 'all', open: true });
    expect(expanded.cards.every((c) => c.open)).toBe(true);
    const collapsed = updateCards(expanded, { type: 'all', open: false });
    expect(collapsed).toEqual(initial);
    expect(updateCards(initial, { type: 'move', index: 0, delta: -1 })).toEqual(
      initial,
    );
    expect(
      updateCards(initial, { type: 'toggle', id: 999, open: true }),
    ).toEqual(initial);
  });
});
