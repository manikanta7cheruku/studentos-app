# Staging environment - build session

| Field | Value |
|---|---|
| Date / Author (role) | 2026-10-31 / R5 Testing and DevOps |
| Linked task / ADR / PR | R5-D2-2 / ADR-011 / https://github.com/manikanta7cheruku/studentos-app/pull/18 |
| Related docs | docs/CI_CD_AND_ENVIRONMENTS.md sections 2, 4, 5, docs/STAGING_SETUP.md, docs/PROVIDER_CHECK.md, docs/ERROR_HANDLING.md (F5, F20) |

## 1. What we are learning and why it is needed

Staging is a second copy of the app with fake data. Every merge to `main` goes there first, so we find broken deploys, broken migrations and missing settings before real students do. This task builds the code and the automation for it. The accounts (Supabase project, Vercel project) can only be created by the owner, so the task also writes the exact steps.

## 2. What problem it solves

- A deploy with a missing secret must fail loudly at start, not half work.
- A database migration must run on a copy before it runs on real data.
- Someone must be able to tell, in 10 seconds, whether the site that is live is the version that was just merged.

## 3. Concepts and terminology (short glossary)

- Environment: a full copy of the app (local, CI, staging, production) with its own settings and data.
- Smoke test: a short test that only checks "is it alive and answering sensibly".
- Health and ready checks: `health` says the process runs; `ready` says it can reach its database.
- Migration: a SQL file that changes the database. Staging receives it before production.
- Secret and variable (GitHub): a secret is hidden in logs; a variable is not.
- `instrumentation.ts`: a Next.js file whose `register` function runs once when the server starts.
- Seed: fake data loaded into a new database.

## 4. How it works internally (appropriate depth)

1. **Startup check.** `register()` in `src/instrumentation.ts` calls `checkEnvAtStartup()`. In production mode (not during `next build`, not in `pnpm dev`) it validates the five settings with Zod. If one is missing or too weak, it prints the setting names and exits with code 1. Values are never printed.
2. **Health and ready.** `GET /api/health` needs nothing and shows the commit that is live (`VERCEL_GIT_COMMIT_SHA`). `GET /api/ready` reads the public branding view with the anon key and answers 503 if that fails.
3. **Staging workflow.** On a push to `main`: check that three values exist (`SUPABASE_ACCESS_TOKEN`, `STAGING_DB_PASSWORD`, `STAGING_SUPABASE_PROJECT_REF`). If not, print a notice and end green. If yes: link the project, show a dry run, apply migrations. With the manual "seed" option it also loads the fake data. Then the smoke job waits (up to 10 minutes) until `/api/health` shows the new commit and runs the checks.
4. **Smoke test** (`scripts/smoke.mjs`): seven read-only checks, including a refused request to prove validation and the 401 on a member endpoint.
5. **Node version.** `engines.node` now says 24.15 or newer, which is what `jsdom` really needs.

## 5. How it is used in StudentOS (files/modules)

- `src/instrumentation.ts`, `src/lib/startup-check.ts`, `src/lib/env.ts`
- `src/app/api/health/route.ts`, `src/app/api/ready/route.ts`
- `.github/workflows/staging.yml`, `scripts/smoke.mjs`
- `docs/STAGING_SETUP.md` (steps for the owner), `docs/DEV_SETUP.md` (Node version)
- Used next by: every merge from now on; Day 9 production setup copies this pattern.

## 6. Request/response and data flow (diagram or numbered trace)

A merge to `main`:

1. GitHub starts the `Staging` workflow.
2. The workflow applies new migrations to the staging database.
3. Vercel, connected to the repository, builds and deploys the same commit (separate from this workflow).
4. The smoke job polls `https://staging/api/health` until `commit` equals the merged commit.
5. It runs the seven checks. A red job tells the team that staging is broken right after the merge.

## 7. API methods, endpoints, schemas, status codes

- `GET /api/health` 200 `{ status, commit, environment }`.
- `GET /api/ready` 200 `{ status: "ready" }`, or 503 `{ status: "unavailable" }` with no reason shown.
- Both: `Cache-Control: no-store`, `X-Request-Id`.

