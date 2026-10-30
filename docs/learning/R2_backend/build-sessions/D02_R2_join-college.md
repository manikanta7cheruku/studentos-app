# Join a college (invite code, college email, manual) - build session

| Field | Value |
|---|---|
| Date / Author (role) | 2026-10-31 / R2 Backend and database |
| Linked task / ADR / PR | R2-D2-2 / ADR-003, ADR-005 / the pull request for branch r2/d2-join |
| Related docs | docs/API_CONTRACT.md (TEN-01 to TEN-05), docs/AUTH_AND_TENANCY.md section 3, docs/DATABASE.md sections 2.1 and 9, docs/learning/templates/_EXAMPLE.md |

## 1. What we are learning and why it is needed

A signed-in person is not yet part of any college. They join one of three ways: an invite code from the college, an email address on the college's domain, or a manual request that an admin decides later. This task builds those three paths and the rules that keep them safe: a code cannot be used more times than allowed, an email address must really belong to the person, and every join leaves a record.

## 2. What problem it solves

- Without limits an invite code shared in a group chat would let anyone in. We count uses, set an end date, allow revoking, and slow down guessing.
- Two people clicking at the same moment must not both take the last use of a code.
- A person must never be able to give themselves a role, a status or a trust level. The join functions decide those, not the request.
- The admin needs to see who joined and how (audit log) and who is waiting (verification requests).

## 3. Concepts and terminology (short glossary)

- Membership: the link between a person and a college, with role, status (`pending`, `active`, ...) and verification level (0 to 3).
- Verification level: 1 = claimed but not proven, 2 = proven by the college (domain or approved), 3 = document checked (not built).
- Invite code: a secret string. We store only its HMAC hash. The plain code is shown once when an admin creates it (Day 3).
- Atomic: all steps happen or none do. A Postgres function is one transaction.
- Idempotency key: a random id the screen sends with a create request. If the same request arrives twice (double click, retry), the second one gets the first answer back.
- Enrolment number: the student's college id number. We store a hash and the last 4 characters only.
- Public view: a database view that shows a few safe columns to people who are not signed in.

## 4. How it works internally (appropriate depth)

- All join logic is in SQL functions that only the server (service role) may call: `join_prepare`, `redeem_invite`, `submit_manual_join`, `email_domain_allowed`, `complete_email_domain_join`. The server checks who the user is first, then passes the user id.
- `join_prepare` does the checks every join shares: the college exists and is open (`NOT_FOUND`, `TENANT_SUSPENDED`), the college allows this method (`FORBIDDEN`), the person is not already active or pending (`CONFLICT`), and a person who was suspended or rejected cannot come back by themselves (`FORBIDDEN`). Someone who left can join again and reuses their old row.
- Invite use is ONE `UPDATE ... WHERE used_count < max_uses AND revoked_at IS NULL AND expires_at > now() RETURNING`. If it changes no row, a second query only decides which error to give (invalid, expired or exhausted). Two people racing for the last use: Postgres lets one update win and the other sees zero rows.
- A college that has switched off invite codes answers `INVITE_INVALID`, the same as a wrong code, so it does not reveal that it exists.
- Manual: the enrolment number is normalised, hashed with the college slug, stored with its last 4 characters, and the person becomes `pending` at level 1. A `verification_requests` row is created for the admin. One pending or active member per enrolment number and college (a unique index).
- College email: step `start` checks the address is on a verified domain of this college before any mail is sent (so the endpoint cannot be used to send mail to anyone) and then sends a code. Step `complete` checks the code on a throw-away client that keeps no session, takes the domain from the address Supabase confirmed, and the SQL function checks the domain again. Result: `active`, level 2.
- Every join writes an audit row through `write_audit_log` (metadata holds the method and ids, never the code or the enrolment number).
- Idempotency: `Idempotency-Key` (UUID) is required on TEN-03 and TEN-04. We keep the first successful answer for 24 hours. Same key with another body gives 422.
- Brute force guard: 10 invite or manual attempts per hour per person.
- Public branding (TEN-01) reads the view `public_college_branding` with the anon key. The view shows 8 columns of active colleges. `anon` has no other access to anything.

## 5. How it is used in StudentOS (files/modules)

