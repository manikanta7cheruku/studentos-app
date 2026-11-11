# Redesign and refactoring notes (R3, Day 11)

Date: 2026-11-11. Branch: `feat/redesign-v2`. Decisions: D-29 to D-32.

## Why
The first look (a calm cream, serif, editorial style with a 16px base) felt large, boring and like a template. Most students use a phone. The product also lacked what students use every week: plans for a match or an event, and a place to say an idea.

## What changed, by layer

### Design system
- `src/app/globals.css`: all tokens replaced. One dark theme, one brand gradient (`--grad`). New utilities `glass`, `bg-brand`, `text-brand`, `lift`, `stagger`, `shimmer`, `grain`. Base size 14px (14.5px on phones, D-28).
- Fonts: Bricolage Grotesque and DM Sans through `next/font/google` (was two local font files; the old files in `public/fonts` are unused and can be deleted).
- `ui/button.tsx`: new variants and sizes (gradient default, lift and press). `ui/switch.tsx` is new (replaces checkboxes for settings). `ui/input`, `ui/textarea`, `ui/skeleton`, `ui/dialog`, `ui/empty-state` restyled. The design rules test (`tests/ui/design-rules.test.ts`) now describes v2.
- New: `app/poster.tsx` (gradient cover), `app/choice-card.tsx`, `app/create-sheet.tsx`, `lib/time-ago.ts`.

### Shell and navigation
- `features/college/college-shell.tsx`: glass dock on phones (Home, Plans, Ideas, You and a separate create button), sidebar on desktop, a space switcher chip. Campus, People, Careers and Admin moved to the You page and the desktop "More" list.
- `homePath(slug)` is now `/c/{slug}/home` for every space (it was Campus or Collaborate).

### Frontend
- New: Home feed (`features/home`), Ideas (`features/ideas`: list, new, detail with comments and replies), Careers placeholder, college setup (`features/auth/setup-screen.tsx`, route `/setup`), welcome hero.
- Rebuilt: landing page (`app/page.tsx`, the waitlist form and FAQ are no longer on it), sign in (welcome), choose space (`/find`), `AuthFrame`, `PostRow` (now a plan card), team finder list, plan form (sport and event have a start time, a place and a player count), plan detail, You page (More menu), `OtpInput` (any length).

### Backend
- Migration `20261114000000_ideas_plans_college_codes.sql`: Team Finder kinds `sport` and `event`, `team_posts.place` and `tf_set_place`; tables `ideas`, `idea_votes`, `idea_comments` and the `idea_*` functions; `college_setup_codes`, `make_college_setup_code`, `college_setup_create`.
- Routes: IDE-01 to IDE-08 (`/c/{slug}/ideas/...`) and COL-01 (`/colleges/setup`). Contracts `src/contracts/ideas.ts` and `setup.ts`. Modules `modules/ideas/ideas.admin.ts` and `modules/tenancy/college-setup.admin.ts`.
- `tf_post_json` was replaced with the same function plus the `place` key (same signature).

### Tests
- Unit: all pass (452). pgTAP: `015_ideas_college_codes.test.sql` (new). Integration: `tests/integration/ideas.test.ts` (new). E2E: URLs changed from `/campus` to `/home`, the admin settings test uses the switch, and the Careers spec is skipped (D-31).
- NOT run here: pgTAP, integration and E2E need Docker and the local Supabase, which this machine did not have running. They run in the pull request checks. Expect to fix small things there.

## Behaviour that changed on purpose
- After sign in people land on Home (the feed), not Campus.
- The Careers tab is a placeholder. `/career/tracker/...` and `/career/opportunities` still work by address but nothing links to them.
- The "Also show closed and full plans" control, the admin settings and the announcement options are switches now.
- A plan of kind sport or event uses `deadline` as its start time (it expires when it starts).

## Risks and things to watch
1. The migration replaces `tf_post_json`. If a later migration also replaces it, merge the `place` key.
2. Ideas have no report button yet. Removing is possible for the author and for a moderator or admin. Add reports before Global gets many people (see STATUS.md).
3. E2E tests of the old screens may still use texts that changed. They run in CI; fix there.
4. `NEXT_PUBLIC_API_MOCKING=enabled` now also serves sample ideas and a sample college setup (`src/mocks/handlers-ideas.ts`), so the screens can be tried without a database.
5. Setup codes have 8 digits and a 5 tries an hour limit. A person with many accounts could try more; the codes are single use and expire, so the risk is low but real.

## Rollback
Revert the merge commit. The migration is additive (new tables and functions, one constraint widened, one column added). To undo the database part: drop the `idea_*` functions and the three idea tables, `college_setup_codes` and its two functions, `tf_set_place`, drop column `team_posts.place`, and restore the old kind constraint (only if no sport or event post exists).
