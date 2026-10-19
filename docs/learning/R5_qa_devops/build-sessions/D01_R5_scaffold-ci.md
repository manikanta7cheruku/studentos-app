# Project scaffold and CI - build session

| Field | Value |
|---|---|
| Date / Author (role) | 2026-10-18 / R5 (Testing and DevOps) |
| Linked task / ADR / PR | R5-D1-1 / ADR-007 (Proposed) / PR #1 https://github.com/manikanta7cheruku/studentos-app/pull/1 (squash-merged, commit 479a64e) |
| Related docs | ARCHITECTURE.md, CI_CD_AND_ENVIRONMENTS.md, TESTING.md, CODING_STANDARDS.md, TECH_STACK_AND_PROVIDERS.md, DEV_SETUP.md |

## 1. What we are learning and why it is needed
A scaffold is the working skeleton of the app. R2, R3 and R4 all build on it, so it must start, build and be checked automatically from day one.
## 2. What problem it solves
Without it every role sets up a different project, mistakes reach main, and nobody can prove the code still builds. The scaffold plus CI gives one setup and one set of checks for everyone.
## 3. Concepts and terminology (short glossary)
Scaffold: the starting project. CI (continuous integration): checks that run on every pull request. Job: one named check in CI. Lockfile (`pnpm-lock.yaml`): the exact versions installed. Corepack: ships with Node and installs the pnpm version the repo asks for. Vitest: the test runner. Prettier: formatting. ESLint: code rules. Typecheck: `tsc --noEmit`. Squash merge: all commits of a PR become one commit on main. Required check: a check that must be green before merge.
## 4. How it works internally (appropriate depth)
- `pnpm verify` runs: `pnpm format:check && pnpm lint && pnpm typecheck && pnpm test && pnpm build`.
- CI (`.github/workflows/ci.yml`) has five jobs: Format check, Lint, Typecheck, Unit tests, Build. Each job checks out the code, sets up pnpm from the `packageManager` field, sets up Node from `.nvmrc`, runs `pnpm install --frozen-lockfile`, then runs one command. Jobs run in parallel on fresh machines, so green CI proves the project builds from nothing.
- Triggers in the file: `push` (all branches), `pull_request` to main, and `workflow_dispatch` (manual). Permissions are `contents: read`. A concurrency group cancels older runs of the same PR or branch.
- Actions are pinned to full commit SHAs with the version in a comment: actions/checkout v7.0.1, pnpm/action-setup v6.1.0, actions/setup-node v7.1.0.
- Pinned tools: Node 24 (`.nvmrc`), engines `>=24.10.0 <25`, `pnpm@10.34.7`, and `.npmrc` has `engine-strict=true`. A frozen lockfile makes CI fail when `package.json` and `pnpm-lock.yaml` disagree.
- Dependencies in `package.json`: next 16.4.2, react 19.3.0, react-dom 19.3.0. Dev: typescript ^5, tailwindcss ^4, eslint ^9, eslint-config-next 16.4.2, prettier ^3.9.10, vitest ^5.0.5. On 2026-10-18 `npm view` showed typescript 7.0.2 and eslint 10.13.0 as the newest, but the repo uses major 5 and 9. YOU-FILL: write the real reason (for example tool compatibility).
## 5. How it is used in StudentOS (files/modules)
`package.json` (scripts, pinned tools), `.nvmrc`, `.npmrc`, `.prettierrc.json`, `.prettierignore`, `eslint.config.mjs`, `tsconfig.json`, `vitest.config.ts`, `tests/repo-hygiene.test.ts`, `scripts/db-not-configured.mjs`, `.env.example`, `.gitignore`, `.gitattributes`, `.github/workflows/ci.yml`, and the folders from ARCHITECTURE.md (`src/features`, `src/modules`, `src/contracts`, `src/components/ui`, `src/lib`, `supabase/`, `e2e/`).
## 6. Request/response and data flow (diagram or numbered trace)
1. Developer edits code. 2. `pnpm verify` locally. 3. Push the branch and open a PR. 4. GitHub starts the CI jobs. 5. Results appear as checks on the PR. 6. The reviewer approves. 7. Squash and merge into main. 8. CI runs once more on main (push trigger).
## 7. API methods, endpoints, schemas, status codes
Not applicable. The app has only the default Next.js starter page.
## 8. Database changes and relationships
None. `pnpm db:reset` and `pnpm db:test` exist but exit with an error and a "not configured" message on purpose, so nobody mistakes them for a pass. They are not part of `pnpm verify` until R2 merges the local database setup.
## 9. Authentication / authorization behaviour
Not applicable. CI uses read-only repository permissions and no secrets.
## 10. Errors and edge cases
Wrong Node version (blocked by engine-strict), lockfile mismatch, formatting differences (fix with `pnpm format`), line endings (`.gitattributes` forces LF), the intentional failure of the `db:*` scripts. Observed on 2026-10-18: PR #1's last commit shows 15 check results for 5 job names, because the same five jobs ran for three triggers (push, pull_request, workflow_dispatch). The `push` trigger has no branch filter, so every push to every branch also runs CI, which doubles the GitHub Actions minutes (private repos on GitHub Free have 2,000 per month). Follow-up: limit `push` to main in a small PR. See docs/DEV_SETUP.md section 5 for other fixes.
## 11. Tests: what exists and how to run them (exact commands)
`pnpm test` runs Vitest. `tests/repo-hygiene.test.ts` checks the repository guardrails: required scripts exist, Node and pnpm are pinned and the lockfile exists, `.env*` is git-ignored except `.env.example`, and `.env.example` has no secret values (see the file for the exact checks). A test can only be trusted if it can fail, so R5 ran a throwaway PR with a deliberately failing test. The GitHub run list shows that PR and its push run both failed, and the throwaway branch was deleted afterwards. Full local gate: `pnpm verify`.
## 12. How to debug common failures
Observed in the run history: several CI runs on branch r5/d1-scaffold-ci failed after 0 to 1 second (the pull_request run, a push run for the commit "fix: improve CI concurrency configuration", and manual runs), which points to a workflow file problem, not to a code problem. Later manual runs passed in 35 to 45 seconds. YOU-FILL: write the exact error you saw for each early failure, the cause, and the fix. Useful commands: `gh run list`, `gh run view <id>`, `gh run view <id> --log-failed`.
## 13. Security considerations
Real `.env` files are ignored by git. The hygiene test fails if a name containing KEY, SECRET, TOKEN, PASSWORD or DSN has a value in `.env.example`. CI uses no secrets and `persist-credentials: false`. Actions are pinned by commit SHA. No real student data exists in the repo. New packages need a check that they exist, are maintained and have an allowed licence (CODING_STANDARDS section 10).
## 14. Alternatives and trade-offs
Separate CI jobs (clearer failures, more install time) versus one job (simpler, one big check). npm or yarn instead of pnpm (rejected, docs choose pnpm). Jest or Biome (rejected, ADR-007 and CODING_STANDARDS choose Vitest, ESLint and Prettier). Running CI on every push (fast feedback, double minutes) versus only on pull requests and main.
## 15. What AI generated or suggested (prompts used, summary)
An AI assistant guided the work step by step and drafted the configs, scripts, hygiene test and workflow. It was told to follow the project docs, never claim a result without pasted output, and not add packages without approval.
## 16. What a human verified (how: ran tests, read code, checked docs, tried to break it)
Reported by R5: `pnpm verify` passed locally; a clean clone passed `pnpm install --frozen-lockfile` and `pnpm verify`; the deliberate failing test made CI fail; a manual CI run passed. Seen in GitHub on 2026-10-18: PR #1 merged at 2026-10-18T11:32:51Z, five green checks on its last commit, and a green CI run on main after the merge. Honest note: PR #1 had no GitHub approval recorded (reviewDecision empty) because no reviewer collaborator exists yet. Tool versions on the R5 machine: Git 2.51.0, Node v24.10.0, npm 11.6.1, Corepack 0.34.0, pnpm 10.34.7, Docker 29.8.2, GitHub CLI 2.102.0.
YOU-FILL: paste the links to the CI runs you rely on, and what you read and understood yourself.
## 17. What each teammate can now explain/implement independently
Set up the repo from scratch with docs/DEV_SETUP.md, run `pnpm verify`, read a failing CI check, and explain why the `db:*` scripts fail for now. New developers install: Git, Node 24 (see `.nvmrc`), pnpm through Corepack (`corepack enable pnpm`), optionally VS Code and GitHub CLI. Docker Desktop is needed only after the database setup is merged.
## 18. Further learning resources
https://pnpm.io , https://vitest.dev , https://nextjs.org/docs , https://docs.github.com/en/actions
## 19. Docs updated because of this (per trigger table)
Added docs/DEV_SETUP.md. Updated PROGRESS.md, LEARNING_INDEX.md, CARRYOVER.md, INDEX.md, CHANGELOG.md and the daily file.
## 20. Walkthrough drill: passed by / date
Pending. Reviewer: R2 (not yet a repository collaborator).
