# Browser test setup and checkpoint 1 - build session

| Field | Value |
|---|---|
| Date / Author (role) | 2026-10-31 / R5 Testing and DevOps |
| Linked task / ADR / PR | R5-D2-3 / ADR-007 / https://github.com/manikanta7cheruku/studentos-app/pull/19 |
| Related docs | docs/TESTING.md sections 2 and 5, docs/FEATURES_AND_JOURNEYS.md F-01 |

## 1. What we are learning and why it is needed

End-to-end (e2e) tests walk through a whole journey on a running app, like a real user. Playwright is the tool. This task sets it up and writes the first journeys: sign in with an email code and join a college with an invite code.

## 2. What problem it solves

Unit tests prove small pieces. They do not prove that the pieces work together: cookies, the login service, the mailbox, the database and the app. A journey test catches problems between the parts.

## 3. Concepts and terminology (short glossary)

- Playwright: a tool that drives a real browser, or plain HTTP requests, and checks the results.
- Journey: a whole path a user takes (for example "sign in, then join").
- Project (Playwright): a named set of tests with its own settings. Ours: `api`, `chromium` (desktop), `phone` (Pixel 7).
- API context: Playwright's HTTP client. It keeps cookies like a browser.
- Mailbox (Mailpit): the local inbox that catches the sign in mails.
- Flaky test: a test that sometimes fails for no code reason.
- Smoke test: a very small test that only checks the app opens.

## 4. How it works internally (appropriate depth)

- `playwright.config.ts` starts the app (`pnpm dev` locally, `pnpm start` of the production build in CI) and waits for the home page.
- Tests run one after the other (one worker), because they share one database and one mailbox.
- `e2e/helpers.ts` signs a user in through the real endpoints: ask for a code, read it from Mailpit (or from the service role on staging), verify it. The cookie jar keeps the session.
- Invite codes for the tests are inserted with the service role, hashed with the same function the app uses.
- Because R3's sign in and join screens do not exist yet, the journeys call the endpoints the screens will call. Browser tests today only open the home page on desktop and phone.
- `.github/workflows/e2e.yml` builds the app, starts the local Supabase stack, installs Chromium and runs `pnpm test:e2e`.

## 5. How it is used in StudentOS (files/modules)

- `playwright.config.ts`, `e2e/helpers.ts`, `e2e/auth-and-join.api.spec.ts`, `e2e/smoke.ui.spec.ts`, `.github/workflows/e2e.yml`
- Command: `pnpm test:e2e` (needs `pnpm db:start`, `pnpm db:reset`, `pnpm env:local`).
- Used next by: R5 Day 3 (join journeys with email domain and manual approval), R3 and R4 (their screens get browser journeys).

## 6. Request/response and data flow (diagram or numbered trace)

The "good invite code" journey:

1. Test asks `POST /api/v1/auth/otp/request` for a new address. The app asks Supabase Auth to send a code.
2. Mailpit receives the mail. The helper reads the 6 digit code.
3. `POST /api/v1/auth/otp/verify` returns cookies. The API context stores them.
4. `GET /c/alpha/me/membership` returns `null`.
5. The test inserts an invite code. `POST /c/alpha/join/invite` returns an active member at level 2.
6. The same request with the same `Idempotency-Key` returns the same answer with `Idempotent-Replay: true`.
7. Logout, then `GET /me/membership` returns 401.

## 7. API methods, endpoints, schemas, status codes

Journeys cover TEN-01, AUTH-01, AUTH-02, AUTH-03, TEN-02, TEN-03 with 200, 400 `INVITE_INVALID`, 409 `INVITE_EXHAUSTED`, 410 `INVITE_EXPIRED`, 401, and the race for the last use (one 200 and one 409).

## 8. Database changes and relationships

None. The tests create invites and users with an `e2e` prefix and remove them afterwards.

## 9. Authentication / authorization behaviour

The journeys prove: sign in sets session cookies, joining needs a session, a member sees their membership, logout ends the session. The service role is used only to prepare data and read codes, and the helpers refuse to run against anything but the local stack.

## 10. Errors and edge cases

- The browser tests run in a desktop and a phone profile; "no horizontal scroll" is checked on both.
- `webServer` waits on the home page, not on `/api/health`, because health arrives in a separate pull request.
- Seed users have `.test` addresses. On staging their codes come from the service role (no mail).
- Not covered yet: the screens, the college email journey, the manual approval journey (Day 3 and when the screens exist), axe checks in the browser (R4 covers axe in unit tests for now), a Playwright report upload in CI.

## 11. Tests: what exists and how to run them (exact commands)

```
pnpm db:start && pnpm db:reset && pnpm env:local
pnpm test:e2e
```

Seen on 2026-10-31: `9 passed` locally (5 api, 2 chromium, 2 phone). Mutation: I removed the invite use limit in the running database and the "used up" journey failed; after `pnpm db:reset` all 5 api journeys passed again. Lint, typecheck and unit tests passed. CI result of the E2E workflow is in the pull request.

## 12. How to debug common failures

- `Error: connect ECONNREFUSED`: the app did not start. Run `pnpm dev` by hand and read the error.
- `No mail arrived for ...`: is `pnpm db:start` running? Open http://127.0.0.1:54324.
- `.env.local` missing: run `pnpm env:local`.
- A failure leaves a trace: run `pnpm exec playwright show-trace <file>` from `test-results`.

## 13. Security considerations

- The journeys use fake data and the local stack. No real address, token or student data.
- New package: `@playwright/test` 1.64.1, Apache-2.0 (checked with `pnpm view @playwright/test version license`, allowed by docs/LICENSING.md).
- The Chromium download comes from the Playwright package itself (`playwright install chromium`).

## 14. Alternatives and trade-offs

- Wait for R3's screens before writing e2e: we would have no journey test for Checkpoint 1. API journeys now, browser journeys when the screens exist.
- Run all browsers: slower and more flaky. Chromium only for now; WebKit and Firefox are planned for the nightly run (docs/TESTING.md).

## 15. What AI generated or suggested (prompts used, summary)

AI (Claude Code) wrote the config, helpers, tests and workflow from the R5 Day 2 prompt and docs/TESTING.md. It also proposed the mutation check.

## 16. What a human verified (how: ran tests, read code, checked docs, tried to break it)

Done in the session with real output: `pnpm test:e2e`, the mutation check, lint, typecheck and unit tests.

Not done yet (open on purpose):

- The Checkpoint 1 run on staging with R2 and R3 (staging and R3's screens do not exist yet).
- A person has not read the tests line by line.
- No second reviewer yet.

## 17. What each teammate can now explain/implement independently

Planned, not yet confirmed: run `pnpm test:e2e`, add a journey to `e2e/`, and read a failure trace.

## 18. Further learning resources

- Playwright docs: API testing, projects, traces, CI (check the official pages).

## 19. Docs updated because of this (per trigger table)

- docs/DEV_SETUP.md: commands `pnpm env:local` and `pnpm test:e2e` (in the close-out pull request).

## 20. Walkthrough drill: passed by / date

not yet
