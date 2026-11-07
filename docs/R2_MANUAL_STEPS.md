# What only people can do to finish R2 (the owner's list)

Written by R2 on Day 9. Everything the AI could do is already merged (code, tests, scripts, docs). What is left needs a person: an account, a payment, a secret, a decision, a second pair of eyes, or the owner's own words. Tick the boxes as you go. The backend counts as finished when sections A to F are done and the sign-off in section H is filled.

How the work is split: **YOU** = the owner (admin). **R5** = QA and DevOps. **R3** / **R4** / **R1** = the other roles. **Reviewer** = any teammate who did not write the code.

## A. Accounts and settings that need your login and your money

| ✓ | What | Where it is explained | Who |
|---|---|---|---|
| ☐ | Supabase **staging** project (fake data) | `docs/STAGING_SETUP.md` sections 1 and 2 | YOU |
| ☐ | Supabase **production** project on the Pro plan, daily backups checked | `docs/PRODUCTION_SETUP.md` section 1 | YOU |
| ☐ | Sign in settings in both: Email on, **Confirm email ON**, code length 6, expiry 600, the two email templates pasted from `supabase/templates/otp.html` | `docs/PRODUCTION_SETUP.md` section 2 | YOU |
| ☐ | Email sender (SMTP) account, sending domain verified (SPF, DKIM, DMARC), pasted into Supabase | `docs/PRODUCTION_SETUP.md` section 3, choice in `docs/PROVIDER_CHECK.md` | YOU |
| ☐ | Vercel staging project, and a separate paid Vercel production project with your domain | `docs/STAGING_SETUP.md` section 3, `docs/PRODUCTION_SETUP.md` section 4 | YOU |
| ☐ | The settings in each Vercel project (new `APP_HASH_SECRET` and `CRON_SECRET` for each, never reused, never changed later for `APP_HASH_SECRET`) | `docs/PRODUCTION_SETUP.md` section 4 | YOU |
| ☐ | GitHub secrets and variables (Supabase token, database passwords, project references, URLs, `STAGING_CRON_SECRET`, `PRODUCTION_CRON_SECRET`, `PRODUCTION_URL`) | `docs/STAGING_SETUP.md` section 2, `docs/PRODUCTION_SETUP.md` section 8 | YOU |
| ☐ | A password manager with the database passwords, keys and secrets, shared with at most two people for production | `docs/PRODUCTION_SETUP.md` section 0 | YOU |
| ☐ | A domain name and its DNS records | `docs/PRODUCTION_SETUP.md` section 0 | YOU |

R2 cannot create accounts, pay, or paste secrets. That is a safety rule, not a missing feature.

## B. Commands you run (with the project open on your computer)

| ✓ | Command | What it does | When |
|---|---|---|---|
| ☐ | `pnpm supabase login`, then `pnpm supabase link --project-ref <ref>` | connects your computer to a Supabase project | once per project |
| ☐ | `pnpm supabase db push --dry-run`, then `pnpm supabase db push` | applies the migrations to staging (the workflow does this by itself after merges) and to production | production: before the first deploy and before every release that has a new migration |
| ☐ | the first college: sign in once as the admin, then run `supabase/production/create-college.sql` in the SQL editor | creates the college, its email domain and its first admin | `docs/PRODUCTION_SETUP.md` section 6 |
| ☐ | `pnpm env:check --app <address> --env <file outside the repo> [--production]` | about 40 read-only checks, ends with READY or NOT READY | staging now, production before go-live, and after every release |
| ☐ | Actions, Maintenance, Run workflow | proves the hourly job works (HTTP 200) | after the secrets exist |
| ☐ | the restore drill | proves a backup can be restored and writes the real recovery time | `docs/PRODUCTION_SETUP.md` section 9, before real students |

Never run `supabase db reset` or load `supabase/seed.sql` on production. The check script fails if it finds the sample people.

## C. Independent review (the rule: the author cannot approve their own security code)

Nothing from R2 may be marked **Done** until a reviewer approves. One reviewer can do several. Give them this list:

| Pull request | What to read | Time |
|---|---|---|
| #10 Day 1 | `supabase/migrations/20261031000000_*.sql`: policies, grants, the audit log rules | 45 min |
| #14, #15 Day 2 | `src/modules/auth`, `src/modules/tenancy`, the join functions in `20261031020000_*.sql` | 60 min |
| #22 Day 3 | `20261031030000_admin_endpoints.sql` (the `admin_*` functions) and the admin routes | 60 min |
| #29, #30 Day 4 | `20261101000000_*.sql` (moderation, reports, notifications), `next.config.ts` | 60 min |
| #31 Day 5 | `20261107000000_team_finder.sql` (locks, visibility), `src/modules/teamfinder` | 60 min |
| #32 Day 6 | `20261108000000_*.sql` (the idempotency claim, `maintenance_run`), `src/lib/idempotency.admin.ts` | 45 min |
| #33 Day 7 | `20261109000000_*.sql` (opportunities, reminders) | 45 min |
| #34 Day 8 | `20261110000000_hardening.sql`, `src/lib/api.ts`, `src/modules/engagement/context.ts`, the OTP routes | 45 min |
| Day 9 | `20261111000000_account_leave_profile.sql` (delete account, leave a college, view a profile), `src/app/api/v1/me/route.ts`, `supabase/production/create-college.sql`, `scripts/check-environment.mjs` | 45 min |
| Day 10 | the release review (written on Day 10, see docs/progress/R2_backend) | 20 min |

