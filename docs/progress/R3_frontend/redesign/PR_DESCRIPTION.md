# [R3][D11] Redesign: new look, ideas feed, sport plans, college setup with an owner code

## What this is
A full redesign of StudentOS plus the features it needs. Decisions D-29 to D-32 (docs/DECISIONS.md).

## Changes
- **Design system v2:** one dark theme and a brand gradient, glass dock and create sheet, new buttons, a new switch, plan and idea cards, skeleton shimmer, page and list motion (docs/DESIGN_SYSTEM.md).
- **Home feed:** plans and ideas of the space together, with a switch for each.
- **Ideas:** short text posts with votes and one level of replies. IDE-01 to IDE-08.
- **Plans:** two new kinds, sport and event, with a start time, a place and a player count.
- **Onboarding:** a welcome screen (Continue with Google), choose Global or your college, and a separate college admin path with a one-time owner code (`/setup`, COL-01).
- **Careers:** now a placeholder (D-31).
- **Landing page:** rebuilt.

## Database
Migration `20261114000000_ideas_plans_college_codes.sql` (additive). It is documented in docs/DATABASE.md and docs/API_CONTRACT.md section 15. Tests: pgTAP `015`, integration `ideas.test.ts`.

## How to try it
- Without a database: `NEXT_PUBLIC_API_MOCKING=enabled pnpm dev`, then open `/c/alpha/home`, `/signin`, `/find`, `/setup`.
- With the local stack: `pnpm db:start`, `pnpm dev`, sign in with `student1@alpha.test` (code in Mailpit).
- To give a college a setup code: run `supabase/production/create-setup-code.sql` in the SQL editor (docs/PRODUCTION_SETUP.md section 6a).

## Checks
- `tsc`, ESLint and the unit tests pass (452).
- Browser pane checks on the mock API at phone width: Home, Plans, Ideas list and detail, creating an idea, sign in, choose space, setup, You page; desktop sidebar.
- pgTAP, integration and E2E were written but not run on the machine that made this change (no Docker). The pull request checks run them.

## Review asks
- R2: the migration (new functions, the replaced `tf_post_json`, the setup code function and its rate limit).
- R5: browser tests of the new screens at phone width, the dock, the create sheet and the switch with a keyboard.
- Owner: look at it on a real phone.

## Not in this PR
See docs/progress/R3_frontend/redesign/STATUS.md: reporting ideas, profile and settings polish, the admin screens polish, the platform admin dashboard, notifications for ideas, search.
