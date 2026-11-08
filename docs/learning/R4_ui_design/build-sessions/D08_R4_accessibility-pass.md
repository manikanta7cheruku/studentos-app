# Accessibility pass and "do not" list review (R4-D8-1) - build session

| Field | Value |
|---|---|
| Date / Author (role) | 2026-11-08 to 2026-11-09 / R4 (UI and design) |
| Linked task / ADR / PR | R4-D8-1 (all 4 steps) / no ADR / PR number to add |
| Related docs | docs/ACCESSIBILITY.md, docs/DESIGN_SYSTEM.md, docs/TESTING.md |

## 1. What we are learning and why it is needed
Day 8 task R4-D8-1 has four steps: (1) run axe, an automatic accessibility checker, on every page and fix serious and critical problems, (2) test sign in, Team Finder and the tracker with the keyboard only, (3) try a screen reader on three flows, (4) review all screens against the "Do not do" list in docs/DESIGN_SYSTEM.md. docs/ACCESSIBILITY.md sets the target (WCAG 2.2 level AA) and the release gate: no unresolved critical accessibility problem on a main flow. Automatic checks find only part of the problems, so the keyboard, screen reader and design review are done by hand and with real browser tests.

## 2. What problem it solves
Before this, axe ran only inside unit tests (vitest with jsdom) on 7 test files. jsdom has no real layout, so those tests never saw phone layouts or signed-in pages. Now axe runs in a real browser on 33 pages at desktop and phone size, keyboard behaviour is tested with real key presses, and the screens were checked against the "do not" list that keeps the UI from looking AI generated.

## 3. Concepts and terminology (short glossary)
- **axe**: an automatic accessibility checker (the `axe-core` package, already in the repo).
- **Impact**: how bad a finding is: minor, moderate, serious, critical. Tests fail on serious and critical.
- **Accessible name**: the text a screen reader or voice control uses for a button or link. It comes from `aria-label` if present, otherwise from the visible content.
- **Label in name** (WCAG 2.5.3, axe rule `label-content-name-mismatch`): the accessible name must contain the visible text, or a voice control user who says what they see gets no response.
- **Landmark**: a page region such as `main` or `nav`. A page should have exactly one `main`.
- **Skeleton**: grey placeholder blocks shown while data loads.
- **role="status"**: marks an element as a polite live message and gives a plain `div` a role, so its `aria-label` means something.
- **Tab order, focus ring, focus trap**: the order Tab moves through controls, the visible outline on the focused control, and a place where Tab cannot leave.
- **Glass effect**: a see-through blurred background (`backdrop-blur`). It is on the "do not" list.
- **Flaky test**: a test that sometimes passes and sometimes fails on the same code.
- **Playwright project**: a browser setup in `playwright.config.ts`. We use `chromium` (desktop) and `phone` (Pixel 7).
- **Seed user**: a fake user created by `supabase/seed.sql` for local tests.
- **429 RATE_LIMITED**: the API refuses too many sign in code requests for one email in a short time.

## 4. How it works internally (appropriate depth)
Axe tests:
1. The test opens a page and waits for the main heading, and until it is no longer "One moment" (loading text).
2. It waits for animations that end by themselves, so axe does not measure text in the middle of a fade in.
3. It injects `axe-core` into the page and runs it with the tags wcag2a, wcag2aa, wcag21a, wcag21aa, wcag22aa and best-practice.
4. It prints every finding and attaches them to the report. It fails only on serious or critical findings.

Keyboard tests (`e2e/keyboard.ts`): the helper lists every visible control, presses Tab one at a time and records each stop, whether it has a focus ring, and which controls were never reached. It stops when focus comes back to a stop it has already seen (no trap). An element that has focus when the page loads is recorded as the first stop. The Next.js dev badge exists only in `pnpm dev`; it is listed once and never judged. Dialogs are tested by opening with Enter, checking focus moves in and stays in, closing with Escape, and checking focus returns to the opening button.

Design review: grep over `src` for gradients, blur, shadows, three column grids, centered text, motion and emoji, plus screenshots of every page at 360, 768 and 1280px (`.shots.mjs`, output folder not committed) and a sideways scroll check at each width.

For signed-in tests the session cookies are saved in a temporary folder for 30 minutes and added to the browser. `bypassCSP` lets axe be injected and is used in tests only.

