# Admin API (settings, invites, queue, members, audit) - build session

| Field | Value |
|---|---|
| Date / Author (role) | 2026-10-31 / R2 Backend and database |
| Linked task / ADR / PR | R2-D3-1 / ADR-003, ADR-005 / PR_ADMIN_URL |
| Related docs | docs/API_CONTRACT.md section 8, docs/AUTH_AND_TENANCY.md sections 4 and 8, docs/FEATURES_AND_JOURNEYS.md F-05/F-06, docs/DATABASE.md section 13 |

## 1. What we are learning and why it is needed

A college admin runs the college: who may join, who is waiting, who is suspended, what the settings are, and who did what. This task builds the endpoints for that (ADM-03, 05, 06, 07, 08, 09, 10, plus 11 for the dashboard numbers). It is the first time a user has power over other users, so the safety rules matter more than the features.

## 2. What problem it solves

- An admin approves or rejects people (with a reason) and manages invite codes without database access.
- Nobody can misuse admin power: a student gets 403, an admin of another college gets 404, an admin cannot approve their own request, and the last admin cannot be removed.
- Every change is recorded exactly once in the audit log, so the college can see who did what.

## 3. Concepts and terminology (short glossary)

- Defence in depth: two independent locks for the same rule. Here the TypeScript guard AND the SQL function both check "is this person an active admin of this college".
- Audit row: one line in `audit_logs` that says who did what to which thing, when. It can never be changed or deleted.
- Idempotency key: a random id that makes a retry safe (the second request returns the first answer).
- Keyset paging: pages are cut by "rows older than this time and id" instead of "skip N rows". No row is skipped or shown twice while the list changes.
- Stale item: a screen shows a request that someone else already decided. The server answers 409.
- Last admin rule: a college must always keep at least one active admin.

## 4. How it works internally (appropriate depth)

1. Every admin route starts with `adminContext()`: same-origin check (for changes), then `requireMember(..., roles: college_admin)`, then the rate limit (120 calls a minute per person). The order gives the right error: 401, 403 `MEMBERSHIP_NOT_ACTIVE`, 403 `FORBIDDEN`, or 404 for a person from another college.
2. The route calls a SQL function (`admin_*`) through the service role, passing the verified user id and the college id from `requireMember`, never from the request.
3. The SQL function calls `admin_assert` first. It checks again that the actor is an active admin of that college and that the college is not suspended. So even a bug in the TypeScript guard could not give a student admin power.
4. The function does its work and writes one audit row with `write_audit_log`, in the same transaction. If anything fails, nothing is saved, including the audit row.
5. Deciding a request locks the row (`for update`), so two admins clicking at once cannot both decide it: the second gets 409.
6. Member changes follow a small table of allowed moves. Self changes are refused (403), and the last admin is refused with the error `LAST_ADMIN` (shown as 409 with a clear message). The trigger from Day 1 is a second lock.
7. Invite codes are generated on the server (12 random characters from 31, about 59 bits), shown once, and stored only as an HMAC hash. The idempotency record stores the answer without the code.
8. Lists ask the database for one row more than the page size to know if there is a next page, and send a cursor made of the last row's time and id.

## 5. How it is used in StudentOS (files/modules)

- `supabase/migrations/20261031030000_admin_endpoints.sql`: all `admin_*` functions.
- `src/modules/admin/context.ts` (`adminContext`), `admin-api.admin.ts` (calls the functions), `invite-code.ts`.
- `src/lib/db-error.ts` (SQL error to API error), `src/lib/cursor.ts` (paging), `src/lib/idempotency.admin.ts` (a `keep` option).
- Routes under `src/app/api/v1/c/[slug]/admin/`: `settings`, `stats`, `invites`, `invites/[id]`, `verification-requests`, `verification-requests/[id]/decision`, `members`, `members/[membershipId]`, `audit-logs`.
- Contracts: `src/contracts/admin.ts` (extended: invite `status`, audit `actor_name`, stats, a `college` block in settings).
- Used next by: R4's admin console screens (PR #9), R5's admin journeys (Day 3), R2 Day 4 (notifications for decisions).

## 6. Request/response and data flow (diagram or numbered trace)

Approve a waiting student:

1. Screen sends `POST /api/v1/c/alpha/admin/verification-requests/{id}/decision` with `{ "decision": "approved" }` and an `Idempotency-Key`.
2. `adminContext` checks origin, login, admin role and the rate limit.
3. `withIdempotency` looks for an earlier answer for this key.
4. `admin_decide_verification` runs in one transaction: assert admin, lock the request, refuse if not pending, refuse if it is the admin's own, set the membership active at level 2, mark the request approved, write the audit row `member.approved`.
5. The answer `{ request, membership }` is stored and returned.
6. The student, on their next call, is an active member.

## 7. API methods, endpoints, schemas, status codes

See docs/API_CONTRACT.md section 8 for the full table. Codes used: 200, 201 (create invite), 400 `VALIDATION_FAILED`, 401, 403 (`FORBIDDEN`, `MEMBERSHIP_NOT_ACTIVE`, `TENANT_SUSPENDED`), 404 `NOT_FOUND`, 409 `CONFLICT`, 422 `IDEMPOTENCY_KEY_REUSED`, 429.

