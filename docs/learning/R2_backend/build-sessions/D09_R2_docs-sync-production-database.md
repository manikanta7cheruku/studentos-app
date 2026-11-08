# Docs match code and the production database - build session

| Field | Value |
|---|---|
| Date / Author (role) | 2026-11-07 / R2 Backend and database |
| Linked task / ADR / PR | R2-D9-1 / DECISIONS D-24 / https://github.com/manikanta7cheruku/studentos-app/pull/35 |
| Related docs | docs/BACKEND_STATUS.md, docs/PRODUCTION_SETUP.md, docs/R2_MANUAL_STEPS.md, docs/openapi.v1.json |

## 1. What we are learning and why it is needed

Docs rot: a field is added, the document is not. This task makes the documents impossible to forget (a test fails when they disagree with the code) and prepares the production database so that the owner only has to click and paste, not to invent.

## 2. What problem it solves

- The API description (`docs/openapi.v1.json`) is generated from the same Zod contracts the routes use. It cannot drift.
- One registry lists every endpoint with who may call it. Tests compare it with the route files, with `docs/PERMISSIONS.md`, and with `docs/API_CONTRACT.md`.
- Other tests check the settings list, the error codes, the notification types, the tables, the migrations, the learning index and the doc links against the code.
- The production database has a step by step guide, a script that creates the first college, and a command that checks an environment and says READY or NOT READY.
- The owner has one list of everything only a person can do (`docs/R2_MANUAL_STEPS.md`).

## 3. Concepts and terminology (short glossary)

- Registry: `src/contracts/registry.ts`, one line per route method (id, path, who, request and response shape).
- Generated document: a file written by a program from the source of truth, never edited by hand.
- Doc sync test: a test whose only job is to fail when a document and the code disagree.
- Migration push: applying the files in `supabase/migrations` to a hosted database (`supabase db push`). Forward only.
- Environment check: `pnpm env:check`, a read only script that tests a running app and its database from outside.

## 4. How it works internally (appropriate depth)

1. `registry.ts` imports the Zod shapes and lists the endpoints. `openapi.ts` turns them into an OpenAPI 3.1 document with `z.toJSONSchema`.
2. `registry.test.ts` checks: the registry has exactly the routes in `src/app/api`; it equals the rows of `docs/PERMISSIONS.md` (id, method, path, who); every id appears in `docs/API_CONTRACT.md`; the endpoints that use an idempotency key are marked; the committed `docs/openapi.v1.json` equals the generated one. `pnpm docs:openapi` rewrites the file.
3. `tests/docs-sync.test.ts` reads documents and code: every `.env.example` setting is in `docs/DEV_SETUP.md`, every error code and notification type is in the API contract, every table and migration is in `docs/DATABASE.md`, every R2 note is in the learning index, every endpoint in the contract is built or listed under "Not built" in `docs/BACKEND_STATUS.md`, and the R2 guides point to files that exist.
4. `supabase/production/create-college.sql` is a single block the owner edits at the top and runs in the SQL editor. `tests/integration/production-scripts.test.ts` runs the real file against the local database (refusal when the admin never signed in, creation, second run refused, bad slug refused).
5. `scripts/check-environment.mjs` makes about 40 read only checks: health, ready, headers, sign in refuses other websites, the maintenance call is locked, anonymous visitors cannot read any private table or call internal functions, sign in settings, all 27 tables, the avatars bucket, every active college has an admin, and with `--production` HTTPS and no sample data.
6. `.github/workflows/maintenance.yml` calls the maintenance endpoint every hour for staging and production once the owner adds the secrets (otherwise it skips with a message).
7. Local sign in now runs with "Confirm email" on, like production. The sign in and join tests pass with it.

## 5. How it is used in StudentOS (files/modules)

