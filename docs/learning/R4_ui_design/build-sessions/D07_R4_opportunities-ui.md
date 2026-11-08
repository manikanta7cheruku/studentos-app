# Opportunities screen - build session

| Field | Value |
|---|---|
| Date / Author (role) | 2026-11-05 / R4 (UI and design) |
| Linked task / ADR / PR | R4-D7-1 / none / https://github.com/manikanta7cheruku/studentos-app/pull/28 |
| Related docs | docs/API_CONTRACT.md (OPP-01 to OPP-04, APP-01), docs/DESIGN_SYSTEM.md, docs/ACCESSIBILITY.md |

## 1. What we are learning and why it is needed
Students need to find curated opportunities and keep track of the ones they care about. We built the Opportunities screen on the real API: a list with filters (type, skills, mode, location, deadline), search, My saved, a Save/Unsave button, and an Add to tracker button. Add to tracker was not checked against the real backend.

## 2. What problem it solves
Without this screen a student cannot browse opportunities, narrow them down, or move one into their application tracker. Filters stored in the URL also let a student share or reload a filtered list.

## 3. Concepts and terminology (short glossary)
- **Mock API (MSW)**: fake handlers in `src/mocks/handlers.ts` and `handlers-day7.ts` that the tests use. The mock returns one fixed list, so it cannot test filtering. The screen itself was checked against the local real API.
- **Optimistic update with rollback**: the Save button changes at once, and if the server call fails the button goes back and an error shows.
- **Query params as filter state**: the filters and search live in the URL, so the page can be reloaded or shared.
- **Toaster**: the component that shows short messages (toasts), for example after Save.
- **Contract types**: the screen takes its types from `@/contracts` (R2's contract). The old local stand-in schema was removed.

## 4. How it works internally (appropriate depth)
- The screen reads the filters (type, skills, mode, location, deadline, search q, saved) from the URL and calls OPP-01 through apiClient.
- Types come from @/contracts. The only UI-only field is in_tracker.
- Save/Unsave updates the button first, then calls PUT or DELETE /me/saved-opportunities/{id}. On failure it rolls back.
- The card hides the map pin when location is empty, hides the stipend line when both values are null, shows 'Posted by', an Expired badge from status 'expired', and a 'Changed since you saved' badge.
- If the college switched Career off, the API answers 404 FEATURE_DISABLED and the screen says 'Career is not available for your college.'
- One <Toaster /> is in src/app/c/[slug]/(app)/layout.tsx, so toasts show on every college screen.

## 5. How it is used in StudentOS (files/modules)
- src/features/opportunities/ (screen, card, filter bar, empty states, types)
- src/app/c/[slug]/(app)/career/opportunities/page.tsx
- src/features/campus/coming-soon.tsx (R3's file: optional cta prop) and src/app/c/[slug]/(app)/career/page.tsx (Browse opportunities link)
- src/app/c/[slug]/(app)/layout.tsx (R3's file: Toaster)
- src/app/dev/components/opportunities-parts.tsx (built from the contract fixture opp-01)
- Tests: tests/ui/opportunities.test.tsx, tests/a11y/opportunities.test.tsx, tests/helpers/opportunity-fixtures.ts

## 6. Request/response and data flow (diagram or numbered trace)
1. The student opens the Opportunities page. The filters and search are read from the URL.
2. The page asks for the list (OPP-01) through apiClient. If the college switched Career off, the API answers 404 FEATURE_DISABLED and the screen shows 'Career is not available for your college.'
3. The student changes a filter or types in search. The URL updates and the list reloads.
4. The student presses Save. The button changes at once, then PUT /me/saved-opportunities/{id} (OPP-04) runs. On failure the button rolls back. A toast shows.
5. Add to tracker posts to /me/applications (APP-01). That route is not on the backend yet, so this step was not checked against the real backend.

## 7. API methods, endpoints, schemas, status codes
From docs/API_CONTRACT.md and src/contracts:
- OPP-01: GET /c/{slug}/opportunities (filters kind, skills, mode, location, deadline, q, saved)
- OPP-04: PUT/DELETE /me/saved-opportunities/{id}
- 404 FEATURE_DISABLED when the Career tab is off (college_settings.features.career = false)
- APP-01: POST /me/applications is NOT on the backend yet. Add to tracker was not checked against the real backend.

## 8. Database changes and relationships
Not applicable for this PR. No database change was made by R4.

## 9. Authentication / authorization behaviour
The contract says OPP-01 and OPP-04 need an active membership and APP-01 needs a session. The screen does not decide permissions. The server must check them. Not tested against the real server.

## 10. Errors and edge cases
- Real data differs from the old sample data: location can be an empty string, stipend and deadline can be null, status can be 'expired'. The old stand-in schema rejected location '' and showed 'filter parameters were invalid'. Fixed by using the contract types.
- Career switched off: tested by setting features.career to false for alpha, then restoring features to {}. SEEN in a screenshot (message, Career missing from the sidebar). The restore SQL result was reported, not shown.
- Add to tracker: not checked. The 2 tracker tests pass only against a mock.
- Expired cards still show Apply, Save and Add to tracker (open question).
- Search sends a request on every keystroke (no debounce).

## 11. Tests: what exists and how to run them (exact commands)
- All checks: pnpm verify
- Component test: pnpm exec vitest run tests/ui/opportunities.test.tsx
- Accessibility (axe) test: pnpm exec vitest run tests/a11y/opportunities.test.tsx
- Last pnpm verify SEEN: format, lint and typecheck clean, whole suite 46 test files and 492 tests passed (earlier days' tests included), build ok.
- Tests use the contract fixture opp-01 through tests/helpers/opportunity-fixtures.ts. The mock returns one fixed list, so server-side filtering has no automated test.

## 12. How to debug common failures
- 'filter parameters were invalid': check the status. Only a 400 should say that. A response that does not match the schema also uses VALIDATION_FAILED.
- No toast: check that <Toaster /> is in src/app/c/[slug]/(app)/layout.tsx and only there.
- Opportunities missing for a college: check college_settings.features.career is not false.
- pnpm verify fails on format: run pnpm exec prettier --write on the file.

## 13. Security considerations
Only fake data is used (5 seeded fake listings on the local database, and contract fixtures in tests). No secrets and no real student data. `.env.local` must not be committed. The server must check membership and college isolation, because the screen only shows what it is given.

## 14. Alternatives and trade-offs
- Filters in the URL (chosen) let students reload and share a list, but need careful parsing. Filters in component state would be simpler but lost on reload.
- Optimistic Save feels fast, but needs a rollback for failures.
- Building against the real API found bugs a mock hid (empty location, null stipend, null deadline, expired status), but needs a seeded local database. Contract fixtures keep tests tied to the real shapes.

## 15. What AI generated or suggested (prompts used, summary)
The AI helped with the Opportunities screen, the fixes found while checking the real API, search and My saved, the Career page link, the Toaster, and rebuilding the tests from the contract fixture. It also wrote the seed script and the commands for each check. I used the Day 7 prompt for R4.

## 16. What a human verified (how: ran tests, read code, checked docs, tried to break it)
SEEN (terminal or screenshot): merge commit d487846, pnpm verify passing on the whole suite, the FEATURE_DISABLED message, 5 seeded listings, Expired badge, Career page button, save toast, 360px card, commit 8e7311f.
REPORTED by R4 without screenshots: search and My saved, all filters, Clear filters, save after reload, unsave toast, keyboard-only pass, rest of the 360px pass, click on Browse opportunities, the restore SQL result.
NOT checked: Add to tracker against the real backend, staging, screen reader, R3's review.

## 17. What each teammate can now explain/implement independently
- How the filters and search live in the URL.
- How Save rolls back when the call fails.
- Why the Toaster is in `src/app/c/[slug]/(app)/layout.tsx` once.
- How to run the mock and the tests.
- That real API verification depends on R2.

## 18. Further learning resources
- docs/API_CONTRACT.md in this repo
- docs/ACCESSIBILITY.md in this repo
- MSW documentation (mocking APIs)

## 19. Docs updated because of this (per trigger table)
This learning file, `docs/learning/R4_ui_design/INDEX.md`, `docs/progress/R4_ui_design/PROGRESS.md`, `daily/D07_R4.md` and `CARRYOVER.md`. Slack #changes: tell R3 about the optional cta prop on ComingSoon, the Toaster in the college app layout and the Career page wording; tell R3 and R2 that POST /me/applications is not on the backend.

## 20. Walkthrough drill: passed by / date
Not done yet.
