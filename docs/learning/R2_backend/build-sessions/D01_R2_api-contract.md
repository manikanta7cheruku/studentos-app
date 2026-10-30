# Contracts and sample data - build session

| Field | Value |
|---|---|
| Date / Author (role) | 2026-10-31 / R2 Backend and database |
| Linked task / ADR / PR | R2-D1-2 / ADR-001 / https://github.com/manikanta7cheruku/studentos-app/pull/11 |
| Related docs | docs/API_CONTRACT.md (sections 1 to 4 and the new section 6), docs/ARCHITECTURE.md ("How frontend and backend work at the same time") |

## 1. What we are learning and why it is needed

A contract is a written promise: "this request looks like this, and the answer looks like that". We wrote contracts as Zod schemas in `src/contracts`, plus sample requests and answers (fixtures) for Days 2 to 4. R3 and R4 can build screens from the samples today, before R2 has built any endpoint.

## 2. What problem it solves

Without a contract, the frontend waits for the backend, or both sides guess and the screens break at the end. With one shared definition, the frontend uses the samples now, the backend validates against the same schemas later, and a test fails if either side drifts.

## 3. Concepts and terminology (short glossary)

- Zod schema: code that describes a shape and checks real data against it.
- Envelope: the wrapper around every answer. Success is `{ data, meta }`. Error is `{ error: { code, message, details, request_id } }`.
- Fixture: a sample JSON file for one request or one answer.
- Strict object: a schema that refuses unknown keys. Used so a client cannot slip in `role` or `status`.
- Discriminated union: one field (`decision`, `step`) decides which shape applies.
- Error code: a stable word like `INVITE_EXPIRED` that the screen can map to a friendly message.
- IDEM: an endpoint that needs an `Idempotency-Key` header so a double click does not create two things.

## 4. How it works internally (appropriate depth)

- `common.ts` holds the shared parts: ids, dates, email (trimmed and lower-cased), the envelopes, the 23 error codes and their HTTP status, and the pagination query (limit 1 to 50, default 20).
- Each area file builds on those: `auth.ts`, `tenant.ts`, `admin.ts`, `profile.ts`, `engagement.ts`.
- Request bodies are strict objects. Responses are plain objects.
- Rules that cross fields use `refine` or `superRefine`. Example: rejecting a request needs a reason of at least 5 characters, suspending a member needs a reason, a report action other than dismiss needs a note.
- The test reads every file in `fixtures`, finds the schema from the file name (`<operation>.<kind>.json`) and checks it.

## 5. How it is used in StudentOS (files/modules)

- `src/contracts/*.ts` and `src/contracts/index.ts` (import from `@/contracts`).
- `src/contracts/fixtures/*.json`: 87 samples. Ids match the seed users in `supabase/seed.sql`.
- `src/contracts/contracts.test.ts`: the checks.
- `docs/API_CONTRACT.md` section 6: map of the files and the choices R2 made.
- Used next by: R3 (mock data and API client types), R4 (admin screens), R2 (route handlers validate with the same schemas), R5 (contract tests against real endpoints on Day 3).

## 6. Request/response and data flow (diagram or numbered trace)

Example: a student redeems an invite code (TEN-03).

1. The screen sends `{ "code": "alpha-7k3q" }`.
2. The route handler (Day 2) parses it with `joinInviteBody`. The code becomes `ALPHA-7K3Q`. Unknown keys such as `role` are refused with `VALIDATION_FAILED`.
3. The service redeems the code in one SQL step and creates the membership.
4. The handler returns `{ data: { membership: {...} }, meta: { request_id } }`, checked against `joinInviteResponse`.
5. If the code is too old, it returns the `INVITE_EXPIRED` error envelope (HTTP 410). The sample is `ten-03.error-invite-expired.json`, so the screen can be built first.

## 7. API methods, endpoints, schemas, status codes

Covered operations: AUTH-01 to 04, TEN-01 to 05 and 07, PRF-01 to 03, ADM-03 and 05 to 10, NTF-01 and 02, ANN-01 and 02, RPT-01 to 03, WL-01. The path, method and who may call each one are in docs/API_CONTRACT.md section 3. `errorHttpStatus` in `common.ts` maps every error code to its status.

## 8. Database changes and relationships

None in this task. Field names and lengths follow docs/DATABASE.md so the route handlers can map rows to responses directly. Tables for notifications, announcements and reports come on Days 3 and 4.

