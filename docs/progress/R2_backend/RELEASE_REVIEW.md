# R2 backend release review (Day 10, R2-D10-1)

Written by R2 on 2026-11-07 for the release decision (`docs/RELEASE_CHECKLIST.md`). It says what the backend can do, what was proven and how, what was not proven, and what must happen before real students use it. Every number comes from a command that was run; where nothing was run, the line says so.

## 1. Verdict

| Stage | R2's recommendation | Why |
|---|---|---|
| S1 Internal MVP on staging (fake data) | **Go** as soon as the staging project and its secrets exist | The backend is built and tested. The only thing missing is the owner's accounts (`docs/R2_MANUAL_STEPS.md` section A) |
| S2 Limited beta with real students | **Delay** until the blockers in section 7 are closed | Nobody except the author has reviewed the security code, no hosted Supabase project has been set up or checked, no backup has been restored, and the legal items are open |
| S3 Public production | Not assessed | Needs the S2 results first |

This is a recommendation by the author of the code. The decision belongs to the team (release checklist sign-off).

## 2. What is built

| Item | Count |
|---|---|
| API endpoints (route methods), all listed in `docs/PERMISSIONS.md` and `docs/openapi.v1.json` | 66 |
| Endpoint ids in the contract, built | 50 (not built: 16, listed with reasons in `docs/BACKEND_STATUS.md` section 2) |
| Database migrations | 12 |
| Tables in the public schema | 27 |
| Server functions in the public schema | 92 |
| Colleges isolated from each other by row level security and by function checks | all (tested with two colleges) |
| Background job | 1 (hourly maintenance), not scheduled yet |

Areas: sign in with an email code, colleges and joining (invite code, college email, manual), college admin console API, profile and skills, people directory, notifications, announcements, reports and moderation, blocks, waitlist, Team Finder, opportunities and reminders, delete my account, leave a college.

Not built (a product decision or another role, see `docs/BACKEND_STATUS.md`): projects and portfolio (PRJ-01 to PRJ-06), the application tracker (APP-01 to APP-04, R3), achievements, roster import, college data export, platform admin endpoints.

## 3. Evidence

All run on 2026-11-07 on the merged code of Day 9 (the same code CI runs).

