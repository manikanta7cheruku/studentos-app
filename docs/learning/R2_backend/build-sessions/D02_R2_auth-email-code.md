# Login by email code - build session

| Field | Value |
|---|---|
| Date / Author (role) | 2026-10-31 / R2 Backend and database |
| Linked task / ADR / PR | R2-D2-1 / ADR-004 / https://github.com/manikanta7cheruku/studentos-app/pull/14 |
| Related docs | docs/API_CONTRACT.md (AUTH-01 to AUTH-03, TEN-02), docs/AUTH_AND_TENANCY.md sections 1, 2, 11, docs/ERROR_HANDLING.md (F3, F10, F18, F27) |

## 1. What we are learning and why it is needed

A person signs in with their email: we send a 6 digit code, they type it, and they get a session. The same task adds the helpers every later endpoint uses: who is calling (`getCurrentUser`), is this person an active member of this college with enough level and the right role (`requireMember`), one error type (`AppError`) and one answer shape (the envelope).

## 2. What problem it solves

- No passwords to leak or reset.
- Nobody can learn which emails have accounts (the answer is always the same).
- Guessing codes or spamming codes is slowed down by limits.
- Every endpoint gives the same, predictable errors, so screens can show friendly messages.

## 3. Concepts and terminology (short glossary)

- OTP: a one time password. Here a 6 digit code sent by email.
- Supabase Auth (GoTrue): the service that sends the code, checks it and issues the session.
- Session cookie: the proof that you are signed in. HttpOnly means page scripts cannot read it. SameSite=Lax limits sending it from other sites.
- Bearer token: the same proof sent in an `Authorization: Bearer ...` header. Used by tests and tools.
- Account enumeration: finding out which emails have accounts. We stop it by always giving the same answer.
- Rate limit: a cap on how often something may happen.
- HMAC hash: a one way fingerprint made with a secret. We store the fingerprint of an email, never the email, in the limit table.
- CSRF: a trick where another website makes your browser send a request. We check the `Origin` header.
- Envelope: `{ data, meta }` for success, `{ error }` for failure.

## 4. How it works internally (appropriate depth)

1. `POST /auth/otp/request` checks the body (Zod), counts the request against two limits (20 per hour per IP, 5 per hour per email), asks Supabase Auth to send a code, records "a code was sent now", and always answers `{ sent: true, retry_after_seconds: 60 }`.
2. `POST /auth/otp/verify` first checks the lock (5 wrong codes in 15 minutes) and the attempt limit (10 in 15 minutes), then asks Supabase Auth to check the code. On success it clears the wrong-code count, creates the profile on the first sign in, and sets the session cookies. On failure it counts the mistake.
3. Supabase answers "expired or invalid" for both mistakes. We tell them apart with our own record: if no code was sent in the last 10 minutes the person's code is too old (`OTP_EXPIRED`), otherwise it is just wrong (`OTP_INVALID`).
4. `POST /auth/logout` needs a session. `?all=true` signs out everywhere.
5. `getCurrentUser` asks Supabase Auth to check the token. It does not only decode it. Cookie or Bearer both work.
6. `requireMember(request, jar, slug, { minLevel, roles })` follows the order in the contract: signed in, then the college, then an active membership with a high enough level, then the role. A person who is not a member of that college gets `NOT_FOUND`, so the answer never says whether the college exists.
7. The limit counters live in Postgres (`rate_limit_events` and six `rate_limit_*` functions) so they work on many servers at once. They use a lock per key so two requests cannot both take the last slot.

## 5. How it is used in StudentOS (files/modules)

- `src/app/api/v1/auth/otp/request/route.ts`, `.../verify/route.ts`, `src/app/api/v1/auth/logout/route.ts`, `src/app/api/v1/c/[slug]/me/membership/route.ts` (TEN-02)
- `src/modules/auth/otp.ts`: request, check and profile creation
- `src/modules/tenancy/require-member.ts`: `loadMembership`, `requireMember`
- `src/modules/rate-limit/rate-limit.admin.ts`: calls the limit functions
- `src/lib/api.ts` (`route`, `ok`, `readJson`, `readQuery`, `assertSameOrigin`), `src/lib/errors.ts` (`AppError`), `src/lib/env.ts`, `src/lib/hash.ts`, `src/lib/supabase/request-client.ts` (cookie jar, user client, `getCurrentUser`)
- `src/server/admin/supabase-admin.ts`: the service role client
- `supabase/migrations/20261031010000_rate_limits_and_membership_lookup.sql`, `supabase/templates/otp.html`, `supabase/config.toml`
- Used next by: every later endpoint (R2 Days 3 to 10), R3 sign in screens, R5 e2e tests.

