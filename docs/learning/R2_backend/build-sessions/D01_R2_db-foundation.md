# Database foundation (tenants, members, audit) - build session

| Field | Value |
|---|---|
| Date / Author (role) | 2026-10-31 / R2 Backend and database |
| Linked task / ADR / PR | R2-D1-1 / ADR-002, ADR-003 / https://github.com/manikanta7cheruku/studentos-app/pull/10 |
| Related docs | docs/DATABASE.md (sections 2.1, 4, 9, 11), docs/AUTH_AND_TENANCY.md, docs/learning/AI_RULES.md |

## 1. What we are learning and why it is needed

We built the first part of the StudentOS database: colleges (tenants), their email domains and settings, user profiles, memberships (who belongs to which college, with what role and trust level) and the audit log. Every feature after this reads or writes these tables, and the rule "one college can never see another college's data" is enforced here, inside the database.

## 2. What problem it solves

If isolation lived only in the app code, one forgotten check would leak data between colleges. Here the database itself refuses. Even a bug in the API cannot read Beta rows while signed in as an Alpha student. The audit log gives admins a history nobody can rewrite.

## 3. Concepts and terminology (short glossary)

- Tenant: one college. Each college is its own private space.
- Row Level Security (RLS): a Postgres feature. Each row is checked against a rule (a policy) every time someone reads or writes it.
- Policy: the rule. Example: you can read a membership row if it is yours, or if you are an admin of that college.
- `auth.uid()`: the id of the signed-in user, taken from the login token.
- Role (Postgres role): `anon` (not signed in), `authenticated` (signed in), `service_role` (our server, bypasses RLS).
- SECURITY DEFINER function: a function that runs with its owner's rights. We use it for helpers so a policy can look at `memberships` without going round in circles.
- `search_path`: where Postgres looks for table names. We fix it to empty in definer functions so nobody can trick them with a fake table.
- Migration: a SQL file that changes the database. Never edit one after it is merged. Add a new one.
- Seed: fake data loaded on `db reset` for local work and tests.
- pgTAP: a test tool that runs inside Postgres and prints ok / not ok.
- Append only: rows can be added but never changed or deleted.

## 4. How it works internally (appropriate depth)

- Every table has RLS on. A table with RLS on and no policy returns nothing, so a forgotten policy fails closed.
- On top of RLS we also remove table privileges. `anon` has no rights on any table. `authenticated` has only SELECT on most tables, plus narrow column grants for editing your own profile and your college's settings. Nobody writes `memberships` from the client at all.
- `memberships.role`, `status` and `verification_level` can change only through the server (service role). This blocks the attack "send role=admin in a request" by design.
- Helper functions: `auth_member_colleges(min_level)` returns the colleges where you are an `active` member with at least that level. `is_college_admin(cid)` and `is_moderator_or_admin(cid)` answer yes/no. `auth_shares_college_with(user)` is used so classmates can see each other's visible profiles.
- A trigger on `memberships` stops the last active admin of a college from being removed, demoted or suspended. It locks the college row so two admins cannot remove each other at the same moment.
- `audit_logs`: no INSERT, UPDATE or DELETE right for anyone (not even the service role). Rows are added only by `write_audit_log(...)`, a definer function that only the service role may call. Triggers also block UPDATE, DELETE and TRUNCATE for the owner, and they stay active in replica mode.
- `colleges` has a trigger that creates the `college_settings` row.

## 5. How it is used in StudentOS (files/modules)

- `supabase/migrations/20261031000000_tenancy_identity_audit.sql`: all tables, functions, policies, grants.
- `supabase/seed.sql`: Alpha College and Beta Institute with 7 fake users each.
- `supabase/config.toml`: local stack settings (realtime, edge runtime, analytics, vector and S3 are off).
- `supabase/tests/database/*.test.sql`: pgTAP tests.
- `package.json`: `db:start`, `db:stop`, `db:reset`, `db:test`. The Supabase CLI is a dev dependency, so everyone uses `pnpm supabase`.
- Used next by: R2 Day 2 (login, join), R5 Day 2 (isolation tests in CI, staging), R3 (types and screens via the contracts).

