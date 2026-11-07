# Backend status (what is built, what is not)

Written by R2 on Day 9 (R2-D9-1). The lists below are checked by tests (`tests/docs-sync.test.ts`, `src/contracts/registry.test.ts`): an endpoint that exists but is missing here, or an endpoint in `docs/API_CONTRACT.md` that is neither built nor listed under "Not built", fails the build.

## 1. Built endpoints

One line per area. The full list with who may call each one is `docs/PERMISSIONS.md`. Shapes are in `docs/openapi.v1.json` (generated) and `src/contracts`.

| Area | Endpoint ids | Notes |
|---|---|---|
| System | SYS-01, SYS-02 | health, ready, and the scheduler call `POST /api/internal/maintenance` |
| Sign in and account | AUTH-01, AUTH-02, AUTH-03, AUTH-04 | email code, cookies, logout, delete my account (two steps) |
| College and joining | TEN-01, TEN-02, TEN-03, TEN-04, TEN-05, TEN-07 | public branding with `modules`, membership, invite code, manual, college email, leave a college |
| College admin | ADM-03, ADM-05, ADM-06, ADM-07, ADM-08, ADM-09, ADM-10, ADM-11 | settings, invites, queue, members, audit, stats |
| Profile | PRF-01, PRF-02, PRF-03, PRF-04, PRF-05, PRF-06 | own profile, skills, avatar, people directory, one classmate (PRF-01 to PRF-05 built by R3, fixed and tested by R2) |
| Notifications and moderation | NTF-01, NTF-02, ANN-01, ANN-02, RPT-01, RPT-02, RPT-03, RPT-04, WL-01 | notifications, announcements, reports, blocks, waitlist |
| Team Finder | TMF-01, TMF-02, TMF-03, TMF-04, TMF-05, TMF-06, TMF-07, TMF-08, TMF-09, TMF-10 | posts, roles, requests, decisions |
| Career | OPP-01, OPP-02, OPP-03, OPP-04, REM-01 | curated opportunities, saved, reminders |

## 2. Not built

These ids are in `docs/API_CONTRACT.md` but have no route yet. "Needs" says what must happen before they can be built.

| Id | What | Needs |
|---|---|---|
| TEN-06 | Claim a roster row | a decision on roster import (ADM-04) first |
| PRF-07 | Achievements | a product decision (P1, not needed for the first release) |
| PRJ-01, PRJ-02, PRJ-03, PRJ-04, PRJ-05, PRJ-06 | Projects and the public portfolio | a product decision and an owner (not in the roadmap for R2); the public portfolio also needs a privacy review |
| APP-01, APP-02, APP-03, APP-04 | Application tracker | R3 builds it (R3-D7-1); R2 reviews it (R2-D7-2) when it is pushed |
| ADM-01, ADM-02 | Platform admin: create or suspend a college | a "platform admin" role does not exist yet. The first colleges are created with `supabase/production/create-college.sql` (docs/PRODUCTION_SETUP.md section 6) |
| ADM-04 | Roster import | a decision (P1) |
| ADM-12 | College data export | a decision (P1) and a privacy review |

## 3. Background work

| Job | How it runs | What it does |
|---|---|---|
| Maintenance | `POST /api/internal/maintenance` about once an hour, with `CRON_SECRET` (docs/OBSERVABILITY.md section 11) | expires team posts and opportunities past their deadline, expires join requests older than 30 days, sends deadline reminders, deletes old idempotency keys, rate limit events, notifications, reminders and waitlist rows |

Until a scheduler calls it, nothing breaks: past-deadline items already read as expired, but no reminders are sent and old rows stay.

## 4. Limits and protections (all tested)

- 60 changes and 300 reads a minute per person; 120 a minute for moderator and admin calls; extra limits on sign in codes, joins and the waitlist (docs/PERMISSIONS.md).
- JSON bodies up to 100 KB, avatars up to 2 MB, cut off while read.
- Origin check on every change that a browser can make (CSRF), security headers and a Content Security Policy (docs/learning/R2_backend/build-sessions/D04_R2_security-pass-1.md).
- Retries are safe: `Idempotency-Key` is claimed before the work (docs/API_CONTRACT.md section 11).
- Every college is isolated: row level security, functions that re-check the actor, plain 404 for another college.
- Every moderator and admin change writes exactly one audit row.

## 5. Settings

The variables are listed in `docs/DEV_SETUP.md` (checked against `.env.example` by a test). Production values: docs/PRODUCTION_SETUP.md.

## 6. Open items that are not code

Reviews by a second person, staging and production setup, the scheduler, the scans, and the accounts only the owner can create: `docs/R2_MANUAL_STEPS.md`.