## 5. How it is used in StudentOS (files/modules)
- `e2e/axe.ts`, `e2e/a11y-public.ui.spec.ts` (9 public pages), `e2e/a11y-signed-in.ui.spec.ts` (24 signed-in routes as student, admin and pending users).
- `e2e/keyboard.ts` (helper) and `e2e/keyboard.ui.spec.ts` (tests).
- `e2e/shell.ui.spec.ts` (existing): sign out test updated.
- Fixed components: `filter-bar.tsx`, `college-shell.tsx`, `desktop-rail.tsx`, `notification-bell.tsx`, `admin-layout-shell.tsx`, `dashboard-screen.tsx`, and loading states in `campus-screen.tsx`, `college-gate.tsx`, `notifications-screen.tsx`, `me-screen.tsx`.
- `tests/ui/notification-bell.test.tsx`: new label text only.

## 6. Request/response and data flow (diagram or numbered trace)
Signed-in test:
1. The test asks for a sign in code: `POST /api/v1/auth/otp/request`.
2. The helper reads the 6 digit code from the local Mailpit inbox.
3. The test sends it to `POST /api/v1/auth/otp/verify`; the API answers with session cookies.
4. The cookies are saved in the temp folder and added to the browser.
5. The browser opens the page and axe or the keyboard checks run.

## 7. API methods, endpoints, schemas, status codes
Only the two sign in endpoints above. 200 is success. 429 with code `RATE_LIMITED` and `retry_after_seconds` means too many code requests for one email.

## 8. Database changes and relationships
No changes. `pnpm db:reset` rebuilds the local database and reloads the fake seed users, which also clears the sign in limit counters. It makes saved test cookies stale, so delete the cookie folder after a reset.

## 9. Authentication / authorization behaviour
- Student pages run as `student1@alpha.test` (cookies cached), admin pages as `admin@alpha.test`, the pending screen as `pending@alpha.test`. The typed keyboard sign in test uses `student2@alpha.test`, so it cannot use up the limit of the cached user. All are fake seed users.
- Tests fail with a clear message if a page redirects to `/signin`, so a login problem is never confused with an accessibility result.
- The new Admin icon in the phone header is shown only when the app already lists Admin for the person (moderators and admins). This is UI only. The server must still check login, role and college on every admin route.

## 10. Errors and edge cases
Step 1, problems found and fixed:

| Where | Rule | Cause | Fix |
|---|---|---|---|
| Filters button on phone (`filter-bar.tsx`) | serious, label-content-name-mismatch | `aria-label` did not contain the visible "Filters 4". Desktop does not show this button, so only the phone run found it. | Label starts with "Open filters" and ends with the visible count text. |
| Account menu button (`college-shell.tsx`) | serious, label-content-name-mismatch | `aria-label` "Account menu for {name}" hid the visible text | Removed the `aria-label`; the name now comes from the visible content. |
| Notification bell | serious, label-content-name-mismatch | Label did not contain the visible badge number | Label is "N unread notifications" (99+ above 99). Unit tests updated. |
| Home link (`desktop-rail.tsx`) | serious, label-content-name-mismatch | Label did not contain the visible initials | Label starts with the initials, for example "AL - Alpha College Home". |
| Admin pages (`admin-layout-shell.tsx`) | moderate, nested and duplicate main | The admin shell had its own `main` inside the app `main` | Changed it to a `div`. |
| Loading skeletons (4 files) | hardening | `aria-label` on a plain `div` has no role to name | Added `role="status"`. |
| Sign out test (`e2e/shell.ui.spec.ts`) | test regression | The test looked for a button named "account menu", the `aria-label` removed above. Found only by the full Playwright run, because `pnpm verify` does not run e2e. | The test now finds the account button in the sidebar by its visible text (name plus role). |

Step 2, problems in my own test setup (no app bug found):
- The email field has focus when the page loads. Blurring it made Tab skip it, so the helper records it as the first stop.
- The dev badge can hold several tab stops. The helper treated a repeated badge stop as "focus came back", ended early and reported "StudentOS" as unreachable. This failed 2 of 8 repeats on chromium before the fix and passed 10 of 10 (5 repeats on each project) after it.
- Pressing Enter before React finished loading did nothing, so the helper waits first.
- Two tests asked for sign in codes for the same user within a minute and got 429. The typed sign in test now uses its own user.
- Running `--repeat-each` on tests that request sign in codes used up the limit and made the phone run fail with "No mail arrived". A normal single run passed, so repeat only the tab order tests.
- Docker not running, and duplicate "name 2" files in `.next` (probably from iCloud Desktop sync) broke typecheck and the Next.js dev server start. Deleting `.next` fixed it. Moving the project out of `~/Desktop` should prevent it.

