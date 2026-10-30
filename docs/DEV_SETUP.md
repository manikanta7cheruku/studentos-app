# Developer setup

For R2, R3, R4 and R5. Written by R5 on Day 1. If a step is wrong, fix this file in your pull request.

## 1. Install once

| Tool | Version | Why |
|---|---|---|
| Git | any current version | clone, branches, pull requests |
| Node.js | the major version in `.nvmrc` (24). Allowed range is in `package.json` field `engines` | runs the app and the tools. Check with `node --version` |
| pnpm | pinned in `package.json` field `packageManager` | the only package manager here. Do not use npm or yarn |
| VS Code | optional | extensions: ESLint, Prettier, Tailwind CSS IntelliSense |
| GitHub CLI (`gh`) | optional | open PRs and read CI results from the terminal |
| Docker Desktop | needed for the local database (R2 and R5). About 8 GB of RAM is enough | runs the local Supabase database. The Supabase CLI is a dev dependency, use `pnpm supabase ...` |

Turn on pnpm with Corepack (it ships with Node):

```
corepack enable pnpm
pnpm --version
```

Corepack installs the exact pnpm version written in `package.json`. Do not run `npm install -g pnpm`. If you get a permission error, post in `#blockers`. Use the VS Code terminal (Terminal, New Terminal) inside the project folder. Do not run commands in an administrator window.

`.npmrc` sets `engine-strict=true`, so install stops with a clear message if your Node version is outside the allowed range.

## 2. Get the project running

```
git clone https://github.com/manikanta7cheruku/studentos-app.git
cd studentos-app
pnpm install --frozen-lockfile
```

Create your local environment file. It is git-ignored, so real values stay on your PC.

```
Copy-Item .env.example .env.local    (PowerShell)
cp .env.example .env.local           (macOS or Linux)
```

Then run `pnpm verify`. It must finish with a successful build. After that, `pnpm dev` starts the app at http://localhost:3000.

### Local database and the values in `.env.local` (R2, R5, and anyone running the API)

`pnpm verify` does not need the database. To run the API or the integration tests:

1. Start Docker Desktop, then `pnpm db:start` (first time downloads several GB), then `pnpm db:reset`.
2. Run `pnpm env:local`. It reads the local keys from the running stack and writes `.env.local` for you (it refuses to overwrite an existing file unless you add `-- --force`). The keys are the well known demo keys of the local stack, but still keep them out of git.
3. What the file holds (for reference, or to fill it by hand from `pnpm supabase status -o env`):

| Variable | Value |
|---|---|
| `NEXT_PUBLIC_APP_URL` | `http://localhost:3000` |
| `NEXT_PUBLIC_SUPABASE_URL` | `API_URL` from the status output (`http://127.0.0.1:54321`) |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | `ANON_KEY` (or `PUBLISHABLE_KEY`) |
| `SUPABASE_SERVICE_ROLE_KEY` | `SERVICE_ROLE_KEY` (or `SECRET_KEY`). Server only, never in the browser |
| `APP_HASH_SECRET` | 32 or more random characters: `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"` |
| `MAILPIT_URL` | `http://127.0.0.1:54324`, only used by the integration tests |

4. Sign in codes sent by the local stack arrive in Mailpit at http://127.0.0.1:54324.
5. The app refuses to answer an API call if a needed variable is missing. The error names the variable, never the value.
6. Seed users sign in with the email code too: `student1@alpha.test`, `admin@alpha.test`, `pending@alpha.test` (see `supabase/seed.sql`). Read their code in Mailpit.

## 3. Commands

| Command | What it does |
|---|---|
| `pnpm dev` | start the app locally |
| `pnpm build` | production build |
| `pnpm lint` | ESLint |
| `pnpm typecheck` | TypeScript check without building |
| `pnpm test` | Vitest unit tests |
| `pnpm format` | rewrite files with Prettier |
| `pnpm format:check` | only check formatting (CI uses this) |
| `pnpm verify` | format check, lint, typecheck, tests, build. Run it before every pull request |
| `pnpm db:start`, `pnpm db:stop` | start or stop the local Supabase stack in Docker. The first start downloads several GB of images |
| `pnpm db:reset` | rebuilds the local database from `supabase/migrations` and `supabase/seed.sql` (all fake data). Needs `pnpm db:start` first |
| `pnpm db:test` | runs the pgTAP tests in `supabase/tests/database`. Needs `pnpm db:start` first. CI runs it as the Database tests job. Not part of `pnpm verify` |
| `pnpm test:integration` | API tests against the LOCAL Supabase stack (real login, limits, joins, a concurrency test). Needs `pnpm db:start`, `pnpm db:reset` and `.env.local`. It refuses to run against any other URL. CI runs it as the Integration tests job. Not part of `pnpm verify` |
| `pnpm env:local` | writes `.env.local` from the running local stack (see the section above) |
| `pnpm test:e2e` | Playwright journeys (sign in, join) and browser smoke tests. Needs `pnpm db:start`, `pnpm db:reset`, `pnpm env:local`. First time: `pnpm exec playwright install chromium`. CI runs it as the E2E workflow |
| `node scripts/smoke.mjs <url>` | read-only smoke test of a deployed copy, for example staging (docs/STAGING_SETUP.md) |

## 4. Every task

1. `git checkout main`, `git pull origin main`, then `git checkout -b r2/d1-short-name` (use your own role and day).
2. Small commits: `r2 d1: what I did`.
3. Run `pnpm verify` and read the real output.
4. Push, open a Draft PR titled `[R2][D1] Short sentence`, fill the PR template, post in `#pull-requests`.
5. CI must show five green checks: Format check, Lint, Typecheck, Unit tests, Build. Your reviewer approves. Squash and merge.

Nobody pushes to `main`. GitHub cannot enforce this yet on our plan, so it is a team rule (see docs/learning/R5_qa_devops/build-sessions/D01_R5_branch-protection.md). Never commit `.env` files, keys or real student data. Full rules: `docs/WORKFLOW.md`, `docs/DEFINITION_OF_DONE.md`, `docs/learning/AI_RULES.md`.

## 5. Common problems

| Problem | Fix |
|---|---|
| `pnpm` is not recognized | run `corepack enable pnpm`, then open a new terminal |
| Install refuses because of the Node version | install the Node major version from `.nvmrc`, then retry |
| `frozen-lockfile` error | `package.json` and `pnpm-lock.yaml` disagree. Do not delete the lockfile. Ask R5 |
| `pnpm format:check` fails | run `pnpm format`, then commit the changes |
| Port 3000 is busy | stop the other process, or run `pnpm dev -- -p 3001` |
| CI fails but `pnpm verify` passes locally | run `pnpm install --frozen-lockfile` and `pnpm verify` again from a fresh clone, then post in `#blockers` with the CI link |
| A script writes to `C:\Windows\System32` or says path not found | your terminal is in the wrong folder. Open the VS Code terminal in the project and check the prompt shows `studentos-app` |