## 9. Authentication / authorization behaviour

The schemas do not grant anything. They support the rules: clients cannot send `role`, `status` or `verification_level`; admins change a member's role only through ADM-09; a rejection must have a reason. The route handlers still check login, membership, role and object on the server.

## 10. Errors and edge cases

- `VALIDATION_FAILED` must carry `details.fields[]`; the schema enforces that.
- Email is trimmed and lower-cased before it is checked.
- Audit log ids are strings because they are 64 bit numbers.
- `GET me/membership` returns `membership: null` for someone who has not joined, so the landing screen does not need to treat a 404 as normal.
- Shapes that are proposals (AUTH-04, notifications, announcements, reports, waitlist) may change when those endpoints are built. They are listed in section 6 of API_CONTRACT.md.

## 11. Tests: what exists and how to run them (exact commands)

```
pnpm vitest run src/contracts
pnpm test
pnpm verify
```

Seen on 2026-10-31: `pnpm vitest run src/contracts` gave 104 passed. `pnpm verify` passed all five steps (167 tests, build ok).

What the tests check: each of the 87 fixtures passes its schema, the error code in an error file name matches the code inside, every one of the 23 error codes has a sample, and 13 more tests check clean-up and refuse bad input (unknown error code, wrong OTP length, `role` sent by a client, reject without reason, empty patch, bad handle, 21 interests, skill level 6, http link, duplicate skill, report action without note, waitlist without consent, pagination limits).

Mutation checks: the rejection reason in `adm-07-reject.request.json` was cut to "no" and the matching test failed. An error code in `ten-03.error-invite-expired.json` was renamed to `INVITE_GONE` and the test failed. Both were restored and all 104 passed again.

## 12. How to debug common failures

- "no schema registered for <file>": the new fixture's operation name is not in the `operations` map in `contracts.test.ts`.
- "missing fixture <op>.<kind>.json": a schema is registered but its sample file does not exist.
- A fixture fails with an issue list: read the `path` in the message, it names the field.
- Email checks fail on spaces or capitals in a fixture: the schema trims and lower-cases, so check the value, not the case.

## 13. Security considerations

- Strict bodies block mass assignment (sending extra fields like `role`).
- Samples contain no secrets and no real people. Emails end in `.test`. The invite code in the sample is made up.
- New package: `zod` 4.6.7. Checked with `pnpm view zod version license`: MIT.
- Contracts are not security. The server and RLS still decide access.

## 14. Alternatives and trade-offs

- OpenAPI first, Zod second: more tooling. The docs plan Zod as source of truth with OpenAPI generated from it later (not done yet; `docs/openapi.v1.yaml` is still a skeleton and does not match the Zod schemas yet).
- One big schema file vs several: several files keep pull requests small and conflicts rare.
- Writing fixtures by hand vs generating them from schemas: hand-written samples read like real answers and make good mock data, and the test keeps them honest.

## 15. What AI generated or suggested (prompts used, summary)

AI (Claude Code) wrote the schemas, a one-time script that produced the 87 fixture files (not kept in the repo), the test and the docs section. It used the R2 Day 1 prompt and docs/API_CONTRACT.md sections 1 to 4 as context. It also proposed the two mutation checks.

## 16. What a human verified (how: ran tests, read code, checked docs, tried to break it)

Done in the session, with real output seen: `pnpm vitest run src/contracts` (104 passed), `pnpm verify`, the two deliberate breaks.

Not done yet (open on purpose):

- A person has not read every schema against docs/API_CONTRACT.md line by line.
- R3 has not confirmed they can read and use the contracts (the done-when item of this task).
- R4 has not checked that the admin shapes fit the admin screens.
- `docs/openapi.v1.yaml` was not regenerated.

## 17. What each teammate can now explain/implement independently

Planned, not yet confirmed by a teammate: import a schema from `@/contracts`, load a fixture as mock data, add a new operation (schema, fixture files, one line in the test map), and name where each error code appears.

## 18. Further learning resources

- Zod official documentation (version 4): objects, `strictObject`, `refine`, `discriminatedUnion`, `pipe`.
- docs/API_CONTRACT.md sections 1 and 2 (envelopes and error codes).

## 19. Docs updated because of this (per trigger table)

- docs/API_CONTRACT.md: new section 6 (where the contracts live, choices R2 made).
- docs/openapi.v1.yaml: not updated, still a skeleton.

## 20. Walkthrough drill: passed by / date

not yet
