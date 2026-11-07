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