- `supabase/migrations/20261031020000_join_invites_manual_domain.sql`: tables `invite_codes`, `verification_requests`, `idempotency_keys`, the view, the functions.
- `src/modules/tenancy/join.admin.ts`: calls the functions, maps SQL errors to API codes, hashes codes and enrolment numbers.
- `src/lib/idempotency.admin.ts`: reads the header and replays or stores answers.
- Routes: `src/app/api/v1/c/[slug]/join/invite|manual|email-domain/route.ts`, `src/app/api/v1/colleges/public/[slug]/route.ts`.
- Reuses from Day 2 auth: `checkCode` and `requestOtp` in `src/modules/auth/otp.ts`.
- Used next by: R2 Day 3 admin endpoints (create invites with `hashInviteCode`, decide requests), R3 sign in and join screens, R5 e2e tests.

## 6. Request/response and data flow (diagram or numbered trace)

Redeem an invite code:

1. Screen sends `POST /api/v1/c/alpha/join/invite` with `{ "code": "..." }` and an `Idempotency-Key` header.
2. Handler: same-origin check, body check (strict, trims and upper-cases the code), key check, `getCurrentUser`.
3. Idempotency: have we seen this user, key and route? If yes with the same body, return the stored answer. With a different body, 422.
4. Limit: 10 tries per hour for this person.
5. `redeem_invite` runs in one transaction: `join_prepare` checks, the single UPDATE takes one use, the membership row is written, a verification request is added if the code grants only `pending`, an audit row is written.
6. The answer `{ membership: { id, status, verification_level, verification_method } }` is stored for replay and returned.
7. If any step raised an error, the whole transaction is undone, so no use of the code is lost.

## 7. API methods, endpoints, schemas, status codes

- TEN-01 GET `/colleges/public/{slug}`: 200 branding, 404 `NOT_FOUND` (unknown, not active, or a bad slug).
- TEN-02 GET `/c/{slug}/me/membership`: 200 (see the auth note).
- TEN-03 POST `/c/{slug}/join/invite`: 200; 400 `INVITE_INVALID`; 410 `INVITE_EXPIRED`; 409 `INVITE_EXHAUSTED`; 409 `CONFLICT`; 403 `TENANT_SUSPENDED`; 403 `FORBIDDEN` (suspended or rejected before); 404; 422 `IDEMPOTENCY_KEY_REUSED`; 429.
- TEN-04 POST `/c/{slug}/join/manual`: 200 pending; 409 `CONFLICT` (already pending, or the number is used); 403 `FORBIDDEN` (method off); 400.
- TEN-05 POST `/c/{slug}/join/email-domain`: start 200 `{ sent, retry_after_seconds }`; complete 200 `{ membership }`; 400 `VALIDATION_FAILED` for an address that is not a college address; 400 `OTP_INVALID`; 410 `OTP_EXPIRED`; 409 `CONFLICT`; 429.
- Schemas: `src/contracts/tenant.ts`.

## 8. Database changes and relationships

- `invite_codes(college_id, code_hash UNIQUE, max_uses, used_count, expires_at, revoked_at, grants_status)`. Admins can read the table except the hash column. No client writes.
- `verification_requests(membership_id, college_id, method, status, submitted_data, ...)`. One pending request per membership (partial unique index). Members read their own, admins read their college's.
- `idempotency_keys(user_id, key, route, request_hash, response, status_code, expires_at)`. No client access.
- `memberships`: new partial unique index on (`college_id`, `enrollment_hash`) for pending and active members.
- View `public_college_branding`. Granted to `anon` and `authenticated`.
- Functions listed in section 4. `idempotency_purge()` is for a scheduled clean up job (R5 later).

## 9. Authentication / authorization behaviour

- All four join routes except TEN-01 need a signed-in user. Pending members can call join endpoints and TEN-02, but `requireMember` refuses them everywhere else with `MEMBERSHIP_NOT_ACTIVE`.
- The request can never set `role`, `status` or `verification_level`: bodies are strict and the SQL decides.
- The database function runs as the service role, but only after `getCurrentUser` proved who is calling. The user id comes from the verified token, never from the body.
- Someone who is suspended or rejected cannot rejoin alone, even with a valid code.

## 10. Errors and edge cases

- A refused join does not use up an invite (the transaction is undone). Tests check `used_count`.
- A code meant for Alpha used on Beta gives `INVITE_INVALID`, not "this is an Alpha code".
- The same enrolment number in two colleges is allowed. In one college it is not (`CONFLICT`). This also tells a person that the number is in use. We accepted that small leak because only signed-in people can try.
- A person who signed in with their college address still goes through `start` and `complete` once. A shortcut for that case can come later.
- The proof creates a second Supabase account for the college address if the person's main address is different. We leave it (deleting it could remove a real person's account). Open question for R2 and R5: clean up unused accounts later.
- If the idempotency record cannot be saved after a successful join, the join still counts and the error is only logged.
- Invite end date `expires_at` is a point in time. Tests make a code expired by setting it in the past.

