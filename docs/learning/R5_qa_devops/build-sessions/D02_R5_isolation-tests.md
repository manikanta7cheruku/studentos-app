# College isolation and permission tests - build session

| Field | Value |
|---|---|
| Date / Author (role) | 2026-10-31 / R5 Testing and DevOps |
| Linked task / ADR / PR | R5-D2-1 / ADR-003, ADR-007 / https://github.com/manikanta7cheruku/studentos-app/pull/17 |
| Related docs | docs/AUTH_AND_TENANCY.md sections 4 and 5, docs/TESTING.md section 6, docs/CI_CD_AND_ENVIRONMENTS.md section 3 |

## 1. What we are learning and why it is needed

The most important rule of StudentOS is that one college can never see another college's data. This task builds the automatic gates that check that rule on every pull request, and that fail the build if someone adds a table without row level security (RLS) or gives a role too many rights.

## 2. What problem it solves

Rules written in a document are forgotten. A gate in CI is not. Without it, a new table or a new endpoint could quietly leak data between colleges, and nobody would notice until a student did.

## 3. Concepts and terminology (short glossary)

- Gate: a check that must pass before a merge.
- pgTAP: tests that run inside Postgres. They check tables, rights and policies directly.
- Permission matrix: a table of "who may call what". Rows are endpoints, columns are kinds of callers, cells are the expected result.
- Principal: a kind of caller (not signed in, pending member, student, moderator, admin, student of another college, ...).
- PostgREST: the HTTP API that Supabase puts in front of the database. Anyone with the public anon key can talk to it. It bypasses our Next.js code, so it must be safe on its own.
- Mutation check: break the system on purpose and see the test fail. A test that never failed proves nothing.
- Skipped test: a test that is not run on purpose. We skip calls that would change data.

## 4. How it works internally (appropriate depth)

- **Database job in CI** starts only Postgres (the other Supabase services are switched off with `-x`), applies the migrations and the seed, and runs `pnpm db:test`. The pgTAP file `001_rls_enabled` fails if any table in `public` has RLS off, has no policy, or is readable by `anon`.
- **Integration job in CI** starts the stack with login, API and mailbox, writes `.env.local` with `pnpm env:local`, and runs `pnpm test:integration`.
- **Permission matrix** (`permission-matrix.test.ts`): signs in 8 seed users and calls (1) `requireMember` with four guard levels, and (2) six real endpoints. Every row must list all nine principals, or a separate test fails. To cover a new endpoint, R2 and R5 add one row.
- **Database API exposure** (`postgrest-exposure.test.ts`): sends raw HTTP requests to the database API with the anon key and with real user tokens. It tries to read other colleges, to make a student an admin, to write the audit log, to call server-only functions and to read the invite code hash. All must be refused or return nothing.
- The expected results come from the matrix in docs/AUTH_AND_TENANCY.md section 4.

## 5. How it is used in StudentOS (files/modules)

- `.github/workflows/ci.yml` (jobs `database` and `integration`), `scripts/write-local-env.mjs`
- `tests/integration/permission-matrix.test.ts`, `tests/integration/postgrest-exposure.test.ts`, `tests/integration/helpers.ts`
- Existing: `supabase/tests/database/001_rls_enabled.test.sql` and `002_cross_college_isolation.test.sql`
- Used next by: every R2 task from Day 3 on (new endpoints add rows to the matrix), R4 and R3 indirectly (the sign in codes and roles they use are tested here).

## 6. Request/response and data flow (diagram or numbered trace)

An attacker skips our app and calls the database API as an Alpha student:

1. `GET /rest/v1/memberships` with the student's token.
2. Postgres runs the policy `user_id = auth.uid() or is_college_admin(college_id)`. Only the student's own row comes back.
3. `PATCH /rest/v1/memberships` with `{ "role": "college_admin" }`: the student has no UPDATE right on the table, so the answer is 401/403.
4. The test asserts both. If someone later grants UPDATE, step 3 succeeds and CI turns red.

## 7. API methods, endpoints, schemas, status codes

Checked in the matrix: TEN-01 (public), TEN-02, AUTH-03, TEN-03, TEN-04, TEN-05. Expected statuses per caller are in the test file. Examples: not signed in is 401; a pending member joining again is 409 `CONFLICT`; a suspended member is 403 `FORBIDDEN`; a student of another college asking for member data is 404 `NOT_FOUND` (the college is never confirmed).

