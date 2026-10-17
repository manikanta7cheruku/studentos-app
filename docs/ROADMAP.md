# Roadmap: 10 build days

This is the plan. Each person has day prompts in their role folder. If a day is not finished, work continues the next day and is reported in Slack. If more days are needed, we add days. We never skip tests or security checks to save time.

Task IDs look like R2-D3-1 (role, day, number). Branch names look like r2/d3-admin-api.

## Phases and checkpoints

| Day | Phase | Goal | Checkpoint |
|---|---|---|---|
| 1 | Phase 1: Foundation | Everyone can build. Repo, checks, database base, app shell, UI kit. |  |
| 2 | Phase 2: Sign in and join | A person can sign in and join our college space. | Checkpoint 1 (end of Day 2): sign in, join with invite code and college email, pending screen, all working on staging. |
| 3 | Phase 3: Profile and admin | Students have profiles. Admins can approve people and manage the college. |  |
| 4 | Phase 4: Projects, notices, safety | Portfolio projects, notifications, announcements, reports, security check 1. | Checkpoint 2 (end of Day 4): profile, admin console, projects, notifications, announcements, reports working on staging. |
| 5 | Phase 5: Team Finder build | Team posts, roles, requests, safe accept with slot counting. |  |
| 6 | Phase 6: Team Finder finish and student test | Team Finder works end to end. 5 students test it. | Checkpoint 3 (end of Day 6): Team Finder works end to end on staging. 5 students have tested it. |
| 7 | Phase 7: Career tools | Application Tracker and curated opportunities. | Checkpoint 4 (end of Day 7): every selected journey works on staging (sign in to tracker). |
| 8 | Phase 8: Make it strong | Fix weak spots. Failure handling, accessibility, full regression. |  |
| 9 | Phase 9: Release candidate | Production setup, runbooks, docs match code, final fixes. | Checkpoint 5 (end of Day 9): release candidate on staging. Production ready. Docs match code. |
| 10 | Phase 10: Release decision | Go or wait. Start the pilot at our college if all gates pass. | Release decision (Day 10): go, wait, or narrow. Gates cannot be voted away. |

## What comes after Day 10 (later phases, already designed in the docs)
- Phase 11: Lost and Found, events, roster import.
- Phase 12: marketplace without payments, notes, activities, skill exchange.
- Phase 13: resume tools, roadmap, daily plan, weekly review, interview practice.
- Phase 14: reputation signals, cross college network (only if safe), more colleges.
Each phase starts only after the previous release gates pass and student feedback is read.

## Who works at the same time
On every day all five roles have tasks. They do not wait for each other because of the contract (src/contracts) and sample data. The main order rule: the foundation (Day 1 and 2) must be solid before features.


## Day 1: Phase 1: Foundation

- **R1-D1-1** Run the kickoff and record decisions. Branch: `r1/d1-kickoff-decisions`
- **R1-D1-2** Book interviews at our college. Branch: `r1/d1-book-interviews`
- **R1-D1-3** Collect a short ownership note from each teammate. Branch: `r1/d1-ip-notes`
- **R2-D1-1** Database foundation (tenants, members, audit). Branch: `r2/d1-db-foundation`
- **R2-D1-2** Contracts and sample data for Days 2 to 4. Branch: `r2/d1-api-contract`
- **R3-D1-1** App shell and API client. Branch: `r3/d1-app-shell`
- **R4-D1-1** UI foundation (tokens, fonts, base parts, sandbox page). Branch: `r4/d1-ui-foundation`
- **R4-D1-2** Set up the learning folder habit. Branch: `r4/d1-learning-setup`
- **R5-D1-1** Project scaffold and CI (do this first, tell Slack when done). Branch: `r5/d1-scaffold-ci`
- **R5-D1-2** Protect the main branch with the admin. Branch: `r5/d1-branch-protection`
- **R5-D1-3** Check provider pages. Branch: `r5/d1-provider-check`

## Day 2: Phase 2: Sign in and join