Messages printed in the full run (no test failed):
- A React hydration warning on `/signin` (phone) that lists `data-kb` attributes. My keyboard helper tags elements with `data-kb` before React finishes loading. It comes from the test helper and not from the app. A later improvement is to track elements without changing the page.
- A Next.js dev message on the admin routes: "Could not validate that a segment in your UI has instant navigation", naming `src/app/c/[slug]/(app)/admin/layout.tsx`. I have not checked whether it also appears on `main`; ask R3.

Step 4, "do not" list review:
- Passed with no change: no gradients, no emoji, no bouncing animation, no stock photos, no fake reviews, no sideways scroll at 360, 768 or 1280px. Centered text is only used in the bottom nav, notification rail and report dialog success message. The only motion (`animate-pulse`) respects reduced motion.
- Fixed: glass effect on the phone header (now a solid bar); shadow on the account dropdown (removed, border kept); three identical icon cards on the admin dashboard (now one bordered panel with three figures and text labels, no icons); moderators had no way to open Admin on a phone (Admin icon added to the phone header for them); small text (bottom tab labels 13 to 14px, bell badge 11 to 12px); the phone nav is named "College areas" so two landmarks no longer share the name "College".
- Not fixed, left for the team: Collaborate and Career screens are text rows with no actions yet (R3 owns the real screens); `/colleges` and `/contact` say "This page is a draft"; the People list shows "Seed user for local testing" as every bio (seed data, must not reach staging or demos).

Known gaps (not fixed or not tested):
- One moderate axe finding, `region` (content outside a landmark), on the 6 pages under `/c/alpha/admin/`.
- `/c/alpha/career/tracker` does not exist on this branch (checked on `origin/main` too), so the tracker keyboard test is skipped and listed in CARRYOVER.md. `/c/alpha/career/opportunities` is also a 404.
- The Filters button shows only at phone size, so the desktop filter sheet test is skipped.
- Not tested: open dialogs and error states in the axe suites, `/c/alpha/join`, the real Team Finder screen (still a placeholder), the role picker with arrow keys, focus moving to the error after a failed submit.
- Still to check by hand: the phone Admin icon with a moderator login (shown, reachable by Tab, opens `/c/alpha/admin`), and its absence for a student.

## 11. Tests: what exists and how to run them (exact commands)
Needs the local stack: `pnpm db:start`, `pnpm db:reset`, and `.env.local` (`pnpm env:local`).
- `pnpm verify` (format, lint, typecheck, vitest, build). After the final change: 44 test files, 465 tests passed, build listed all routes.
- `pnpm test:e2e` (all Playwright specs).
- `pnpm exec playwright test e2e/keyboard.ui.spec.ts` (keyboard only).
- `pnpm exec playwright test e2e/shell.ui.spec.ts` (shell and sign out).

What I saw:
- Public axe suite: 18 passed (9 pages on desktop and phone). Signed-in axe suite: 48 passed (24 routes on desktop and phone). Only the moderate `region` finding was printed, on the 6 admin pages.
- Full `pnpm test:e2e` before the test fixes: 128 passed, 7 failed, 1 skipped, 1 did not run. Six failures were sign in rate limit problems in the keyboard spec and one was the sign out test described above. The other specs passed.
- After the fixes: keyboard spec 9 passed, 3 skipped, 0 failed (single run after `db:reset`); shell spec 8 passed. Full `pnpm test:e2e` after the last fixes and a fresh `pnpm db:reset`: 134 passed, 3 skipped, 0 failed (137 tests, 4.5 minutes). The 3 skips are the tracker (chromium and phone) and the desktop filter sheet.
- Sanity check: a deliberately broken page made axe report critical `button-name` and `image-alt`, so the script does catch problems.

Keyboard results: sign in page tab order is email field, "Email me a code", terms, privacy policy, StudentOS link, with focus rings visible and no trap. Sign in with the keyboard only passed on both projects. The Team Finder app shell passed on both projects. Request dialog passed on both; the phone filter sheet passed (Enter opens, focus moves in, Escape closes, focus returns to the Filters button).

