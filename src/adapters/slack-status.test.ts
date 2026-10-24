import { describe, expect, it } from 'vitest';
import { SlackAdapter, SlackError, type Fetch } from './slack';

const reply =
  (profile: unknown): Fetch =>
  () => ({ status: 200, body: JSON.stringify({ ok: true, profile }) });

describe('SlackAdapter.readStatus', () => {
  const read = (profile: unknown) =>
    new SlackAdapter(reply(profile), 'token-for-tests', () => 0).readStatus();

  it('reads a profile that never had a status as empty', () => {
    expect(read({})).toEqual({ text: '', emoji: '', expiresAt: 0 });
  });

  it('reads a normal profile and converts seconds to milliseconds', () => {
    expect(
      read({
        status_text: 'Lesson',
        status_emoji: ':books:',
        status_expiration: 90,
      }),
    ).toEqual({ text: 'Lesson', emoji: ':books:', expiresAt: 90000 });
  });

  it('still rejects fields of the wrong type', () => {
    expect(() => read({ status_text: 5 })).toThrow(SlackError);
    expect(() => read({ status_expiration: 'soon' })).toThrow(SlackError);
    expect(() => read(null)).toThrow(SlackError);
  });
});