## 8. Database changes and relationships

None. The tests read the schema and the seed.

## 9. Authentication / authorization behaviour

The tests prove: not signed in = no table access except the public branding view; signed in = own college only; admin = own college only, never another; server-only functions are not callable by any signed-in user; the invite code hash is never readable; clients cannot write memberships or the audit log.

## 10. Errors and edge cases

- Mail cooldown: the local mail service allows one code per address per second. Test files that run one after the other must retry a 429. This broke CI once.
- Unfiltered `DELETE` through PostgREST returns 400 before any permission check, so the probe adds a filter.
- Some calls would change data (a manual join for a student of another college). They are marked `skip` in the matrix and covered by other tests.
- A found bug: logout validated the query string before checking who was calling, so a signed-out caller got 400, not 401. Fixed.

## 11. Tests: what exists and how to run them (exact commands)

```
pnpm db:start
pnpm db:reset
pnpm db:test             # pgTAP: 177 checks
pnpm test:integration    # 171 passed, 2 skipped on purpose
```

Seen on 2026-10-31:

- Locally, twice in a row: `Tests 171 passed | 2 skipped (173)`.
- In CI on the pull request: Database tests, Integration tests, Build, Format check, Lint, Typecheck, Unit tests all passed.
- Mutation 1: `create table public.leaky (id int, college_id uuid)` with no RLS. `pnpm db:test` failed 5 checks (RLS on every table, a policy on every tenant table, anon has no table rights). So "a new table without RLS makes CI fail" is shown.
- Mutation 2: grant UPDATE on `memberships` to signed-in users plus an update policy. pgTAP failed 4 checks and the database API tests failed ("cannot make themselves admin"). After `pnpm db:reset` all passed again.

## 12. How to debug common failures

- Matrix cell fails: read the principal and the endpoint in the test name, then check `docs/AUTH_AND_TENANCY.md` section 4 to see which side is wrong, the code or the expected value.
- `OTP request failed: 429` in a helper: the mail cooldown. The helper retries; if it still fails, wait a few seconds or run `pnpm db:reset`.
- Integration job fails in CI but passes locally: look for timing (files running faster in CI) and for state left by an earlier file.
- `supabase start` is slow in CI: check the `-x` list.

## 13. Security considerations

- The integration tests use the service role and delete rows. They refuse to run against any URL except the local stack.
- `.env.local` is written at run time from the local demo keys. Nothing secret is stored in the repository.
- AI wrote security tests. Mutation checks were run to see them fail, as AI rule 7 asks.

## 14. Alternatives and trade-offs

- Run only pgTAP: faster, but it would not catch a wrong grant seen through the HTTP API or a wrong guard in TypeScript.
- Generate the matrix from the OpenAPI file: the plan in docs/TESTING.md. OpenAPI is still a skeleton, so a hand-written table is used for now.
- Start every Supabase service in CI: simpler, but several minutes slower.

## 15. What AI generated or suggested (prompts used, summary)

AI (Claude Code) wrote the tests, the workflow jobs, the env script and this note, using the R5 Day 2 prompt, docs/AUTH_AND_TENANCY.md and docs/TESTING.md. It also proposed the two mutation checks.

## 16. What a human verified (how: ran tests, read code, checked docs, tried to break it)

Done in the session with real output: both test commands, CI on the pull request, the two mutation checks.

Not done yet (open on purpose):

- A person has not compared the matrix cells with docs/AUTH_AND_TENANCY.md one by one.
- A second reviewer has not reviewed the pull request.
- The Day 3 admin endpoints are not in the matrix yet (they do not exist).

## 17. What each teammate can now explain/implement independently

Planned, not yet confirmed: add a row for a new endpoint, explain why the database API must be tested directly, and run a mutation check.

## 18. Further learning resources

- Supabase docs: Row Level Security, Database testing. PostgREST docs: roles and privileges (check the official pages).

## 19. Docs updated because of this (per trigger table)

- docs/DEV_SETUP.md: `pnpm env:local` (in the close-out pull request).
- docs/TESTING.md: not changed yet.

## 20. Walkthrough drill: passed by / date

not yet
