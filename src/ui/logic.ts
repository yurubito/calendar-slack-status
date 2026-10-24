import type { EventOverride } from '../core/types';
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