## 8. Database changes and relationships

Only functions (no new table). They read and write `college_settings`, `invite_codes`, `verification_requests`, `memberships`, `audit_logs` and read `profiles` and `auth.users` (for the applicant email in the queue only). Details: docs/DATABASE.md section 13.

## 9. Authentication / authorization behaviour

- Only an active `college_admin` of that college. Students and moderators: 403. Pending and suspended members: 403 `MEMBERSHIP_NOT_ACTIVE`. Another college's admin: 404.
- No admin can read the application tracker or private data of a student: these endpoints do not touch them.
- The member list has no email addresses. The queue shows the applicant email because the admin must know who to approve.
- A removed member can join again with a valid invite. To keep someone out, suspend them.

## 10. Errors and edge cases

- A refused call writes no audit row (tests count the rows).
- Stale queue item: 409. Unknown or foreign id: 404. Bad id format: 404.
- Self changes: 403. Only admin and demotion: 409 `LAST_ADMIN` message.
- `%` and `_` in a member search are plain characters.
- A retry of "create invite" returns `code: null`: the admin must revoke and create a new one if the code was lost.
- Audit time and cursor keep microseconds, so paging is exact.
- Not done: notifications to the applicant after a decision (needs the Day 4 notification table). `expires_at` of a pending request does not expire automatically yet.

## 11. Tests: what exists and how to run them (exact commands)

```
pnpm db:test              # 007_admin.test.sql: 93 checks
pnpm test:integration     # tests/integration/admin.test.ts and the permission matrix
pnpm verify
```

Seen on 2026-10-31:

- `pnpm db:test`: Files=7, Tests=270, Result: PASS.
- `pnpm test:integration`: 338 passed, 2 skipped on purpose, run twice in a row.
- Unit tests 193 passed, lint, typecheck, format and build passed (run directly because `pnpm` needs Node 24.15 and this PC has 24.10).
- Every admin endpoint is tried as: not signed in, pending, suspended, student, moderator, admin of another college, and admin. The student gets 403 on all of them.
- Mutation checks: I removed one rule at a time in the running database. Without the admin role check, pgTAP failed (for example "a student is FORBIDDEN"). Without the audit write, many audit-count checks failed. Without the "own request" rule, "an admin cannot approve their own request" failed. Without the last-admin rule, three checks failed. After `pnpm db:reset` everything passed again.

## 12. How to debug common failures

- 403 `FORBIDDEN` for a real admin: check `memberships.role` and `status` for that user and college.
- 404 where you expect 403: the person is not a member of that college.
- 409 on a decision: reload the queue, somebody decided it already.
- `LAST_ADMIN`: make another person admin first, then change this one.
- Paging gives a 400 on `cursor`: send back the exact `next_cursor` text.
- A test fails with 429: the admin limit is 120 per minute per person. The tests clear the counters before each test.

## 13. Security considerations

- The service role runs these functions, so each one checks the actor itself. The actor comes from the verified login.
- Invite codes: random, hashed, shown once, never in the audit log or the idempotency table.
- Audit metadata holds ids and short facts. Reasons stay in `memberships.status_reason` and `verification_requests.decision_reason`.
- IDOR (changing an id in the URL): every function filters by the college id, so another college's ids give 404.
- No new packages.
- AI wrote security sensitive SQL and routes. A second human review is still needed (AI rule 7).

## 14. Alternatives and trade-offs

- Letting admins write the tables directly through RLS: fewer functions, but the audit row and the rules (self change, last admin) would be spread over the client. One function per action keeps the rules in one place.
- Reading invites with the admin's own login (RLS) instead of a function: simpler, but the invite `status` would be worked out in TypeScript. The function keeps it in SQL.
- Showing emails in the member list: handy, but unneeded and a privacy cost. Left out on purpose.
- Notifications in the same transaction: planned for Day 4 when the table exists.

## 15. What AI generated or suggested (prompts used, summary)

AI (Claude Code) wrote the migration, routes, tests, docs and this note, from the R2 Day 3 prompt, docs/API_CONTRACT.md, docs/AUTH_AND_TENANCY.md, docs/FEATURES_AND_JOURNEYS.md and R4's draft admin screens (to match the data they need). It proposed the four mutation checks.

## 16. What a human verified (how: ran tests, read code, checked docs, tried to break it)

Done in the session with real output: the database tests, the integration tests twice, unit tests, build, the four mutation checks.

Not done yet (open on purpose):

- A person has not read the SQL functions line by line.
- No second reviewer.
- R4 has not connected the screens, so the shapes are only tested by the contract tests and the integration tests.
- Not run in CI yet (the pull request does that).

## 17. What each teammate can now explain/implement independently

Planned, not yet confirmed: explain why two locks are used, call an admin endpoint with curl, add a new admin action (function, route, contract, test, audit row), and explain keyset paging.

## 18. Further learning resources

- PostgreSQL docs: `SELECT ... FOR UPDATE`, row comparison (`(a, b) < (x, y)`). Supabase docs: Row Level Security.

## 19. Docs updated because of this (per trigger table)

- docs/API_CONTRACT.md: section 8. docs/DATABASE.md: section 13. Fixtures and contracts in `src/contracts`.

## 20. Walkthrough drill: passed by / date

not yet
