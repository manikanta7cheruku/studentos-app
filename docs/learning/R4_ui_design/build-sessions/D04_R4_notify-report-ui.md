# Notifications, announcements and report screens - build session

| Field | Value |
|---|---|
| Date / Author (role) | 2026-10-31 / R4 (UI and design) |
| Linked task / ADR / PR | R4-D4-1 / ADR-009 (UI primitives) / #12 |
| Related docs | docs/DESIGN_SYSTEM.md, docs/ACCESSIBILITY.md, docs/ROUTES_AND_NAVIGATION.md, docs/FEATURES_AND_JOURNEYS.md (F-07, F-08, F-16) |

## 1. What we are learning and why it is needed
Students need to see updates (bell and notifications page), read official notices (announcements), and report bad content. Moderators need a place to review reports. Checkpoint 2 needs these screens. R2's API is not ready, so the screens run on sample data.

## 2. What problem it solves
Without a bell, students miss join requests and deadlines. Without a report button, bad content stays. Without a moderator queue, reports have nowhere to go. The report dialog is built to take 3 taps or fewer, so reporting is easy.

## 3. Concepts and terminology (short glossary)
- **Unread count**: number on the bell. The bell's accessible name includes it, for example "Notifications (2 unread)".
- **Rail**: the left navigation bar on screens 768px and wider (Campus, Collaborate, Career, Me, Admin, search, bell).
- **Pinned**: an announcement that always shows first.
- **Moderator queue**: the list of reports a moderator reviews. Actions are dismiss, hide content, warn member, suspend member.
- **Sample data**: fake records in `sample-data.ts` used until R2's endpoints exist.
- **Contract ID**: the name of an API operation in docs/API_CONTRACT.md (NTF-01, NTF-02, ANN-01, ANN-02, RPT-01, RPT-02, RPT-03).
- **axe**: the automatic accessibility checker we run inside tests.

## 4. How it works internally (appropriate depth)
- Each feature has types, a sample-data file with async functions that pretend to be the API, and React components. Swapping to the real API later means changing only those functions.
- The bell shows a badge and sets an `aria-label` that includes the unread count.
- AppShell wraps the three pages with the rail. The landing page `/` and `/dev/components` are not wrapped, so they have no rail.
- The announcements page sorts pinned items first. The post form only renders when the role is moderator or admin.
- The report dialog has radio reasons, nothing selected at first, and Submit is disabled until a reason is chosen. Escape closes it and focus stays inside while it is open.
- Suspend member opens a confirmation dialog first. Cancel does nothing.
- User text is shown as plain text only. Nothing uses `dangerouslySetInnerHTML`.

## 5. How it is used in StudentOS (files/modules)
- `src/features/notifications/` (types, sample-data, notification-bell, desktop-rail, app-shell, notifications-view)
- `src/features/announcements/` (types, sample-data, announcement-form, announcements-view)
- `src/features/reports/` (types, sample-data, report-dialog, moderator-reports-queue)
- Routes: `src/app/me/notifications/page.tsx`, `src/app/campus/announcements/page.tsx`, `src/app/admin/reports/page.tsx`
- Tests: `tests/ui/` and `tests/a11y/` files for the bell, notifications page, announcements, reports, and `tests/ui/routes-rail.test.tsx`

## 6. Request/response and data flow (diagram or numbered trace)
No real server request yet. Flow for reporting an announcement:
1. The student taps Report on a card.
2. The dialog opens with the announcement title shown.
3. The student taps a reason, then Submit.
4. The dialog calls `submitReport()` in sample-data (later the real RPT-01).
5. The dialog shows a neutral "Report received" message.
6. A moderator sees it in the queue (later RPT-02) and acts (later RPT-03).

## 7. API methods, endpoints, schemas, status codes
Sample data only. Later connections:
- NTF-01 GET `/me/notifications`, NTF-02 POST `/me/notifications/read`
- ANN-01 GET `/c/{slug}/announcements`, ANN-02 manage announcements (moderator)
- RPT-01 POST `/c/{slug}/reports`, RPT-02 GET `/c/{slug}/admin/reports`, RPT-03 POST `/c/{slug}/admin/reports/{id}/action`
Response shapes follow docs/API_CONTRACT.md where it gives them. Other parts are my assumptions.