## 11. Tests: what exists and how to run them (exact commands)

```
pnpm db:reset && pnpm db:test      # 006_join: 59 checks, plus 001 updated for the public view
pnpm test:integration              # tests/integration/join.test.ts
pnpm verify
```

Seen on 2026-10-31:

- `pnpm db:test`: Files=6, Tests=177, Result: PASS.
- `pnpm test:integration`: Tests 46 passed (46) (25 auth and 21 join).
- `pnpm verify`: all five steps passed (186 tests, build ok, eight routes).
- Concurrency test, as required by the task: 10 people redeem a code with 3 uses. Exactly 3 get 200, 7 get 409 `INVITE_EXHAUSTED`, `used_count` is 3, exactly 3 memberships exist.
- pgTAP and Vitest tests exist for each of the three methods, and for each error code in section 7.
- Mutation check: I removed the `used_count < max_uses` condition from `redeem_invite` in the running database. Then pgTAP failed ("the next person gets INVITE_EXHAUSTED"), and two integration tests failed (the error codes and the concurrency test). After `pnpm db:reset` everything passed again.

## 12. How to debug common failures

- `CONFLICT` on a first join: the person already has a pending or active membership, or the enrolment number is in use. Check `memberships` for that user and college.
- `INVITE_INVALID` for a right-looking code: the code was hashed with a different `APP_HASH_SECRET`, the code was typed with a different spelling, the college does not take codes, or the code belongs to another college.
- A join test fails in the middle: rows from earlier runs may remain. Run `pnpm db:reset`.
- 400 `VALIDATION_FAILED` on `Idempotency-Key`: the screen must send a new UUID for each new request, and the same UUID when it retries.
- `permission denied for function`: the function is only for the service role. Call it from a `*.admin.ts` file.

## 13. Security considerations

- Brute force: 10 invite or manual tries per hour per person, codes are random and hashed.
- Leak of an invite code: revoke it (Day 3 endpoint), the audit log shows who joined with it (`metadata.invite_id`), and the rate limits slow abuse.
- The college email start step cannot be used to send mail to arbitrary addresses: the domain must be registered and verified for the college, and the code request limits still apply.
- No plain code, enrolment number or hash in audit rows or responses (tests check this).
- No new packages in this task.
- AI wrote security sensitive SQL and routes. A second human review is still needed (AI rule 7).

## 14. Alternatives and trade-offs

- Join logic in TypeScript with several queries vs one SQL function: the function is atomic and easy to test with pgTAP, but business rules live in SQL.
- Proving a college address with Supabase Auth on a throw-away client vs our own mail sender: no new provider and no new package, but it may leave an unused account (section 10).
- Idempotency stored after the work vs in the same transaction: simpler. A crash between the two could allow one repeat, which the unique rules (membership, enrolment) then refuse.
- Showing `NOT_FOUND` for members of other colleges vs `FORBIDDEN`: the first never confirms that a college exists.

## 15. What AI generated or suggested (prompts used, summary)

AI (Claude Code) wrote the migration, the pgTAP file, the TypeScript, the integration tests and this note, from the R2 Day 2 prompt, docs/API_CONTRACT.md, docs/AUTH_AND_TENANCY.md and docs/DATABASE.md. It also proposed the mutation check on the invite guard.

## 16. What a human verified (how: ran tests, read code, checked docs, tried to break it)

Done in the session with real output: `pnpm db:test`, `pnpm test:integration`, `pnpm verify`, the mutation check.

Not done yet (open on purpose):

- A person has not read the SQL functions and routes line by line.
- No second reviewer has looked at the join SQL.
- Not tried by hand in a browser or with curl.
- Not run on staging (R5 sets up staging today).

## 17. What each teammate can now explain/implement independently

Planned, not yet confirmed: explain why the invite use is one UPDATE, run the concurrency test, add a new join method (a new function plus a route plus tests), and explain why the request can never set a role.

## 18. Further learning resources

- PostgreSQL docs: UPDATE ... RETURNING, advisory locks, partial indexes, `SECURITY DEFINER`.
- docs/learning/templates/_EXAMPLE.md (the invite example this task follows).

## 19. Docs updated because of this (per trigger table)

- docs/API_CONTRACT.md: section 7.
- docs/DATABASE.md: section 12.
- docs/DEV_SETUP.md: local environment and integration tests.
- docs/CHANGELOG.md.

## 20. Walkthrough drill: passed by / date

not yet