## 6. Request/response and data flow (diagram or numbered trace)

Example: an Alpha student asks for memberships (no API yet, direct query as that user).

1. The request carries a login token. Postgres sets `auth.uid()` to the student's id and the role to `authenticated`.
2. `select * from memberships` runs. Postgres adds the policy: `user_id = auth.uid() or is_college_admin(college_id)`.
3. `is_college_admin` looks at the student's own membership rows. The student is not an admin.
4. Only the student's own row comes back. Beta rows and classmates' rows are never returned.

Write attempt: `update memberships set role = 'college_admin'` fails at once with "permission denied" (42501), because `authenticated` has no UPDATE right on that table.

## 7. API methods, endpoints, schemas, status codes

Not applicable: no API in this task. The contracts are in the next task (R2-D1-2, PR #11).

## 8. Database changes and relationships

New tables (all with RLS on):

- `colleges` 1 to 1 `college_settings`; 1 to many `college_domains`; 1 to many `memberships`; 1 to many `audit_logs` (college_id may be null for platform events).
- `auth.users` 1 to 1 `profiles`; 1 to many `memberships`.
- `memberships` unique on (`user_id`, `college_id`).
- Deleting a college is blocked while it has memberships or audit rows (`on delete restrict`). Use `status = 'archived'`.
- Domain names are unique across all colleges: one domain belongs to one tenant.
- Rules in checks: slug format and reserved names, status values, hex colour, handle format, `active` needs level 1 or more, join method values.
- Design choices that go beyond DATABASE.md are listed in DATABASE.md section 11.

## 9. Authentication / authorization behaviour

- Not signed in (`anon`): no access to any table.
- Pending or suspended user: sees their own profile and membership row, no college, no classmates.
- Student: sees their college, its domains and settings, their own membership, profiles of active classmates who are not hidden.
- Moderator: same as student for now. Moderator tools come on Day 4.
- College admin: also reads all memberships and the audit log of their college, and can update its settings (not `college_id`).
- Server (service role): writes colleges, domains, memberships and audit rows.
- Not decided yet: blocking access when a college is suspended. The helper functions check only membership status. The API must return `TENANT_SUSPENDED` on Day 2.

## 10. Errors and edge cases

- Twelve test cases cover bad data: reserved slug, upper case slug, duplicate slug, bad colour, bad status, domain with `@`, domain without a dot, duplicate domain, unknown join method, empty method list, bad handle, duplicate handle.
- Last admin: update to student, suspend and delete are all refused. A second admin makes it allowed.
- `now()` is fixed inside one transaction, so `updated_at` tests set an old `created_at` first.
- Seed users have `.test` emails and no password. Login will be by email code.
- `supabase db reset` rebuilds everything, so seed ids stay stable and tests can name users.

## 11. Tests: what exists and how to run them (exact commands)

```
pnpm db:start     # first time pulls several GB of Docker images
pnpm db:reset     # applies migrations and seed
pnpm db:test      # runs the pgTAP tests
pnpm verify       # the normal gate (db tests are not in it yet)
```

Seen on 2026-10-31 in the terminal: `pnpm db:reset` finished without errors. `pnpm db:test` printed Files=4, Tests=94, Result: PASS.

- 001_rls_enabled: RLS on for all tables, every tenant table has a policy, anon has no table rights, definer functions pin `search_path`, helper functions exist (18 checks).
- 002_cross_college_isolation: 35 checks as student, admin, other admin, pending, suspended and anon. Includes the lookalike name "Riya Sharma" in both colleges.
- 003_audit_append_only: 13 checks. Owner, admin and service role cannot change history. Only the service role can add rows through the function.
- 004_constraints_and_helpers: 28 checks on data rules, the last-admin guard and the helper functions.

Mutation checks (the tests must be able to fail): RLS turned off on `profiles` gave failures in files 001 and 002 (for example "RLS is on: profiles" and "a student cannot edit a classmate profile"). The audit update guard disabled gave 3 failed checks in file 003. After `pnpm db:reset` all 94 passed again.

## 12. How to debug common failures

- "Cannot connect to the Docker daemon": start Docker Desktop, then `pnpm db:start`.
- `db:reset` or `db:test` says the database is not running: run `pnpm db:start`.
- A policy test fails with an empty result: check which user the test acted as. Seed ids are in `supabase/seed.sql` (admin ends in 1, moderator 2, students 3 to 5, pending 6, suspended 7).
- "permission denied for table": expected when a role has no grant. Check the grants block at the end of the migration.
- A seed insert fails on a check: the check names the column. Fix the seed, not the check.
- Docker memory: the local stack runs several containers. If the PC is slow, stop other containers (`docker ps` shows them).

## 13. Security considerations

- Isolation is enforced by RLS and by removing privileges, two layers.
- No secrets in the repo. Seed has no passwords. `supabase/.gitignore` ignores local env files.
- Definer functions have a fixed empty `search_path` and are not executable by `anon`.
- `write_audit_log` can be called only by the service role. A signed-in user cannot forge audit rows.
- The migration contains security code written by AI. AI_RULES rule 7 says it needs a second human review and a negative test. Negative tests exist (94 checks). The human review is still open (see section 16).
- New packages: `supabase` (CLI, dev only). Checked with `pnpm view supabase version license`: 2.122.0, MIT.

## 14. Alternatives and trade-offs

- Postgres enums vs text with CHECK: we used text with CHECK (decision in DATABASE.md), because changing an enum later is harder.
- Letting admins write memberships from the client: simpler API, but one RLS mistake could allow a role change. We chose server-only writes.
- Hard-deleting audit rows on account deletion vs keeping them: we keep rows and store no foreign key to the user, so deleting an account never blocks or changes history.
- Checking college status inside the helper functions would give one more layer for suspended colleges, but it also affects admins who need to fix a suspended college. Left to the API for now.

## 15. What AI generated or suggested (prompts used, summary)

AI (Claude Code) wrote the migration, seed, the four test files, the config changes and the docs. The prompt context was the R2 Day 1 prompt from the student kit and docs/DATABASE.md sections 2.1 and 4. AI also ran every command and proposed the two mutation checks.

## 16. What a human verified (how: ran tests, read code, checked docs, tried to break it)

Done in the session, with real output seen: `pnpm db:reset`, `pnpm db:test` (94 passed), `pnpm verify` (all five steps passed), the two mutation checks.

Not done yet (open on purpose):

- A person has not read the migration and tests line by line.
- A second reviewer (R5) has not reviewed the RLS policies and grants.
- Nobody has opened Supabase Studio (http://127.0.0.1:54323) to look at the tables by hand.
- The walkthrough drill (explain the isolation to a teammate) has not been done.

## 17. What each teammate can now explain/implement independently

Planned, not yet confirmed by a teammate: start the local database, reset it, run the tests, log in as a seed user in a test, and add a new table with RLS and a cross-college test. R5 can explain why `anon` has no table rights.

## 18. Further learning resources

- Supabase docs: Row Level Security, Database testing (pgTAP), Local development with the CLI (check the official pages for current details).
- PostgreSQL docs: CREATE POLICY, CREATE TRIGGER, SECURITY DEFINER.

## 19. Docs updated because of this (per trigger table)

- docs/DATABASE.md: status line and new section 11 (implementation notes).
- docs/DEV_SETUP.md: Docker row and the four `db:` commands.
- docs/CHANGELOG.md: not changed yet (add when merged).

## 20. Walkthrough drill: passed by / date

not yet
