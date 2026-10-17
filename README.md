# StudentOS

StudentOS is a web app that a college can use as its own private student platform. Each college is a separate space (we call it a tenant). A new college starts empty.

Inside a college, students can:
- build a profile and a portfolio
- find teammates for projects and hackathons (Team Finder)
- track internship and job applications (Application Tracker)
- read official announcements and curated opportunities

College admins decide who can join, post notices, and manage the space.

Status: in development. The first test college is our own college.

## Tech we use
Next.js (App Router), TypeScript, Tailwind CSS, shadcn/ui, Supabase (Postgres, Auth, Storage), Zod, TanStack Query, Vitest, Playwright, pgTAP, GitHub Actions.

## Folders
```
src/app                 pages and routes (Next.js)
src/modules             business code for each feature (backend side)
src/contracts           Zod schemas and sample data (the agreement between frontend and backend)
src/components/ui       shared UI parts (buttons, inputs, and so on)
src/features            screens and logic for each feature (frontend side)
src/lib                 helpers (errors, logging, api client)
supabase/               database migrations, seed data, database tests
e2e/                    browser tests (Playwright)
docs/                   all project documents (start with docs/INDEX.md)
.github/                CI, pull request template, code owners
```

## Run it on your PC
See your role folder's setup file. In short:
1. `pnpm install`
2. `pnpm supabase start` (needs Docker)
3. `pnpm db:reset`
4. `pnpm dev`
5. `pnpm verify` runs all checks. It must pass before you open a pull request.

## How we work
Read `CONTRIBUTING.md` and `docs/WORKFLOW.md`. Short version: one small branch per task, one pull request per branch, another person reviews, then squash merge.

## Where is everything
`docs/INDEX.md`