- **R1-D2-1** Do interview round 1 (6 students). Branch: `r1/d2-interviews-1`
- **R1-D2-2** Check the sign in and join rules with the team. Branch: `r1/d2-check-sign-in-rules`
- **R1-D2-3** Check font, icon and tool licences. Branch: `r1/d2-licence-check`
- **R2-D2-1** Login by email code. Branch: `r2/d2-auth`
- **R2-D2-2** Join a college (invite code, college email, manual). Branch: `r2/d2-join`
- **R3-D2-1** Sign in and join screens. Branch: `r3/d2-signin-join-screens`
- **R4-D2-1** Form parts and state parts. Branch: `r4/d2-forms-and-states`
- **R5-D2-1** College isolation and permission tests. Branch: `r5/d2-isolation-tests`
- **R5-D2-2** Staging environment. Branch: `r5/d2-staging`
- **R5-D2-3** Browser test setup and checkpoint 1. Branch: `r5/d2-e2e-setup`

Checkpoint 1 (end of Day 2): sign in, join with invite code and college email, pending screen, all working on staging.

## Day 3: Phase 3: Profile and admin

- **R1-D3-1** Start the simple Team Finder test in a college group. Branch: `r1/d3-concierge-test`
- **R1-D3-2** Write the privacy notice and terms (drafts). Branch: `r1/d3-legal-drafts`
- **R1-D3-3** Continue interviews (3 more students). Branch: `r1/d3-interviews-2`
- **R2-D3-1** Admin endpoints. Branch: `r2/d3-admin-api`
- **R2-D3-2** Review R3's profile backend. Branch: `r2/d3-review-profile`
- **R3-D3-1** Profile (backend and screens). Branch: `r3/d3-profile-slice`
- **R4-D3-1** Admin console screens. Branch: `r4/d3-admin-console-ui`
- **R5-D3-1** Join journey tests and licence check. Branch: `r5/d3-e2e-join-tests`

## Day 4: Phase 4: Projects, notices, safety

- **R1-D4-1** Finish interviews (3 students and 3 staff). Branch: `r1/d4-interviews-3`
- **R1-D4-2** Collect 10 real opportunities for the college. Branch: `r1/d4-opportunities-list`
- **R1-D4-3** Write the usability test plan for staging. Branch: `r1/d4-usability-plan`
- **R2-D4-1** Notifications, announcements, reports, waitlist. Branch: `r2/d4-notify-announce-report`
- **R2-D4-2** Security check 1. Branch: `r2/d4-security-pass-1`
- **R3-D4-1** Projects and portfolio. Branch: `r3/d4-projects-portfolio`
- **R4-D4-1** Notifications, announcements and report screens. Branch: `r4/d4-notify-report-ui`
- **R4-D4-2** Build the landing page. Branch: `r4/d4-landing-build`
- **R5-D4-1** Tests for admin, profile and projects. Branch: `r5/d4-admin-profile-tests`
- **R5-D4-2** Checkpoint 2. Branch: `r5/d4-checkpoint-2`

Checkpoint 2 (end of Day 4): profile, admin console, projects, notifications, announcements, reports working on staging.

## Day 5: Phase 5: Team Finder build

- **R1-D5-1** Write what the interviews tell us. Branch: `r1/d5-synthesis`
- **R1-D5-2** Check Team Finder rules with R2 and R3. Branch: `r1/d5-acceptance-review`
- **R2-D5-1** Team Finder database and API. Branch: `r2/d5-team-finder-backend`
- **R3-D5-1** Team Finder screens. Branch: `r3/d5-team-finder-ui`
- **R4-D5-1** Team Finder parts. Branch: `r4/d5-team-finder-parts`
- **R5-D5-1** Monitoring. Branch: `r5/d5-observability`
- **R5-D5-2** Team Finder tests. Branch: `r5/d5-team-finder-tests`

## Day 6: Phase 6: Team Finder finish and student test

