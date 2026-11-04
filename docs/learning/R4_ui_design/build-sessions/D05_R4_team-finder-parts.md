# Team Finder parts - build session

| Field | Value |
|---|---|
| Date / Author (role) | 2026-11-05 / R4 (UI and design) |
| Linked task / ADR / PR | R4-D5-1 / ADR-009 (UI primitives) / #26 |
| Related docs | docs/DESIGN_SYSTEM.md, docs/ACCESSIBILITY.md, docs/FEATURES_AND_JOURNEYS.md (F-11 Team Finder) |

## 1. What we are learning and why it is needed
Team Finder lets a student post what they are building and the roles they need, and lets other students request a role. R3 needs ready-made UI parts for the browse screen, the post detail and the request flow. We build the parts once, with sample data, so R3 does not wait for the backend.

## 2. What problem it solves
Without shared parts, each Team Finder screen would show role status, closed posts and errors in its own way. A student could also click "Request to join" on a post that is closed or full and only find out after sending. These parts show the state in text (not only colour) and block the action when it cannot work.

## 3. Concepts and terminology (short glossary)
- **Post card**: a summary of one team post with its roles and a "Request to join" action.
- **Role chip**: a small button for one role, showing "2 of 3 filled" and Open, Full, Closed, Expired or Filled.
- **Request dialog**: a popup where the student picks a role and writes a short note to the creator.
- **Filter bar**: search and filters. On phones the filters open in a bottom sheet with an "Apply filters" button.
- **Empty state**: the screen shown when there is nothing to list.
- **aria-pressed**: tells a screen reader whether a toggle button is on or off.
- **role="group"**: a labelled set of controls. We use it for the role picker because its chips are toggle buttons, not radio buttons.
- **Focus trap**: while a dialog is open, Tab stays inside it.
- **axe**: the automatic accessibility checker we run inside tests.

## 4. How it works internally (appropriate depth)
- **RoleChip** is a button. When the role is open it can be selected, and clicking it again deselects it. When the role is full, or the post is closed, expired or filled, it is disabled and the reason is written in the chip text. A filled post shows "Filled" on its chips, the same word as on the card.
- **RequestDialog** keeps the chosen role and the note. Submit is blocked until both exist, and an error summary links to the field with the problem (the role picker is `#request-role`). The role picker is a `role="group"` named "Role to join". The dialog gets `errorCode` from outside, so it can show a duplicate request or SLOTS_FULL error without knowing about the server. While `isSending` is true it shows a spinner. On close, focus returns to the button that opened it.
- **PostCard** shows the post details and role chips. "Request to join" is disabled with a written reason when the post is closed, expired or filled. It shows no student contact details (privacy rule for F-11).
- **FilterBar** has the filters inline on desktop. On phones it opens a bottom sheet. Edits inside the sheet stay in local state until "Apply filters" is pressed. Closing the sheet without applying discards them. The sheet overrides the default zoom animation (zoom-in-100, zoom-out-100) so it keeps full width. The search box has a max length of 80.
- **Empty states**: NoPostsEmptyState, NoFilterResultsEmptyState, NoRequestsEmptyState, and a TeamFinderEmptyState helper that picks one.

## 5. How it is used in StudentOS (files/modules)
- Parts, in `src/features/team-finder/`: `post-card.tsx`, `role-chip.tsx`, `request-dialog.tsx`, `filter-bar.tsx`, `empty-states.tsx`, `sample-data.ts`, `types.ts`, `index.ts`. Import from `@/features/team-finder`.
- Demo page: `src/app/dev/components/team-finder-parts.tsx`, added to `src/app/dev/components/page.tsx` (shown on `/dev/components`).
- Tests: `tests/ui/team-finder.test.tsx`, `tests/a11y/team-finder.test.tsx`.
- R3 will use the parts on the Team Finder screens.

## 6. Request/response and data flow (diagram or numbered trace)
No server request yet. Flow for a request:
1. The student presses "Request to join" on a PostCard (enabled only when the post is open).
2. RequestDialog opens and focus moves inside it. The student picks a role chip (full roles cannot be picked).
3. The student writes a note and presses "Send request".
4. If the role or note is missing, an error summary appears, takes focus, and links to the field.
5. If both exist, the dialog gives the selected role and the trimmed note to its parent.
6. Later, R3 connects the parent to the API. The parent passes `errorCode` back if the server says duplicate or SLOTS_FULL.

## 7. API methods, endpoints, schemas, status codes
Not built here. The API for Team Finder is TMF-01..TMF-09 in docs/API_CONTRACT.md. Duplicate request is 409. Role full is 409 `SLOTS_FULL`. The dialog only shows these errors when given an `errorCode`.

## 8. Database changes and relationships
Not applicable. Related tables (for R2): `team_posts`, `team_post_roles`, `team_post_role_skills`, `join_requests`.

