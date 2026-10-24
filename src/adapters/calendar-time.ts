// Date boundaries are instants in a supplied IANA zone, independent of the host zone.
export function upcomingWindow(now: number, timeZone: string) {
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone,
    year: 'numeric',
    month: 'numeric',
    day: 'numeric',
  });
  const dayAt = (instant: number) => {
    const parts = formatter.formatToParts(instant);
    const part = (type: string) =>
      Number(parts.find((p) => p.type === type)!.value);
    return Date.UTC(part('year'), part('month') - 1, part('day'));
  };
  const day = dayAt(now);
  const midnight = (date: number) => {
    // Find the first instant of the date, including zones whose offset changes at midnight.
    let low = date - 36 * 3600000;
    let high = date + 36 * 3600000;
    while (low < high) {
      const mid = Math.floor((low + high) / 2);
      if (dayAt(mid) < date) low = mid + 1;
      else high = mid;
    }
    return low;
  };
  return { from: midnight(day), to: midnight(day + 8 * 86400000) };
}

export function calendarTimeZone(
  readZone: () => string,
  fallback: string,
): string {
  try {
    const zone = readZone();
    if (zone) {
      new Intl.DateTimeFormat('en', { timeZone: zone });
      return zone;
    }
  } catch {
    // A missing or invalid calendar zone uses the deployment's script zone.
  }
  new Intl.DateTimeFormat('en', { timeZone: fallback });
  return fallback;
}