`src/contracts/registry.ts`, `openapi.ts`, `registry.test.ts`, `tests/docs-sync.test.ts`, `docs/openapi.v1.json`, `docs/BACKEND_STATUS.md`, `docs/PRODUCTION_SETUP.md`, `docs/R2_MANUAL_STEPS.md`, `supabase/production/create-college.sql`, `scripts/check-environment.mjs`, `scripts/update-openapi.mjs`, `.github/workflows/maintenance.yml`.

## 6. Request/response and data flow (diagram or numbered trace)

A developer adds an endpoint: the route file exists, so `registry.test.ts` fails until it is in the registry, in `docs/PERMISSIONS.md` and in `docs/API_CONTRACT.md`; the OpenAPI test fails until `pnpm docs:openapi` is run; `docs/BACKEND_STATUS.md` fails until the id is moved to "Built". All of this is caught in the pull request, not by a reader weeks later.

## 7. API methods, endpoints, schemas, status codes

No API change in this task (the three endpoints built on the same day are in the next note).

## 8. Database changes and relationships

None here. Documentation of all migrations: docs/DATABASE.md section 19.

## 9. Authentication / authorization behaviour

The environment check proves from outside that private tables and internal functions are closed to anonymous visitors and that the maintenance call needs the secret.

## 10. Errors and edge cases

- The tests found real drift on the first run: two settings missing from `docs/DEV_SETUP.md`, five migrations missing from `docs/DATABASE.md`. Both were fixed.
- The environment check found, on the local stack, that automatic email confirmation was on. That is why local sign in now has "Confirm email" on, and why the check fails for production when it is on.
- The old `docs/openapi.v1.yaml` was a draft that matched nothing. It was removed.
- Not done: the checks cannot test the hosted Supabase dashboard settings (sign in code length and expiry, SMTP, backups). They are on the owner's list.

## 11. Tests: what exists and how to run them (exact commands)

```
pnpm test                     # registry.test.ts, docs-sync.test.ts
pnpm test:integration         # production-scripts.test.ts
pnpm docs:openapi             # rewrites docs/openapi.v1.json
pnpm env:check --app <address> [--env <file>] [--production]
```

Seen on 2026-11-07 (tools run directly with node): the checker against the local stack passed 34 of 35 checks (one WARN) and, with `--production`, correctly failed on HTTP, on the local auto confirm setting and on the 14 sample people. See the release review for the totals.

## 12. How to debug common failures

- `registry.test.ts` fails with a route name: add the endpoint to the registry, the permission table and the API contract.
- The OpenAPI test fails: run `pnpm docs:openapi` and commit the file.
- `pnpm env:check` says FAIL: the line names the problem and the usual fix (push a migration, switch a setting).

## 13. Security considerations

The check script only reads. The one POST it sends without a secret is expected to be refused. The service key is read from the environment or a file outside the repository, never printed. The production guide tells the owner never to run `supabase db reset` or load the seed on production, and the check fails if it finds sample people.

## 14. Alternatives and trade-offs

- Hand-written OpenAPI plus review: cheap, but it rots. Generated from the contracts: a few hundred lines of generator, no rot.
- A migration tool for production (Supabase CLI push) versus pasting SQL in the dashboard: the CLI keeps the history table in step; the dashboard SQL editor is used only for the one-off college script.

## 15. What AI generated or suggested (prompts used, summary)

AI (Claude Code) wrote the registry, generator, doc tests, scripts, guides and this note from the roadmap line "Docs match code, production database", and ran the checks on the local stack.

## 16. What a human verified (how: ran tests, read code, checked docs, tried to break it)

Done with real output: all suites, the generated file check, the environment check against the local stack, the college script against the local database.

Not done yet (open on purpose): nobody has run the production steps (they need the owner's accounts), no hosted dashboard setting was verified, no second reviewer.

## 17. What each teammate can now explain/implement independently

R3 and R4: read the OpenAPI file for exact shapes. R5: run `pnpm env:check` after every release and keep its output as evidence. The owner: follow `docs/PRODUCTION_SETUP.md` from top to bottom.