- **R1-D6-1** Run 5 student tests on staging. Branch: `r1/d6-usability-sessions`
- **R1-D6-2** Write the Team Finder test result. Branch: `r1/d6-concierge-results`
- **R2-D6-1** Safe retries and expiry. Branch: `r2/d6-idempotency-expiry`
- **R2-D6-2** Help R3 connect the real API. Branch: `r2/d6-support-r3`
- **R3-D6-1** Requests and decisions. Branch: `r3/d6-requests-inbox`
- **R4-D6-1** States and phone layout for Team Finder and admin. Branch: `r4/d6-states-and-responsive`
- **R5-D6-1** Backup and restore drill. Branch: `r5/d6-backup-restore`
- **R5-D6-2** Checkpoint 3. Branch: `r5/d6-checkpoint-3`

Checkpoint 3 (end of Day 6): Team Finder works end to end on staging. 5 students have tested it.

## Day 7: Phase 7: Career tools

- **R1-D7-1** Check tracker and opportunity screens with real use. Branch: `r1/d7-career-check`
- **R1-D7-2** Prepare the go or wait checklist. Branch: `r1/d7-go-no-go-start`
- **R2-D7-1** Opportunities and reminders. Branch: `r2/d7-opportunities-reminders`
- **R2-D7-2** Review R3's tracker backend. Branch: `r2/d7-review-tracker`
- **R3-D7-1** Application Tracker (backend and screens). Branch: `r3/d7-tracker-slice`
- **R4-D7-1** Opportunities screens and tracker polish. Branch: `r4/d7-opportunities-ui`
- **R5-D7-1** Tracker and opportunity tests, small load test. Branch: `r5/d7-tracker-tests`

Checkpoint 4 (end of Day 7): every selected journey works on staging (sign in to tracker).

## Day 8: Phase 8: Make it strong

- **R1-D8-1** Run the bug bash with the whole team. Branch: `r1/d8-bug-bash`
- **R1-D8-2** Prepare the beta kit. Branch: `r1/d8-beta-kit`
- **R2-D8-1** Make the backend strong. Branch: `r2/d8-harden`
- **R3-D8-1** Loading, empty, error and offline on every screen. Branch: `r3/d8-states-sweep`
- **R4-D8-1** Accessibility and design review. Branch: `r4/d8-accessibility-pass`
- **R5-D8-1** Full regression, failure tests, security scans. Branch: `r5/d8-regression`
- **R5-D8-2** Bug triage with R1. Branch: `r5/d8-triage`

## Day 9: Phase 9: Release candidate

- **R1-D9-1** Finish legal items for the pilot. Branch: `r1/d9-legal-final`
- **R1-D9-2** Prepare the pilot. Branch: `r1/d9-pilot-plan`
- **R2-D9-1** Docs match code, production database. Branch: `r2/d9-docs-sync-prod-db`
- **R3-D9-1** Fix bugs and check speed. Branch: `r3/d9-bugfix-polish`
- **R3-D9-2** Learning walkthrough. Branch: `r3/d9-walkthrough`
- **R4-D9-1** Final UI fixes and learning curation. Branch: `r4/d9-final-ui-fixes`
- **R5-D9-1** Production setup and runbooks. Branch: `r5/d9-production-runbooks`

Checkpoint 5 (end of Day 9): release candidate on staging. Production ready. Docs match code.

## Day 10: Phase 10: Release decision

- **R1-D10-1** Lead the go or wait meeting. Branch: `r1/d10-release-meeting`
- **R1-D10-2** Retrospective and next phase plan. Branch: `r1/d10-retro-and-next`
- **R2-D10-1** Release review and retrospective. Branch: `r2/d10-release-review`
- **R3-D10-1** Release review and retrospective. Branch: `r3/d10-release-review`
- **R4-D10-1** Release review and retrospective. Branch: `r4/d10-release-review`
- **R5-D10-1** Lead the release review. Branch: `r5/d10-release-review`

Release decision (Day 10): go, wait, or narrow. Gates cannot be voted away.

## Extra work when you finish early (stretch)
- Lost and Found (R3 backend and screens, R4 parts).
- Roster import for verification (R2).
- More tests for any feature (R5).
Ask in Slack #daily-reports before starting a stretch task so nobody does the same thing.