| Check | Result |
|---|---|
| Unit tests (`pnpm test`) | 450 passed |
| Database tests (`pnpm db:test`, pgTAP, 12 files) | 673 checks, PASS |
| Integration tests against a real local Supabase (`pnpm test:integration`, 14 files) | 984 passed, 2 skipped on purpose, run twice in a row |
| Permission matrix (every endpoint as nine kinds of caller) | part of the 984, plus a test that the table and the code list the same endpoints |
| Lint, typecheck, format check, production build | pass |
| CI on `main` after Day 8 (#34) | success: https://github.com/manikanta7cheruku/studentos-app/actions/runs/42374027037 |
| Environment check against the local stack (`pnpm env:check`) | 34 of 35 passed, 1 WARN; with `--production` it correctly says NOT READY (HTTP, sample data) |
| Deliberate breaks ("mutation checks") | every task lists its own in its learning note, section 11; each one made a test fail, then everything passed again after restoring |
| Real concurrency tests | two accepts for the last team slot give 200 and 409; eight identical requests at once create one record; two identical join requests give 201 and 409 |
| Speed with 4000 rows in each list (median) | team posts 48 ms, opportunities 38 ms, notifications 38 ms, announcements 124 ms |

### Release checklist gates owned by R2

| Gate (RELEASE_CHECKLIST) | Status | Evidence or owner |
|---|---|---|
| S1 CI green on `main` | ✔ | run link above |
| S1 Tenant isolation and permission suite pass, RLS coverage check passes | ✔ | pgTAP `001` and `002`, permission matrix, `postgrest-exposure.test.ts` |
| S1 Journeys J1 to J9 pass on staging | ☐ | R5 and R3 (needs staging and the screens) |
| S1 No open Sev1 or Sev2 bugs | ☐ | R5 and R1 bug list. R2 knows of none |
| S1 Incomplete features hidden | ✔ | unbuilt endpoints do not exist (404); college tab flags are enforced by the API |
| S1 Docs synced with code | ✔ | `registry.test.ts`, `docs-sync.test.ts` fail when they disagree |
| S1 Learning files for every built feature, walkthrough drill passed | ◐ | 15 R2 build-session notes exist (one or two for every day). The drill by a human has not been done (`docs/R2_MANUAL_STEPS.md` section F) |
| S1 Health, ready and error tracking | ◐ | `/api/health`, `/api/ready` done. Error tracking service: R5 |
| S2 Production environment separate from staging | ☐ | owner; guide `docs/PRODUCTION_SETUP.md` |
| S2 Hosting and database plans allow commercial use and include backups | ☐ | owner |
| S2 Backup restore tested, rollback rehearsed | ☐ | owner and R5; steps in `docs/PRODUCTION_SETUP.md` section 9 |
| S2 Security checklist: secrets scan, dependency audit, CSP, rate limits, admin 403 tests | ◐ | done by R2, see section 4. R5 repeats the scans independently (R5-D8-1) |
| S2 Privacy notice, terms, minors policy, counsel | ☐ | R1 |
| S2 Licensing gate | ◐ | package licences listed in section 4. R1 and R5 own the register |
| S2 Pilot admin named, onboarding runbook rehearsed | ◐ | the college script is tested locally. Rehearsal on staging: owner |
| S2 k6 baseline and Lighthouse | ◐ | R2 measured its own list speeds. k6 and Lighthouse: R5 |
| S2 Failure drills F3, F5, F20, F21 | ☐ | R5 |

✔ done with evidence, ◐ part done, ☐ not done.

## 4. Security review

### What was checked and fixed, by day

| Day | Finding | Result |
|---|---|---|
| 1 | Row level security on every table; audit log cannot be changed or deleted | tested, kept |
| 2 | Same answer for any email (no account probing); five wrong codes lock the email; cookies only | tested |
| 3 | Admin power checked twice (code and database); last admin cannot be removed; one audit row per change | tested |
| 4 | No security headers; write limit missing on join and logout; SQL validation errors broke the error contract; no table of who may call what | fixed, tested, table is now checked by a test |
| 5 | Two accepts for one slot; double click on a request; team link privacy | fixed with row locks and a unique index, tested with real concurrency |
| 6 | Retry protection had a gap (two identical requests at the same moment both ran); contract missing two notification types | fixed (claim the key first); contract completed |
| 7 | Tab flags only hidden in screens | enforced in the SQL for opportunities |
| 8 | Sign in had no Origin check (login CSRF); reads unlimited; request bodies read before the size check; tab flags not enforced for Team Finder and announcements; avatar bucket missing (fake URL saved, SVG allowed, signed link skipped the checks); skills saved without a transaction; the Team Finder list was slow | all fixed, tested, each with a deliberate break |
| 9 | Local sign in had automatic email confirmation on (anyone could create an account for an email they do not own) | switched off locally, the environment check fails production if it is on |
| 5 to 9 | Review of R3's profile PR found the people directory returned 503 for every member (hidden by mocked tests) | fixed, now tested against the real database |

### Controls now in place (each has tests)

Row level security everywhere and plain 404 for another college; every server function re-checks the actor; 60 changes and 300 reads a minute per person; extra limits on codes, joins and the waitlist; Origin check on every change; security headers and a Content Security Policy; JSON up to 100 KB and avatars up to 2 MB cut off while read; retries are safe; audit rows for every moderator and admin change; no email in logs, audit rows or notifications; account deletion with an emailed code; the maintenance call is locked by a secret.

### Dependency audit (`pnpm audit --prod`, 2026-11-07)

| Severity | Package | Where | Assessment |
|---|---|---|---|
| moderate | `minimatch` (denial of service through a crafted pattern) | `shadcn` > `ts-morph` | `shadcn` is used for one CSS import (`shadcn/tailwind.css`), its command line tool is not run by the server. Low real risk. R5 owns the update |
| low | `deepmerge` (prototype pollution in `mergeObject`) | `shadcn` | same. Dependabot already opened an update |

No high or critical findings. No finding is in code that handles requests.

### Secrets scan (`git grep` over all tracked files)

No private keys, no Supabase secret keys, no cloud or chat tokens, no real JWTs, no tracked `.env` file. The `.env.example` rule (names with KEY, SECRET, TOKEN, PASSWORD must be empty) is enforced by a test. The only keys in the repository are the well known public demo keys of the local Supabase stack, in documentation. R5 repeats this scan with a dedicated tool.

### Licences of production packages (`pnpm licenses list --prod`)

270 MIT, 13 ISC, 11 Apache-2.0, 6 BSD-3-Clause, 4 BSD-2-Clause, 2 BlueOak-1.0.0, 1 0BSD, 1 MIT or CC0. Two to record in the licensing register: `@img/sharp-win32-x64` (Apache-2.0 and LGPL-3.0-or-later; the image library that Next.js uses; a prebuilt binary used as a separate library) and `caniuse-lite` (CC-BY-4.0, browser data, attribution). No GPL or AGPL.

## 5. Known limits and risks

| # | Risk or limit | Effect | Plan |
|---|---|---|---|
| 1 | No reviewer other than the author has read the security SQL (rule: AI rule 7) | A mistake could survive all tests | Review list in `docs/R2_MANUAL_STEPS.md` section C, before S2 |
| 2 | Nothing has run against a hosted Supabase project | Hosted settings (code length, expiry, SMTP, backups) are unverified | Owner follows `docs/PRODUCTION_SETUP.md`, then `pnpm env:check` |
| 3 | The maintenance job is not scheduled yet | No reminders sent, old rows kept. Nothing breaks: past-deadline items already read as expired | Add the secrets, the workflow is ready |
| 4 | Sign in mail depends on the email sender and its limits | Codes may be delayed or limited | Custom sender, RB-03 runbook |
| 5 | Accounts are deleted at once after the emailed code (no grace period, no export) | A mistake cannot be undone | Product decision (section 7) |
| 6 | The `007_admin` database test only passes on a fresh database | A confusing failure for a new developer | R5 carryover |
| 7 | Announcements list takes about 124 ms with 4000 rows | Fine for now | Optimise only if real data shows a problem |
| 8 | Projects and portfolio, tracker, achievements, roster import, export, platform admin are not built | Screens for these cannot work | Section 7 decisions |
| 9 | The signed avatar upload link has no step that attaches the file | Only `POST /me/avatar` works end to end | R3 uses `POST /me/avatar` |
| 10 | The audit log keeps the user id of a deleted account (an anonymous number) | Needed so the record of moderation stays | Mention in the privacy notice (R1) |

## 6. How the work was done (honest note)

All R2 code, tests and documents were written by an AI assistant (Claude Code) from the roadmap, the contract documents and the feedback of the owner, with the owner running the project. Each task lists the AI use in its learning note (sections 15 and 16). The author's checks were automated: tests, deliberate breaks, builds and scans. What a human has **not** done yet: read the SQL line by line, review a pull request as a second person, run the walkthrough drill, set up the hosted services. The "What I learned today" lines in the daily files are drafts for the owner to rewrite.

## 7. What must happen before S2 (limited beta)

| Owner of the action | Action |
|---|---|
| Owner | Staging and production accounts, sign in settings, email sender, secrets, scheduler (`docs/R2_MANUAL_STEPS.md` A and B) |
| Owner and R5 | `pnpm env:check --production` says READY; restore drill done and recorded |
| A reviewer who is not the author | Review of Days 1 to 9 (section C of the manual steps), then the tasks can be marked Done |
| R5 | Independent scans, journeys on staging, speed test on staging, failure drills |
| R1 | Privacy notice, terms, minors policy, the numbers in section D of the manual steps, the go or wait checklist |
| R3 | Push the tracker for review (R2-D7-2), build leave college and delete account screens, use the contracts as written |
| Owner (product) | Decide which unbuilt endpoints the first release needs |

## 8. Sign-off

| Role | Name | Date | Decision (Go / Delay / Narrow) |
|---|---|---|---|
| Tech lead (R2) | | | |
| Release owner (R5) | | | |
| Product (R1) | | | |
| Owner | | | |
