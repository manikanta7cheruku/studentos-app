# Backend status (what is built, what is not)

Written by R2 on Day 9 (R2-D9-1). The lists below are checked by tests (`tests/docs-sync.test.ts`, `src/contracts/registry.test.ts`): an endpoint that exists but is missing here, or an endpoint in `docs/API_CONTRACT.md` that is neither built nor listed under "Not built", fails the build.

## 1. Built endpoints

One line per area. The full list with who may call each one is `docs/PERMISSIONS.md`. Shapes are in `docs/openapi.v1.json` (generated) and `src/contracts`.

| Area | Endpoint ids | Notes |
|---|---|---|
| System | SYS-01, SYS-02 | health, ready, and the scheduler call `POST /api/internal/maintenance` |
| Sign in and account | AUTH-01, AUTH-02, AUTH-03, AUTH-04, AUTH-05, AUTH-06 | email code, cookies, logout, delete my account (two steps), Continue with Google (start and callback) |
| College and joining | TEN-01, TEN-02, TEN-03, TEN-04, TEN-05, TEN-07, TEN-08, TEN-09 | public branding with `modules`, membership, invite code, manual, college email, leave a college, my colleges, join the Global space |
| College admin | ADM-03, ADM-05, ADM-06, ADM-07, ADM-08, ADM-09, ADM-10, ADM-11 | settings, invites, queue, members, audit, stats |
| Profile | PRF-01, PRF-02, PRF-03, PRF-04, PRF-05, PRF-06 | own profile, skills, avatar, people directory, one classmate (PRF-01 to PRF-05 built by R3, fixed and tested by R2) |
| Notifications and moderation | NTF-01, NTF-02, ANN-01, ANN-02, RPT-01, RPT-02, RPT-03, RPT-04, RPT-05, WL-01 | notifications, announcements, reports, blocks, waitlist |
| Team Finder | TMF-01, TMF-02, TMF-03, TMF-04, TMF-05, TMF-06, TMF-07, TMF-08, TMF-09, TMF-10 | posts, roles, requests, decisions |
| Career | OPP-01, OPP-02, OPP-03, OPP-04, REM-01 | curated opportunities, saved, reminders |
| Application tracker | APP-01, APP-02, APP-03, APP-04 | my applications, edit with a version check, status changes with a history (built by R3 in Day 7, private to the person) |
| Following, invites, debates | FOL-01, FOL-02, INV-01, INV-02, COL-02, IDE-10, DEB-01, DEB-02, DEB-03, DEB-04, DEB-05, DEB-06, DEB-07, DEB-08, DEB-09, DEB-10 | follows (private lists), invite links, college name suggestions, polls on buzz, topic debates that close by themselves (built by R3, Day 18) |
| Ideas and college setup | IDE-01, IDE-02, IDE-03, IDE-04, IDE-05, IDE-06, IDE-07, IDE-08, IDE-09, COL-01 | ideas with votes and replies, and college creation with a one-time owner code (built by R3 in Day 11); Team Finder gets the kinds sport and event and a place |
| Events and board | EVT-01, EVT-02, EVT-03, EVT-04, EVT-05, BRD-01, BRD-02, BRD-03, BRD-04, BRD-05, BRD-06, BRD-07 | events with RSVPs, Lost and found and the Marketplace with private messages (built by R3 in Day 12, no payments) |
| Open join and removal | TMF-11, TMF-12, ADM-13, ADM-14 | one tap join with a host note and a list of who joined, and removing content with a reason that reaches the author (built by R3 in Day 14) |
| Turf booking | VEN-01, VEN-02, VEN-03, VEN-04, VEN-05, VEN-06, VEN-07, VEN-08, VEN-09, VEN-10 | a directory of turfs and courts, booking requests that the manager confirms by hand, and notes to both sides (built by R3 in Day 16, no payments) |
| Network | NET-01, NET-02, NET-03 | people to meet and my network size (built Day 19) |
| Messages, feedback and photos | MSG-01, MSG-02, MSG-03, MSG-04, MSG-05, FDB-01, PHO-01, BRD-08 | disappearing text messages between classmates, a feedback note to the team, and one shrunk photo on a market or lost and found post (built by R3 in Day 17) |

## 2. Not built

These ids are in `docs/API_CONTRACT.md` but have no route yet. "Needs" says what must happen before they can be built.

| Id | What | Needs |
|---|---|---|
| TEN-06 | Claim a roster row | a decision on roster import (ADM-04) first |
| PRF-07 | Achievements | a product decision (P1, not needed for the first release) |
| PRJ-01, PRJ-02, PRJ-03, PRJ-04, PRJ-05, PRJ-06 | Projects and the public portfolio | a product decision and an owner (not in the roadmap for R2); the public portfolio also needs a privacy review |
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