## 8. Database changes and relationships

None. The workflow applies the existing migrations to the staging project.

## 9. Authentication / authorization behaviour

Health and ready are public and show no private data. The workflow secrets exist only in GitHub and only the steps that need them can read them. The service role key of staging lives in Vercel (marked sensitive) and in the GitHub secrets of the test job only.

## 10. Errors and edge cases

- `next build` in CI has no secrets; the check is skipped in that phase.
- Locally, `.env.local` is loaded by `next start` too, so to see the refusal you must move that file away. I did this to test.
- Seed data uses fixed ids. Seeding twice fails. The first seed is a deliberate manual step.
- On Vercel, a failed `register` makes requests fail with a clear log line instead of running half configured.
- Not tested yet: a real staging project. Everything that needs the owner's accounts is untested, and the workflow's configured branch has never run.

## 11. Tests: what exists and how to run them (exact commands)

```
pnpm test                         # unit tests, includes the startup rule and health/ready
node scripts/smoke.mjs <url>      # smoke test against any deployed copy
```

Seen on 2026-10-31:

- Production server with no settings (I moved `.env.local` away): `The app refuses to start. Missing or invalid environment variables: NEXT_PUBLIC_APP_URL, ...` then exit code 1 and nothing listening. With the settings it starts and `/api/health` answers `ok`.
- Smoke test against a local production server: `All 7 checks passed`. Against a URL with nothing running: all fail, exit code 1.
- Unit tests: 192 passed. Lint, typecheck, format check and build passed. CI on the pull request passed.

## 12. How to debug common failures

- Vercel shows 500 on every page: open the deployment logs and read `The app refuses to start`. It names the missing setting.
- Staging workflow says "not set up yet": add the secrets and the variable (docs/STAGING_SETUP.md section 2).
- Smoke test waits and never sees the commit: Vercel may not have built it, or the project does not use the `main` branch.
- `ready` returns 503: the database is paused or the keys are wrong.

## 13. Security considerations

- Secrets are never printed (names only). Different keys per environment. The production password is never stored in the staging secrets.
- `process.exit(1)` only on a missing setting in production mode.
- Staging uses fake data only (decision D-11). Real students need paid plans.
- No new packages in this task.

## 14. Alternatives and trade-offs

- Supabase branching (paid) vs one shared staging project: we use one shared project and reset it deliberately (docs/CI_CD_AND_ENVIRONMENTS.md section 9).
- Throwing in `register` vs `process.exit`: throwing left the server running in local tests, so the code exits.
- Letting the workflow fail until configured: it would block merges for no benefit, so it ends green with a notice.

## 15. What AI generated or suggested (prompts used, summary)

AI (Claude Code) wrote the code, workflow, smoke script and runbook from the R5 Day 2 prompt and docs/CI_CD_AND_ENVIRONMENTS.md. It checked the Supabase CLI flags (`--linked`, `--include-seed`, `--dry-run`) with `--help`, and the Next.js instrumentation rules in `node_modules/next/dist/docs`.

## 16. What a human verified (how: ran tests, read code, checked docs, tried to break it)

Done in the session with real output: the refuse-to-start check, the smoke test (pass and fail cases), unit tests, CI.

Not done yet (open on purpose):

- The owner has not created the staging Supabase project or the Vercel project, so "Staging URL works with fake data" is not met.
- The workflow has not run against a real project.
- Hosted Auth settings (6 digit code, 10 minute expiry, template, mail sender) are not set.
- No second reviewer yet.

## 17. What each teammate can now explain/implement independently

Planned, not yet confirmed: read a startup error, run the smoke test, explain why the seed is a manual step, and find the live commit.

## 18. Further learning resources

- Supabase CLI docs: `db push`, `link`. Vercel docs: environment variables, Git integration. Next.js docs: `instrumentation` (check the official pages).

## 19. Docs updated because of this (per trigger table)

- docs/STAGING_SETUP.md (new), docs/DEV_SETUP.md (Node version).

## 20. Walkthrough drill: passed by / date

not yet
