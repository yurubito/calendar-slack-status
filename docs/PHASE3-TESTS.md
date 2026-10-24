# Phase 3 verification

Final local checks: `npm test` passed **124 tests in 9 files (12.78 s)**; `npm run lint`, `npm run build`, `npm run preview:build`, and `git diff --check` passed. The `gitleaks` executable is unavailable in this environment, so a full gitleaks scan was not performed. No branch, commit, push or PR was created.

The reusable helper in `src/testing/fake-slack.ts` starts `fake-slack-server.mjs` in a separate Node process on 127.0.0.1 with an ephemeral port. The synchronous HTTP bridge lets the same synchronous orchestration used by Apps Script send real HTTP requests while the server continues processing them. It validates Bearer headers, form bodies, profile JSON strings, integer seconds/minutes, text limits, user scopes, client credentials and single-use codes, and records requests. Failures include API errors, 429/Retry-After, HTTP 500 and delayed responses causing transport timeouts. Only loopback network traffic is used; decision clocks are injected. Timeout tests necessarily exercise short real socket deadlines.

All names below are in `src/testing/phase3.test.ts` unless noted. Existing pure-core, settings, calendar and UI tests remain in the suite. `src/core/`, `docs/SPEC.md`, and `docs/design/` are unchanged.

| Scenario                                                                    | Automated test name                                                                      |
| --------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------- |
| (a) Event starts, exact profile expiry/DND                                  | `a event starts: exact profile seconds and snooze minutes`                               |
| (b) Unchanged next tick, no writes                                          | `b unchanged next tick has zero additional writes`                                       |
| (c) Manual Slack status protected                                           | `c manually changed status is untouched`                                                 |
| (d) Empty status can be set                                                 | `d empty status may be set`                                                              |
| (e) Event ended, no writes                                                  | `e ended event makes no writes`                                                          |
| (f) Ignore / disabled / none + pausing rule                                 | `f ignore and disabled rules and none with pausing rule`                                 |
| (g) Both overlap strategies                                                 | `g overlap strategy latestStart`; `g overlap strategy ruleOrder`                         |
| (h) Dry run, intended calls, no applied-state writes or token logging       | `h dry run logs exact intended calls without persisting writes`                          |
| (i) HTTP 500, no failed-state persistence, retry                            | `i HTTP 500 does not persist failed status and retries next tick`                        |
| (j) Reconnect, remove trigger, daily email limit                            | `j invalid auth reconnect removes trigger and sends at most one daily email`             |
| (k) 429 skips writes                                                        | `k HTTP 429 skips writes and preserves applied state`                                    |
| (l) Held lock                                                               | `l held lock skips all work`                                                             |
| (m) Disconnected                                                            | `m disconnected skips all work`                                                          |
| (n) DST crossing                                                            | `n DST crossing uses epoch expiry and duration`                                          |
| Partial success                                                             | `partial success persists status but retries only failed DND`                            |
| DND resume and ceil/minimum                                                 | `resume notifications and minimum rounded snooze`                                        |
| Invalid-auth family (six codes)                                             | `typed authentication error %s`                                                          |
| Retry-After and socket timeout                                              | `rate retry-after and timeout produce sanitized typed errors`                            |
| OAuth URL/scopes/redirect                                                   | `OAuth URL has only user scopes and server redirect fallback`                            |
| Tampered, expired, reused, foreign and future state                         | `rejects %s OAuth state`                                                                 |
| OAuth success / user-only storage                                           | `OAuth success stores only user token and metadata and clears nonce`                     |
| Code, client, API, rate, HTTP, timeout, denial, missing code/scope failures | `OAuth exchange failure %s`                                                              |
| Code replay                                                                 | `authorization codes are single use`                                                     |
| Disconnect including revoke failure                                         | `disconnect cleans user data even with revoke failure %s`                                |
| Repeated connect / stale duplicates                                         | `trigger ensure removes stale duplicates and connect twice leaves one`                   |
| Full lifecycle hygiene                                                      | `full lifecycle token hygiene in logs errors UI payloads and URLs`                       |
| UI states/banner in both languages                                          | `connection states and global banner in en`; `connection states and global banner in ja` |
| State validation                                                            | `state store rejects corruption unknown versions and malformed fields`                   |
| Strict fake validation                                                      | `fake rejects missing scopes malformed profile and snooze fields`                        |
| Indefinite manual pause                                                     | `manual indefinite pause survives ticks without notification calls`                      |
| Hostile responses / error sanitization                                      | `transport and hostile raw responses never escape as errors or logs`                     |
| Slack precision boundary                                                    | `second precision at Slack boundary avoids repeated subsecond writes`                    |
| Trigger creation failure                                                    | `trigger setup failure never reports a connected working installation`                   |
| Runtime budget warning                                                      | `approaching execution budget logs fixed warning and releases lock`                      |

`src/testing/server.test.ts` additionally exercises the actual server exports, Apps Script fetch bridge, crypto wiring, locks, trigger glue, callback pages, dry-run Script property and bilingual mail adapter against the HTTP fake:

- `server connect callback check-now disconnect uses real glue without exposing credentials`
- `callback %s renders fixed bilingual error with app link` (tampered, denied, exchange error)
- `glue dry-run flag blocks writes and invalid auth mails bilingually without identity scope`

`src/ui/page-markup.test.ts` checks top-window navigation, disconnect confirmation and the global banner wiring. UI tests are markup/logic checks; real browser/Apps Script iframe behavior is not simulated.

## Interpretations and questions for the owner

- The task's three Slack scopes override SPEC §2's additional `dnd:read`; no DND reads are needed. Confirm that omission.
- A Slack OAuth authorization URL must expose the public client ID. Only the token, client secret and state signing secret remain hidden; no credential object is sent to the browser. Confirm this necessary exception to the request's wording that both client ID and secret never reach the browser.
- A daily reconnect limit uses UTC dates. The trigger is removed on invalid authorization, so later-day mail is possible only when another manual check runs, not through a daily scheduled reminder. Confirm this interpretation.
- To keep exactly the four requested Google scopes, mail uses the default primary calendar ID as recipient rather than `Session.getEffectiveUser().getEmail()`, which needs `userinfo.email`. The primary ID normally matches the user's email. Confirm this approach after verifying delivery on the intended account, or decide whether an explicit recipient setting/additional identity scope is wanted.
- Failed/rate-limited/dry-run attempts update last-check/result metadata; they never advance failed or would-be applied-status/notification markers. Successful status writes remain recorded if a later DND write fails.

## Remaining real-environment verification

Slack app manifest acceptance and administrator approval, OAuth browser redirects/Google account continuity, deployment and consent policy, user-owned trigger timing, real API semantics/workspace emoji support and status/DND expiry, per-user isolation in Google, quotas and mail delivery must be checked after deployment. The offline preview can simulate all three connection states with `?connection=connected`, `?connection=not_connected`, and `?connection=needs_reconnect`; select Connection in its navigation.

Protocol references: [Slack OAuth](https://docs.slack.dev/authentication/installing-with-oauth/), [profile updates](https://docs.slack.dev/reference/methods/users.profile.set/), [Apps Script identity scopes](https://developers.google.com/apps-script/reference/base/session), and [primary calendar identifiers](https://developers.google.com/workspace/calendar/api/concepts/events-calendars).