## 8. Database changes and relationships
None. This task is UI only.

## 9. Authentication / authorization behaviour
The screens hide admin and moderator tools from students, but that is not security. The server must check the role and the college on every call (ANN-02, RPT-02, RPT-03). TODO comments in the code name these operations.

## 10. Errors and edge cases
- The bell and the Report button were built and tested, but at first no page used them. Tests passed even so. I found this with grep and the browser.
- The label "Collaborate" was clipped because the rail was too narrow.
- The rail moved when the page scrolled until it was made fixed.
- Queue items showed raw names like `team_post` until I added plain-word labels.
- One click on Suspend was too risky, so a confirm step was added.
- The report dialog had a reason pre-selected, which allows an accidental report. Now nothing is selected.
- Phones under 768px have no rail and no bottom tab bar yet, so notifications are not reachable there.

## 11. Tests: what exists and how to run them (exact commands)
- All checks: `pnpm verify`
- Only these tests: `pnpm test tests/ui/notification-bell.test.tsx tests/ui/notifications-page.test.tsx tests/ui/announcements.test.tsx tests/ui/reports.test.tsx tests/ui/routes-rail.test.tsx`
- Accessibility tests: files in `tests/a11y/` for each screen
- Last run before the PR: 17 test files and 111 tests passed, build listed all routes.

## 12. How to debug common failures
- Typecheck errors about missing files in `.next/types`: delete the old cache with `rm -rf .next`, then run `pnpm verify` again.
- A component passes tests but is invisible: search where it is used with `grep -rn "ComponentName" src`.
- Dev server error "Another next dev server is already running": stop the old one with `kill <PID>`.
- Rail missing: check the window width against 768px.

## 13. Security considerations
- Plain text only for user content. No raw HTML.
- Role checks must also happen on the server. UI hiding is not enough.
- Sample data uses fake names only. No real student data, no secrets.
- Reporter notes and report details are private to moderators in the real system. The real API must enforce that.

## 14. Alternatives and trade-offs
- Showing the rail on every page through the root layout is simpler, but the landing page must stay clean, so it is added only to the three app pages.
- Sample data lets me finish the screens without waiting for R2, but the "works on staging" goal still needs the real endpoints.
- A bottom tab bar for phones is the right answer for small screens, but it was not built today to keep the change small.

## 15. What AI generated or suggested (prompts used, summary)
I used Antigravity with prompts that told it to read the repo rules first, use design tokens only, add no new dependencies, use sample data, make small commits, and show real command output. It wrote the components, sample data, pages and tests. After I found problems, I gave it follow-up prompts to mount the rail and Report button, fix the rail width and scroll, limit the dialog height, and add the Suspend confirmation.

## 16. What a human verified (how: ran tests, read code, checked docs, tried to break it)
- Ran `pnpm verify` myself several times: 17 test files and 111 tests passed, and the build listed all routes.
- Checked `git log` and `git status` to see the commits and a clean tree.
- Ran grep for `dangerouslySetInnerHTML`, `console.log` and raw hex colours. Only a comment and the tokens in globals.css were found.
- Found with grep and screenshots that the bell and the Report button were not used anywhere, and had them fixed.
- Looked at each screen in the browser: notifications, announcements, moderator queue.
- Checked that the rail stays in place and "Collaborate" is no longer clipped.
- Opened the Report dialog, checked it fits the window, and closed it with Escape.
- Clicked Suspend member and saw the confirmation. Cancel did nothing.
- Not checked yet: 360px phone width, a full keyboard-only pass, a real screen reader, and staging with the real API.

## 17. What each teammate can now explain/implement independently
- How the bell gets its accessible name from the unread count.
- How the rail is added to some pages and not others.
- Why UI role checks are not security.
- How to swap sample data for the real API.
- How to run the tests and find a component that is built but not used.

## 18. Further learning resources
- docs/DESIGN_SYSTEM.md and docs/ACCESSIBILITY.md in this repo
- Next.js layouts and route groups guide in `node_modules/next/dist/docs/`
- WAI-ARIA Authoring Practices for dialogs, at w3.org

## 19. Docs updated because of this (per trigger table)
This learning file, `docs/learning/R4_ui_design/INDEX.md`, and the R4 progress files. No other docs changed.

## 20. Walkthrough drill: passed by / date
Not done yet.