## 6. Request/response and data flow (diagram or numbered trace)

Sign in as `student1@alpha.test`:

1. Screen sends `POST /api/v1/auth/otp/request` with the email.
2. The handler wrapper makes a request id, parses the body, counts the limits in Postgres, asks Supabase Auth to mail a code, answers `sent: true`.
3. The person reads the email and the screen sends `POST /api/v1/auth/otp/verify` with email and code.
4. The handler checks the lock, then Supabase Auth checks the code and returns a session.
5. The session is turned into HttpOnly cookies on the response. The profile row is created if it is the first time.
6. Later calls carry the cookie. `getCurrentUser` asks Supabase Auth who it is. Then `loadMembership` calls the SQL function `my_membership_for_slug`, which returns only the caller's own row.

## 7. API methods, endpoints, schemas, status codes

- AUTH-01 200 `{ sent, retry_after_seconds }`; 400 `VALIDATION_FAILED`; 413, 415; 429 `RATE_LIMITED` (+ `Retry-After`); 503 `UPSTREAM_UNAVAILABLE`.
- AUTH-02 200 `{ user, is_new }` + cookies; 400 `OTP_INVALID`; 410 `OTP_EXPIRED`; 429 `RATE_LIMITED`.
- AUTH-03 200 `{ signed_out }`; 401; 403 for a cookie request from another origin; 400 for unknown query parameters.
- TEN-02 200 `{ membership }` (null if not joined); 401.
- Schemas: `src/contracts/auth.ts`, `tenant.ts`, `common.ts`.

## 8. Database changes and relationships

- New table `rate_limit_events(bucket, key_hash, created_at)`. Clients have no access (explicit deny policy). Only the service role calls the functions `rate_limit_consume`, `_peek`, `_record`, `_clear`, `_last`, `_purge`.
- New function `my_membership_for_slug(slug)` for signed-in users. It returns only the caller's own membership row plus the college status.
- Buckets in use: `otp_request_ip`, `otp_request_email`, `otp_sent`, `otp_verify_attempt`, `otp_verify_fail`.
- Config: code length 6, expiry 10 minutes, our own mail template, local mail limits raised for tests.

## 9. Authentication / authorization behaviour

- Session in HttpOnly, SameSite=Lax cookies. The Secure flag follows the app URL (https in staging and production).
- Cookie requests that change state check the `Origin` header. Bearer requests do not need it.
- The service role is used only by `*.admin.ts` files and `src/server/admin/**`. ESLint refuses an import from anywhere else (checked by a deliberate bad import).
- Not decided yet: the token refresh in server rendered pages needs a `proxy.ts` (Next.js 16). R3 will need it on Day 3 or later.

## 10. Errors and edge cases

- Same answer for any email, so no guessing of accounts. The only visible difference is `RATE_LIMITED` after many requests for one address.
- Supabase also limits mail per address. Locally that is 1 second. If it refuses, we answer `RATE_LIMITED`, not a server error.
- A code that is correct but entered after the 10 minutes is refused by Supabase. We answer `OTP_EXPIRED` only when our own record agrees the last code is old. If the person asked for a newer code and typed the old one, the answer is `OTP_INVALID`. This is a known simplification.
- The locked person gets `RATE_LIMITED` even with the right code until the window passes.
- A provider failure (mail or auth down) is `UPSTREAM_UNAVAILABLE`. The message does not say which address failed.
- Dates from Postgres have `+00:00`. The contract wants `Z`, so `toIso()` converts them. The integration test found this.

## 11. Tests: what exists and how to run them (exact commands)

```
pnpm db:start
pnpm db:test              # includes 005_rate_limit_and_membership_lookup (23 checks)
pnpm test                 # unit tests (part of pnpm verify)
pnpm test:integration     # needs pnpm db:start and .env.local
pnpm verify
```

Seen on 2026-10-31:

