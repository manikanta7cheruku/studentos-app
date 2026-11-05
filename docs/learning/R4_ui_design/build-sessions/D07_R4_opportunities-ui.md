# Opportunities screen - build session

| Field | Value |
|---|---|
| Date / Author (role) | 2026-11-05 / R4 (UI and design) |
| Linked task / ADR / PR | R4-D7-1 / none / PR link: add after the PR is opened |
| Related docs | docs/API_CONTRACT.md (OPP-01 to OPP-04, APP-01), docs/DESIGN_SYSTEM.md, docs/ACCESSIBILITY.md |

## 1. What we are learning and why it is needed
Students need to find curated opportunities and keep track of the ones they care about. We built the Opportunities screen: a list with four filters (type, skills, location, deadline), a Save/Unsave button, and an Add to tracker action.

## 2. What problem it solves
Without this screen a student cannot browse opportunities, narrow them down, or move one into their application tracker. Filters stored in the URL also let a student share or reload a filtered list.

## 3. Concepts and terminology (short glossary)
- **Mock API (MSW)**: fake handlers in `src/mocks/handlers.ts` that answer API calls while the real endpoints do not exist. It is switched on with `NEXT_PUBLIC_API_MOCKING=enabled` in `.env.local`.
- **Optimistic update with rollback**: the Save button changes at once, and if the server call fails the button goes back and an error shows.
- **Query params as filter state**: the four filters live in the URL, so the page can be reloaded or shared.
- **Toaster**: the component that shows short messages (toasts), for example after Save.
- **TODO(R2)**: a marker on a local placeholder that R2 must replace with the real contract.

## 4. How it works internally (appropriate depth)
- The list reads the four filters from the URL and asks the API (the mock for now) for matching opportunities.
- Save/Unsave updates the button first, then calls the save endpoint. On failure it rolls back.
- Add to tracker creates an application. If the item is already in the tracker, the screen handles the duplicate and tells the student.
- The screen has loading, empty and error states and a phone layout.
- The `<Toaster />` now lives once in `CollegeAppShell`. It used to be only in the admin shell, so toasts never showed on career pages. The admin copy was removed so admin pages do not show two toasts.

## 5. How it is used in StudentOS (files/modules)
- `src/features/opportunities/` (new files)
- `src/app/c/[slug]/career/opportunities/` (new route)
- `src/app/c/[slug]/career/page.tsx` ("View tracker" link goes to `/career` for now)
- `src/app/dev/components/` (demo page plus `opportunities-parts.tsx`)
- `src/mocks/handlers.ts` (mock handlers)
- `src/features/tenancy/components/college-app-shell.tsx` (Toaster added)
- `src/features/admin/components/admin-layout-shell.tsx` (Toaster removed)
- Tests: `tests/ui/opportunities.test.tsx`, `tests/a11y/opportunities.test.tsx`

## 6. Request/response and data flow (diagram or numbered trace)
1. The student opens the Opportunities page. The filters are read from the URL.
2. The page asks for the list (OPP-01, mock for now).
3. The student changes a filter. The URL updates and the list reloads.
4. The student presses Save. The button changes at once, then the save call (OPP-04) runs. On failure the button rolls back.
5. The student presses Add to tracker. The create-application call (APP-01) runs, then a toast shows with a View tracker link.

## 7. API methods, endpoints, schemas, status codes
From `docs/API_CONTRACT.md`:
- OPP-01: GET `/c/{slug}/opportunities` (list and filter)
- OPP-04: PUT/DELETE `/me/saved-opportunities/{id}` (save and unsave)
- APP-01: POST `/me/applications` (create)
The contract has only the method and path for these. The response schemas in this PR are local placeholders marked `TODO(R2)`. The exact query param names also need R2 to confirm. Status codes are not verified against a real server.

## 8. Database changes and relationships
Not applicable for this PR. No database change was made by R4.

## 9. Authentication / authorization behaviour
The contract says OPP-01 and OPP-04 need an active membership and APP-01 needs a session. The screen does not decide permissions. The server must check them. Not tested against the real server.

## 10. Errors and edge cases
- **Real API not verified.** The screen works with the mock only. The real OPP-01, OPP-04 and APP-01 endpoints are not in `main` at the time of this PR, and R2 builds them on Day 7. The "done when" line "works with the real API" is NOT met.
- Save fails: the button rolls back.
- Add to tracker for an item already in the tracker: handled as a duplicate.
- Empty list, loading and error states exist.
- "View tracker" goes to `/career` (R3's placeholder, "No Career items yet"). Change it to `/career/tracker` when R3's tracker page exists.

## 11. Tests: what exists and how to run them (exact commands)
- All checks: `pnpm verify`
- Component test: `pnpm test tests/ui/opportunities.test.tsx`
- Accessibility (axe) test: `pnpm test tests/a11y/opportunities.test.tsx`
- Last `pnpm verify` result seen: format, lint and typecheck clean, 31 test files and 334 tests passed, build includes the opportunities route.

## 12. How to debug common failures
- Screen shows no data: check that `NEXT_PUBLIC_API_MOCKING=enabled` is in `.env.local`, then restart the dev server.
- No toast on career pages: check that `<Toaster />` is in `CollegeAppShell` and only there.
- Two toasts on admin pages: the Toaster is in both shells.
- `pnpm verify` fails on format: run `pnpm exec prettier --write` on the file.

## 13. Security considerations
Only fake data from the mock is used. No secrets and no real student data. `.env.local` must not be committed. The server must check membership and college isolation, because the screen only shows what it is given.

## 14. Alternatives and trade-offs
- Filters in the URL (chosen) let students reload and share a list, but need careful parsing. Filters in component state would be simpler but lost on reload.
- Optimistic Save feels fast, but needs a rollback for failures.
- Building against a mock lets R4 work before R2 finishes, but the contract may change once the real endpoints exist.

## 15. What AI generated or suggested (prompts used, summary)
The AI helped write the Opportunities screen, the filters, Save/Unsave, Add to tracker, the mock handlers, the Toaster move, the "View tracker" link fix and the tests. I used the Day 7 prompt for R4 (`DAY_07_PROMPT.md`).

## 16. What a human verified (how: ran tests, read code, checked docs, tried to break it)
- Ran `pnpm verify` and saw it pass (31 files, 334 tests, build OK).
- Checked in the browser: filters, Save, Add to tracker, the toast, and "View tracker" going to the Career page.
- Approved a person on `/c/test-college/admin/verification` and saw exactly one toast, so the Toaster move did not double up.
- Not checked yet: the real API (the endpoints are not built), staging, keyboard-only and screen reader use by hand, tracker polish with R3, and R3's review.

## 17. What each teammate can now explain/implement independently
- How the four filters live in the URL.
- How Save rolls back when the call fails.
- Why the Toaster is in `CollegeAppShell` once.
- How to run the mock and the tests.
- That real API verification depends on R2.

## 18. Further learning resources
- docs/API_CONTRACT.md in this repo
- docs/ACCESSIBILITY.md in this repo
- MSW documentation (mocking APIs)

## 19. Docs updated because of this (per trigger table)
This learning file, `docs/learning/R4_ui_design/INDEX.md`, `docs/progress/R4_ui_design/PROGRESS.md`, `daily/D07_R4.md` and `CARRYOVER.md`. Slack #changes: tell R2 about the OPP-01, OPP-04 and APP-01 placeholder schemas and the query param names, and tell the team the Toaster moved.

## 20. Walkthrough drill: passed by / date
Not done yet.
