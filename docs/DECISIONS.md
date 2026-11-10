# Decisions (starting set)

These are the starting decisions. Change one only by adding a new row with a date and a reason.

| ID | Decision |
|---|---|
| D-01 | Pilot college is our own college. Multi college design from day one. |
| D-02 | First scope: sign in, college spaces, verification, admin console, profile and portfolio, Team Finder, Application Tracker, announcements, curated opportunities. Stretch: Lost and Found, roster import. |
| D-03 | Plan length is 10 build days. If a day is not finished, work continues next day and is reported in Slack. |
| D-04 | Modular monolith (one Next.js app plus Supabase). |
| D-05 | Team decides by talking, then majority vote. Area owner breaks ties. Security and isolation checks are not voted. |
| D-06 | Login by email code. Phone OTP is not proof of being a student. Verification: college email domain, invite code, manual approval. |
| D-07 | No payments. |
| D-08 | No AI features for users in v1. AI is only used to help us build, under the AI rules. |
| D-09 | Opportunities are added by hand by admins. No scraping. |
| D-10 | Later phases: marketplace, notes, events, activities, skill exchange, resume, roadmap, daily plan, interview practice, reputation, cross college network, anonymous posts, student ID upload. |
| D-11 | Hosting: free plans for building and staging with fake data. Real students need a paid plan with backups and a plan that allows commercial use. R5 checks the official pages on Day 1. |
| D-12 | Git: GitHub Flow with short branches and one pull request per task. |
| D-13 | Tenancy: shared tables with `college_id` and Row Level Security. Pages under `/c/{slug}`. |
| D-14 | UI is built in code with shadcn/ui and Tailwind. No Figma. |
| D-15 | Database and login: Supabase. |
| D-16 | Search: Postgres full text search. |
| D-17 | Tests: Vitest, Playwright with axe, pgTAP, k6 (small). |
| D-18 | Code licence: private repository, all rights reserved, until the owners decide with legal advice. |
| D-19 | Slack is the team chat. GitHub is for code. |
| D-20 | Content Security Policy allows inline scripts and styles (`'unsafe-inline'`), everything else is strict. Reason: nonce based CSP needs every page rendered per request, which does not work with our prerendered pages (Cache Components). Revisit with Subresource Integrity when stable. Owner: R2 |
| D-21 | Clean up and expiry run through one safe function `maintenance_run` that a scheduler calls over HTTP (`POST /api/internal/maintenance`, shared secret). Not pg_cron. Join requests expire after 30 days. Owner: R2 |
| D-22 | Opportunities belong to one college and are curated by moderators and admins (no platform wide list yet). Deadline reminders go out once per saved listing and deadline date, 48 hours before, unless the person switched them off. Owner: R2 |
| D-23 | Reads are limited to 300 a minute per person. A tab a college switched off (`features.campus`, `collaborate`, `career`) answers 404 FEATURE_DISABLED in the API. Avatars: JPEG, PNG, WebP, GIF, AVIF only, 2 MB, no SVG. Owner: R2 |
| D-26 | 2026-11-10. R3 **Day 4 (projects and public portfolio) is deferred** to after the first release: no backend exists for it (PRJ-01 to PRJ-06), nobody owns that backend, and a public page needs a privacy review first. R3 does Days 5, 6 and 7 next. |
| D-27 | 2026-11-10. **Posting to Global needs no new backend.** Global is a normal college space. "Post to My college or Global" (D-25) means the post is created in that space (`POST /c/{slug}/team-posts` with the slug of the college or `global`). A student can be a member of a college and of Global at the same time, and sees each space's posts in that space. Nothing is visible across colleges. |
| D-25 | 2026-11-08. Who comes into the app: anyone can sign in (email code, or Continue with Google). Then the person joins **their college** (college email, invite code, manual approval) or **Global**. Global is one special college with the open join method: active at once at level 1, not verified by any college, with limited features (no Campus tab) and posting limits. Only Global may use the open method (a database trigger enforces it). **Audience of posts (decided, built with Collaborate):** when a student creates a project, team post or event, they choose **My college** or **Global**. A Global post is visible to Global members and to every college member; a college post only to that college. Reason: not every college has a college email or is on StudentOS, and students want to team up across colleges. |
| D-24 | Colleges are created in production with `supabase/production/create-college.sql` until a platform admin exists (ADM-01). "Confirm email" is on in staging and production. Deleting an account is immediate after an emailed code (no grace period yet). Owner: R2 |