- `pnpm test:integration`: all auth tests passed (25 at that time).
- `pnpm verify`: all five steps passed (183 tests, build ok, four routes listed).
- Each error code of AUTH-01 and AUTH-02 has a test: `VALIDATION_FAILED`, `UNSUPPORTED_MEDIA_TYPE`, `PAYLOAD_TOO_LARGE`, `RATE_LIMITED`, `OTP_INVALID`, `OTP_EXPIRED`. `UPSTREAM_UNAVAILABLE` (mail or auth down) is only checked as an envelope shape in the unit tests, not by stopping the mail service.
- The limits are tested: 5 requests per hour per email, 20 per hour per IP, lock after 5 wrong codes, 10 verify attempts per 15 minutes.
- `requireMember` has one test for every outcome: `UNAUTHENTICATED`, `NOT_FOUND`, `MEMBERSHIP_NOT_ACTIVE` (pending and suspended), `VERIFICATION_LEVEL_TOO_LOW`, `FORBIDDEN`, `TENANT_SUSPENDED`, and success.
- Mutation check: a deliberate import of the service role client from a normal file made ESLint fail.

## 12. How to debug common failures

- "Missing or invalid environment variables: ...": fill `.env.local` (see `.env.example`). The error lists names only.
- Integration test says no code arrived: is `pnpm db:start` running? Open http://127.0.0.1:54324 (Mailpit) to see the mails.
- 503 on a code request: the local mail service refused. Wait a second and retry. Check `pnpm supabase status`.
- Test stops with "Integration tests only run against the local Supabase stack": `NEXT_PUBLIC_SUPABASE_URL` in `.env.local` must be http://127.0.0.1:54321.
- Cookie missing in a manual test: send the `Cookie` header from the verify answer.

## 13. Security considerations

- No account guessing, no token in a response body, no email or code in logs (the error wrapper logs the cause without the request body).
- Limit keys are HMAC hashes made with `APP_HASH_SECRET`. The secret must be at least 32 characters and never in git (`.env.example` keeps it empty, and a hygiene test enforces that).
- IP limits trust `x-forwarded-for`. On Vercel that header is set by the platform. Behind another proxy it can be faked, so staging must be checked by R5.
- New packages: `@supabase/supabase-js` 2.118.0 and `@supabase/ssr` 0.12.7, both MIT (checked with `pnpm view <name> license`).
- AI wrote security sensitive code here (login, limits, cookies). It needs a second human review (AI rule 7).

## 14. Alternatives and trade-offs

- Rate limits in Postgres vs Redis: Postgres needs no new service and is shared by all servers. It is slower. Fine for 5 people and one college.
- Magic link vs code: a code works on a phone where the mail app and the browser are different.
- Own token handling vs `@supabase/ssr`: the library handles cookie chunking and refresh. We wrap it so tests need no Next.js runtime.
- Telling expired from wrong with our own record is not perfect (section 10), but Supabase gives no other signal.

## 15. What AI generated or suggested (prompts used, summary)

AI (Claude Code) wrote the migration, the SQL tests, the library files, the routes, the integration tests and this note. It used the R2 Day 2 prompt, docs/API_CONTRACT.md sections 1 to 4, docs/AUTH_AND_TENANCY.md and the Next.js 16 docs in `node_modules/next/dist/docs`. It ran every command. The integration tests found four real problems that were then fixed: dates without `Z`, a 503 where Supabase answers 429, a wrong expired-code test, and a test helper that overwrote the content type.

## 16. What a human verified (how: ran tests, read code, checked docs, tried to break it)

Done in the session with real output: `pnpm db:test`, `pnpm test:integration`, `pnpm verify`, the lint mutation check.

Not done yet (open on purpose):

- A person has not read the library and route files line by line.
- A second reviewer has not reviewed the login, limit and cookie code.
- Not tried by hand in a browser (there is no sign in screen yet).
- Staging: the hosted Supabase project needs the same mail template, 10 minute expiry and mail limits set in its dashboard. R5 checks this.

## 17. What each teammate can now explain/implement independently

Planned, not yet confirmed: sign in locally with the code from Mailpit, call a route handler in a test, add a new endpoint with `route()`, `readJson` and `requireMember`, and name the order of checks.

## 18. Further learning resources

- Supabase docs: Auth with email OTP, Server-Side Auth (`@supabase/ssr`) (check the official pages for current details).
- Next.js docs in `node_modules/next/dist/docs`: Route Handlers, `cookies`.

## 19. Docs updated because of this (per trigger table)

- docs/API_CONTRACT.md: new section 7 (what is built, headers, choices).
- docs/DEV_SETUP.md: `.env.local`, `pnpm test:integration`, Mailpit.
- docs/DATABASE.md: section 12 (tables and functions added on Day 2).
- `.env.example`: Supabase and hash variables.

## 20. Walkthrough drill: passed by / date

not yet
