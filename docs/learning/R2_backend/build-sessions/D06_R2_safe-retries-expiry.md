# Safe retries and expiry - build session

| Field | Value |
|---|---|
| Date / Author (role) | 2026-11-07 / R2 Backend and database |
| Linked task / ADR / PR | R2-D6-1 / DECISIONS D-21 / https://github.com/manikanta7cheruku/studentos-app/pull/32 |
| Related docs | docs/ERROR_HANDLING.md section 3, docs/API_CONTRACT.md section 11, docs/DATABASE.md section 16, docs/OBSERVABILITY.md section 11 |

## 1. What we are learning and why it is needed

Phones lose signal, people double click, and browsers retry. The server must do the work once and answer the same way every time. Separately, things must end: a team post whose deadline passed, a join request nobody answered, old rows nobody needs.

## 2. What problem it solves

- A retry or a double click never creates two posts, two announcements or two requests, even when both arrive at the same moment (this was a real gap in the Day 2 version: it read first and wrote after, so two simultaneous calls both did the work).
- A failed attempt never blocks the key. A crashed request never blocks it for 24 hours.
- Expired posts and join requests are closed by the system, the people are told, and the person whose join request expired can apply again.
- The database does not grow forever (idempotency keys, rate limit events, notifications, waitlist).

## 3. Concepts and terminology (short glossary)

- Idempotency key: a random id the screen sends with a create call. Same key means "this is the same action".
- Claim: writing the key into the table before doing the work. The database allows only one claim per key, so only one request does the work.
- In progress: a claimed key whose work is not finished. A second request gets 409 with `Retry-After: 1`.
- Takeover: a claim older than 60 seconds (a crashed request) can be claimed again.
- Maintenance run: one function that expires and deletes things. Safe to run any number of times.
- Derived status: a post past its deadline already shows `expired` when read; the maintenance run makes the table agree.

## 4. How it works internally (appropriate depth)

1. `withIdempotency` calls `idem_claim`. The function does `insert ... on conflict do nothing`. If it inserted, the answer is `claimed` and the route does the work.
2. If the row exists, the function locks it and decides: expired older than 24 hours means claim again; different body means `mismatch` (422); finished means `replay` (the saved answer); claimed less than 60 seconds ago means `in_progress` (409); older claim means take over.
3. When the work succeeds, `idem_complete` stores the answer. When it throws, `idem_release` deletes the claim so the same key can try again. Only successful answers are kept.
4. `POST /api/internal/maintenance` runs `maintenance_run`. It needs `Authorization: Bearer <CRON_SECRET>` (compared in constant time). Without a secret, or if CRON_SECRET is not set, the answer is 401. A person's cookie never opens it.
5. `maintenance_run` expires team posts past their deadline (waiting requests cancelled, people told), expires join requests that waited more than 30 days (the membership goes to `left`, the person is told and can apply again), and deletes old rows: idempotency keys (1 hour after they expire), rate limit events (1 day), notifications (90 days), waitlist (12 months).

## 5. How it is used in StudentOS (files/modules)

- `supabase/migrations/20261108000000_expiry_and_safe_retries.sql`
- `src/lib/idempotency.admin.ts` (rewritten), `src/modules/maintenance/maintenance.admin.ts`, `src/app/api/internal/maintenance/route.ts`
- Used by every IDEM endpoint (announcements, invites, reports, decisions, join, team posts, requests).
- Scheduling: docs/OBSERVABILITY.md section 11 (R5 sets it up on staging).

## 6. Request/response and data flow (diagram or numbered trace)

Eight identical "create announcement" calls at once:

1. All eight reach `idem_claim` with the same key. One inserts the row: `claimed`. It creates the announcement.
2. The other seven find the row in progress: 409 `CONFLICT`, `Retry-After: 1` (or, if the first already finished, the saved answer with `Idempotent-Replay: true`).
3. The first one calls `idem_complete`. A later retry gets the saved answer.
4. Result: one announcement (tested).

## 7. API methods, endpoints, schemas, status codes

New: SYS-02 `POST /api/internal/maintenance` (401 or 200 with counts). Changed: IDEM endpoints can now answer 409 `CONFLICT` with `Retry-After: 1` when the same key is still running. TEN-01 also returns `modules` (see the R3 note).

## 8. Database changes and relationships

`idempotency_keys` gets `state` and `locked_until` (and `response` and `status_code` may be empty while in progress). New functions `idem_claim`, `idem_complete`, `idem_release`, `maintenance_run`. New notification types `membership.expired` and `team.post_expired`. View `public_college_branding` gets `modules`. Details: docs/DATABASE.md section 16.

## 9. Authentication / authorization behaviour

The new functions are for the service role only (tested: a signed-in admin and anon get permission denied). The maintenance route accepts only the shared secret.

## 10. Errors and edge cases

- Same key, another body: 422 `IDEMPOTENCY_KEY_REUSED` (also while the first call is running).
- The work fails: the key is released, a retry runs the work again.
- The work succeeded but saving the answer failed: the claim stays in progress for 60 seconds, then a retry would run the work again (rare, logged).
- An accepted team member is not touched by expiry. Only waiting requests are cancelled.
- Join request expiry sets the membership to `left`, the enrollment number is free again, and `join/manual` works again (tested).
- Not done: nothing calls the maintenance endpoint yet (R5 schedules it). Until then, status is still right because posts are shown as expired when read.

## 11. Tests: what exists and how to run them (exact commands)

```
pnpm db:test              # 010_expiry_and_safe_retries.test.sql: 34 checks
pnpm test:integration     # reliability.test.ts (10 tests) and the permission matrix
pnpm verify
```

Seen on 2026-11-07 (tools run directly with node): pgTAP Files=10, Tests=542, PASS. Integration 807 passed, 2 skipped on purpose, twice in a row. Unit 395. Lint, typecheck, format, build passed (the route appears in the build).

Mutation checks, each made tests fail, then passed after restoring: (1) in-progress guard removed (the 8-at-once test and pgTAP failed), (2) expiry does not cancel waiting requests, (3) failed work does not release the key, (4) maintenance route open to anyone.

## 12. How to debug common failures

- 409 `CONFLICT` with `Retry-After: 1` on a create: the same key is still running. Wait one second and send the same call.
- 422 on a retry: the body changed. A new action needs a new key.
- Posts still `open` in the table: the maintenance run has not been scheduled yet. The API already shows them as expired.

## 13. Security considerations

The secret is compared with a hash and `timingSafeEqual`, must be at least 24 characters, and is never logged. The route does not take any input. The counts are not sensitive.

## 14. Alternatives and trade-offs

- `pg_cron` inside the database: no HTTP route and no secret, but not available on every plan and hidden from the app's logs. A route plus an hourly scheduler is easy to test and to run by hand.
- Locking the key row with a unique constraint only (and returning the error): simpler, but the second request would not know whether to wait or fail.

## 15. What AI generated or suggested (prompts used, summary)

AI (Claude Code) found the race in the old `withIdempotency` while reading it for this task, wrote the migration, the rewrite, the endpoint, tests and docs, and proposed the mutation checks.

## 16. What a human verified (how: ran tests, read code, checked docs, tried to break it)

Done with real output: pgTAP, integration tests twice (including 8 simultaneous requests), unit tests, build, four mutation checks.

Not done yet (open on purpose): no person has read the SQL line by line, no second reviewer, no scheduler runs the maintenance, not run in CI yet.

## 17. What each teammate can now explain/implement independently

R3: handle 409 with `Retry-After` on create calls. R5: schedule the maintenance call and add a staging check that it answers 200.