## 12. How to debug common failures
- **429 RATE_LIMITED or "No mail arrived"**: too many code requests for one email. Run `pnpm db:reset`, delete the cookie folder `studentos-e2e-auth` in the system temp folder, run again. Do not change the app limit and do not use `--repeat-each` on sign in tests.
- **Redirected to /signin**: cookies are old. Delete the cookie folder and run again.
- **Typecheck or Turbopack error about a file named "... 2"**: run `rm -rf .next`, then run again.
- **A new failure only in `pnpm test:e2e`**: `pnpm verify` does not run Playwright, so run e2e before pushing changes to labels or roles.
- **Chain commands with `&&`** so a failed reset or verify stops the later commands, and use quotes around patterns in zsh (`--include="*.tsx"`).

## 13. Security considerations
- Tests run only on the local stack; `e2e/helpers.ts` refuses a database that is not `127.0.0.1` or `localhost`.
- Only fake seed users. No real student data.
- Session cookies live in the system temp folder, outside the repo.
- `bypassCSP` is set only inside the test files.
- No new package was added.
- The phone Admin icon is a convenience; admin routes must still check the role on the server.
- Scratch files (screenshots zip, Supabase snippets) were kept out of git so they do not enter the repo.

## 14. Alternatives and trade-offs
- `@axe-core/playwright`: ready made, but a new package; `axe-core` alone was enough.
- Keep only the jsdom unit tests: faster, but no real layout, phone size or signed-in pages.
- Fail on every axe finding including moderate: stricter, but it would block on small landmark notes that need a design decision. We fail on serious and critical, as the release gate says.
- Guidepup (drives real VoiceOver or NVDA from code): not added, because it is a new package and needs Mac settings changes. Suggested to R5 as a follow up.
- Keep the stat cards and only remove their icons: still three identical cards, so they became one panel.

## 15. What AI generated or suggested (prompts used, summary)
- AI chat helped write the axe tests, the keyboard helper and tests, the component fixes, the terminal commands, and helped read each diff and each test failure.
- An AI coding agent (Antigravity) ran a prompt I gave it: it cached the sign in session, ran the suites, and edited components, the helper and one unit test. It also edited three loading skeleton files I had not asked for; I reviewed them before committing.
- AI told me which keys to press and what to listen for in the VoiceOver test and read my screenshots.

## 16. What a human verified (how: ran tests, read code, checked docs, tried to break it)
- I ran every command myself and pasted the real output; the numbers in this file come from those runs.
- I read the `git diff` of changed files before committing and checked that no wording, colors or tokens changed.
- I removed two unwanted files (a screenshots zip and a Supabase scratch file) from a commit before pushing.
- I ran the sanity check on a deliberately broken page and saw axe catch it.
- I listened to VoiceOver myself on three flows: sign in, Team Finder parts on `/dev/components`, and the app shell on the Career page as Riya Sharma. I heard the page heading "Opportunities and your applications" and the "Opportunities" card read as a link. Not covered: the tracker (no screen on this branch), NVDA, a second browser.
- I checked the phone bottom bar at 360px: "Collaborate" fits at 14px.

## 17. What each teammate can now explain/implement independently
- Run the axe and keyboard browser tests and read a finding or a tab order printout.
- Explain why the accessible name must contain the visible text, and why the phone project can find problems the desktop project misses.
- Add a page to the lists in `e2e/a11y-public.ui.spec.ts` or `e2e/a11y-signed-in.ui.spec.ts`.
- Explain what to do when tests fail with 429, and why `pnpm verify` is not enough for label changes.
- Check a screen against the "do not" list.

## 18. Further learning resources
Check the official pages: axe rule descriptions (Deque), WCAG 2.5.3 "Label in Name" (W3C), WCAG 2.1.1 Keyboard and 2.4.7 Focus Visible (W3C), and the Playwright accessibility testing guide.

## 19. Docs updated because of this (per trigger table)
None yet. Candidates: docs/TESTING.md (how to run the axe and keyboard browser tests, the rate limit rule), CARRYOVER.md (tracker route, `region` finding on admin pages, desktop filter sheet, untested dialogs and error states).

## 20. Walkthrough drill: passed by / date
Not yet.