## 9. Authentication / authorization behaviour
Not applicable. The parts do not check permissions. A disabled button is not security. The server must check login, membership, college and the post again.

## 10. Errors and edge cases
Bugs found and fixed on this task:
- A selected role could not be deselected. Clicking it again kept it selected (sandbox and dialog). Fixed in commit 7fede18, with a test. This was found by the browser keyboard check, where Space did not toggle the chip off.
- The phone filter sheet told the parent about every edit before "Apply filters". Fixed in commit 18f8fde.
- The role picker used `role="radiogroup"` but holds toggle buttons. Changed to `role="group"` in commit 9353aa9.
- Role chips on a filled post said "Closed" while the card said "Filled". Fixed in commit 1b2f266. Two old tests expected "Closed" and were updated to "Filled". No test was deleted.
- The bottom sheet shrank from 360px to 342px because of the default zoom animation. Fixed in commit da5a5f3.
Other cases:
- Role full, or post closed, expired or filled: chips and the request action explain it in text.
- Duplicate request and role full after submit: shown from `errorCode`.
- The same error text can appear twice on screen (summary and field), so tests use `getAllByText`.

## 11. Tests: what exists and how to run them (exact commands)
- All checks: `pnpm verify`
- Only these tests: `pnpm vitest run tests/ui/team-finder.test.tsx tests/a11y/team-finder.test.tsx`
- Last run: `pnpm verify` passed all 5 steps. 27 test files, 301 tests passed. `tests/ui/team-finder.test.tsx` has 34 tests and `tests/a11y/team-finder.test.tsx` has 5. The build succeeded.
- New test: "deselects role when clicked again and shows error on submit".
- Commit `4e04fdb` first failed `format:check`. I ran Prettier and the second run passed.

## 12. How to debug common failures
- Format check fails: `pnpm exec prettier --write <file>`.
- Dialog error link does nothing: check that `#request-role` exists exactly once on the page.
- Chip cannot be selected: check the role's filled count and the post status.
- Phone sheet looks narrow: check the zoom animation classes on the sheet.
- Filter edits leak to the parent: check that the sheet's change handler only updates local state.

## 13. Security considerations
- No student contact details are shown on the card.
- Only sample data is used. No real student data, no secrets.
- Hiding or disabling a button is not security. R2's API must enforce the rules.

## 14. Alternatives and trade-offs
- State is written as text, not only colour. The cost is wider chips.
- The dialog does not call the API itself. This keeps it easy to test and lets R3 decide how to send the request.
- `role="group"` with toggle buttons is more honest than `radiogroup`, which promises arrow-key behaviour we do not build.

## 15. What AI generated or suggested (prompts used, summary)
- Antigravity wrote the Team Finder parts, the tests, and the four bug fixes (commits 18f8fde, 9353aa9, 1b2f266, da5a5f3), and gave me a walkthrough of each.
- Antigravity wrote and ran a Playwright script (a temporary file, now deleted) that used only the keyboard to check Tab order, role chips, the dialog focus trap, the error summary links, and Escape with focus return.
- Claude (chat) gave me the two-line change for deselecting a role and a safe script that replaced the text only if it matched once.
- Antigravity wrote the "deselect" test from a prompt I gave it.

## 16. What a human verified (how: ran tests, read code, checked docs, tried to break it)
- I ran `pnpm verify` and saw all 5 steps pass (27 files, 301 tests, build OK).
- I read `git diff` and `git status` before each commit so only expected files changed.
- I fixed the Prettier failure and ran verify again.
- I read the Antigravity keyboard report. 8 of 9 checks passed. The one failure was the role chip bug above, which I then fixed.
- Still to do by hand: Escape on the phone filter sheet (edits discarded), focus returning to the Filters button, and VoiceOver on the role picker (should say group "Role to join" and read each chip as a toggle button).

## 17. What each teammate can now explain/implement independently
(Edit this in your own words.)
- A closed or full post is explained in text, so colour-blind and screen reader users get the same information, and nobody sends a request that cannot work.
- The dialog takes `errorCode` instead of calling the API, so it is easy to test and R3 decides how requests are sent.
- On a phone, filter edits are kept inside the sheet. They only reach the parent when "Apply filters" is pressed, and they are thrown away if the sheet closes without applying.

## 18. Further learning resources
- docs/ACCESSIBILITY.md and docs/DESIGN_SYSTEM.md in this repo.
- Official docs for the Radix primitives we use (check the Radix website).

## 19. Docs updated because of this (per trigger table)
- docs/progress/R4_ui_design/PROGRESS.md, CARRYOVER.md and daily/D05_R4.md
- docs/learning/R4_ui_design/INDEX.md

## 20. Walkthrough drill: passed by / date
Not yet.