What the reviewer checks in every SQL function (from the lessons of the project):

1. It is `security definer` only when it must be, with `set search_path = ''`, and every name is written with `public.`.
2. Rights are removed from `public`, `anon` and `authenticated` and given to `service_role` only (or to `authenticated` for the few functions that run as the person).
3. It checks **again** that the actor is allowed (active member, moderator, owner) and filters by the college id. A foreign id gives 404.
4. A change writes exactly one audit row in the same transaction, and a refused call writes none.
5. No email, code, token or enrolment number is stored in a log, an audit row or a notification.
6. There is a test that fails if the rule is removed (the pull request lists the "break it on purpose" checks).

How to review: open the pull request, read the files above, run `pnpm verify`, `pnpm db:test` and `pnpm test:integration` if you can, then **Review changes, Approve** (or comment what is wrong). Then update the row in `docs/progress/R2_backend/PROGRESS.md` from "In review" to "Done" and add the reviewer's name in the notes. The older pull requests are merged already, so a finding becomes a follow-up pull request.

## D. Decisions only the product owner can make

| ✓ | Question | R2's suggestion |
|---|---|---|
| ☐ | Which unbuilt endpoints are needed for the first release (`docs/BACKEND_STATUS.md` section 2): projects and portfolio (PRJ), achievements (PRF-07), roster import (ADM-04), data export (ADM-12), platform admin screens (ADM-01, ADM-02) | Launch without them. Create colleges with the script. Plan PRJ and ADM-12 (privacy review) for the next release |
| ☐ | Join requests expire after 30 days, deadline reminders 48 hours before, 10 open posts and 10 waiting requests per person, 300 reads and 60 changes a minute | Keep, measure with real students, then adjust |
| ☐ | Should a college admin be told when a join request expires? Should expired posts be deleted after some months? | No and no for the first release |
| ☐ | CAPTCHA on sign in codes (needs a small change in the app) | After the pilot, if abuse shows up |
| ☐ | The minors policy, the privacy notice and the terms (the release checklist S2 blockers) | R1 with counsel, before the pilot |
| ☐ | Where backups are copied (a second provider), and who holds the two keys | `docs/BACKUP_AND_RELEASE_RUNBOOK.md` section 1 |

## E. What the other roles still owe R2

| ✓ | Who | What |
|---|---|---|
| ☐ | R3 | Push the tracker work (APP-01 to APP-04) so R2 can review it (R2-D7-2). Try one screen on the real API with `docs/CONNECTING_THE_API.md`. Use `POST /me/avatar` for avatars. Handle 404 `FEATURE_DISABLED` and 429 |
| ☐ | R4 | Switch the opportunities screens (PR #28) to the shapes in `src/contracts/opportunities.ts`. Avatar picker without SVG |
| ☐ | R5 | Run the scans (R5-D8-1) and the speed test on staging, add the 007 database test fix (it only passes on a fresh database), check the CI change that starts file storage, run the restore drill with you |
| ☐ | R1 | Confirm the numbers in section D, the legal items, and the go or wait checklist |

## F. Your own words (the project rule: learning must be understood, not only generated)

Every daily file under `docs/progress/R2_backend/daily/` (D01 to D10) has the line "What I learned today" marked **DRAFT by the AI, replace with your own words**. Every learning note under `docs/learning/R2_backend/build-sessions/` has a section 16 that lists what a human still has to verify. Do this, in order:

1. Read one learning note per day (they are written to be read in 15 minutes).
2. Replace the draft sentences in the daily file with 3 sentences in your words.
3. Try the walkthrough drill for the core flows: sign in, join with an invite code, admin approves, post a team request, accept it. Write in the learning index that you did.
4. If a team member's name should appear as reviewer or author, add it. The AI-use sections in the notes stay as they are (they are the project's honesty rule).

The commit rule you set (you are the only contributor, no AI trailers) was followed in `studentos-app`. If the `student-kit` repository still has a commit with a trailer, the clean-up needs your force push; the commands were given earlier in the chat.

## G. After go-live

- Look at the Vercel and Supabase dashboards every day for the first week (errors, slow queries, the hourly maintenance run).
- Run `pnpm env:check --production` after every release.
- Repeat the restore drill monthly (`docs/BACKUP_AND_RELEASE_RUNBOOK.md`).

## H. Sign-off

| Role | Name | Date | Decision (Go / Delay / Narrow) |
|---|---|---|---|
| Tech lead (R2) | | | |
| Release owner (R5) | | | |
| Product (R1) | | | |
| Owner | | | |
