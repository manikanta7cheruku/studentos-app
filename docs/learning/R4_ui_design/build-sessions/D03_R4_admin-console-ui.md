# Admin console screens - build session

| Field | Value |
|---|---|
| Date / Author (role) | 2026-10-30 / R4 UI design |
| Linked task / ADR / PR | R4-D3-1 / none / #9 (https://github.com/manikanta7cheruku/studentos-app/pull/9) |
| Related docs | docs/FEATURES_AND_JOURNEYS.md (F-05/F-06), docs/API_CONTRACT.md (ADM-06, ADM-07), docs/ROUTES_AND_NAVIGATION.md, docs/PRD.md (5.4 Admin) |

## 1. What we are learning and why it is needed
The admin console is where a college admin manages the college: see who is waiting for approval, approve or reject them, manage members and invite codes, change settings, and read the audit log. This task builds the six screens (dashboard, verification queue, members, invites, settings, audit) with sample data.

## 2. What problem it solves
Without it nobody can approve new students or manage the college. The docs describe the admin goal as seeing who is waiting, approving in one click, and seeing who did what.

## 3. Concepts and terminology (short glossary)
- Verification queue: the list of people waiting for approval.
- Approve / Reject: the admin decision on one request. Reject needs a reason.
- Sample data: made-up people and codes in src/features/admin/sample-data.ts, used until R2's API is ready.
- Confirmation dialog: asks the admin to confirm a dangerous action and names the person or code (Remove, Revoke).
- Draft PR: a pull request that cannot be merged yet, used while work is unfinished.

## 4. How it works internally (appropriate depth)
Each admin page under src/app/c/[slug]/admin/ renders a screen component from src/features/admin/components/. The screens read their data through src/features/admin/use-admin-data.ts, which currently returns the sample data. Approving or rejecting removes the person from the queue list on screen. Shared table layout comes from the ResponsiveList component.

## 5. How it is used in StudentOS (files/modules)
- Routes: src/app/c/[slug]/admin/ (layout and pages for dashboard, verification, members, invites, settings, audit).
- Screens and parts: src/features/admin/components/ (one screen file per page, plus admin-nav, admin-layout-shell, admin-error, admin-screen-skeleton).
- Data: sample-data.ts, types.ts, use-admin-data.ts; exported through index.ts.
- Shared change: src/components/ui/responsive-list.tsx (fixed row height and no padding at the table edges), so other screens that use it will look slightly different.

## 6. Request/response and data flow
Now (sample data): page -> screen component -> use-admin-data.ts -> sample-data.ts -> list on screen.
Later (real API): page -> screen -> API call to ADM-06 / ADM-07 from R2 -> list on screen. Not built yet.

## 7. API methods, endpoints, schemas, status codes
Not wired yet. The contract says:
- ADM-06 GET /c/{slug}/admin/verification-requests (queue).
- ADM-07 POST /c/{slug}/admin/verification-requests/{id}/decision (approve or reject). Reject needs a reason of at least 5 characters. An admin cannot approve their own request (403).
Status: sample data only, waiting on R2-D3-1.

## 8. Database changes and relationships
None in this task. The docs list memberships, verification_requests, audit_logs and college_settings as the data behind admin.

## 9. Authentication / authorization behaviour
Not enforced yet, because there is no server in this task. The docs say students get 403 on all /admin paths and every state-changing admin call writes one audit row. These must be checked when the API is connected.

## 10. Errors and edge cases
Documented in FEATURES_AND_JOURNEYS.md and not yet tested with a real API: removing the last admin is blocked, suspending yourself is blocked, a stale queue item that is already decided returns 409.
Covered by tests: Reject requires a reason; Remove names the person; Revoke names the invite code; a person leaves the queue after Approve or Reject.
Not yet checked: the 5-character minimum for the reject reason, and a message for the self-approval 403.

## 11. Tests: what exists and how to run them (exact commands)
- pnpm verify (format, lint, typecheck, tests, build). Last run: all steps passed, 10 test files, 74 tests.
- pnpm exec vitest run src/features/admin/__tests__/verification-queue.test.tsx: 2 tests passed (person leaves the queue after Approve and after Reject with a reason).
- src/features/admin/__tests__/admin-screens.test.tsx: 9 tests passed (approve button, toast on approve, reject dialog, reason required, submit rejection, remove names the person, cancel remove, revoke names the code, revoke on confirm).
- CI on PR #9: 10 successful checks, no conflicts with main.

## 12. How to debug common failures
- pnpm typecheck error "Argument of type 'HTMLElement | undefined'" on approveButtons[0]: the array could be empty, so check that the element exists before clicking it. This happened in the queue test and was fixed.
- A pasted cat heredoc did not create the file: the pasted text was indented, so EOF was not at the start of its line. Run ls to check the file exists before running prettier.
- A test can pass in vitest but still fail pnpm verify at the typecheck step, so always run the full pnpm verify before committing.

## 13. Security considerations
Sample data only: no real student data and no secrets were added (checked with git status -uall --short before committing). Server-side permission checks and college isolation are not covered yet.

## 14. Alternatives and trade-offs
Sample data first lets the screens be built and tested before R2's API is ready, at the cost of not proving the real flow. Editing the shared ResponsiveList fixed row height for admin but changes how other tables look.

## 15. What AI generated or suggested (prompts used, summary)
AI tools helped build the admin screens and sample data. Claude, in this chat, wrote the queue test file and the typecheck fix, and guided the git, PR and Slack steps from the Day 3 prompt in the student kit.

## 16. What a human verified (how: ran tests, read code, checked docs, tried to break it)
- Ran pnpm verify, including after the typecheck fix, and read the output.
- Ran the queue test on its own.
- Read git diff for responsive-list.tsx and the full file list before committing.
- Checked that CI on PR #9 shows 10 successful checks.

## 17. What each teammate can now explain/implement independently
A teammate can find the admin screens under src/features/admin, run the queue test and pnpm verify, and see where sample data would be replaced by the real ADM-06 and ADM-07 calls.

## 18. Further learning resources
- docs/FEATURES_AND_JOURNEYS.md (F-05/F-06)
- docs/API_CONTRACT.md (ADM-06, ADM-07)
- docs/ROUTES_AND_NAVIGATION.md (admin routes and state patterns)

## 19. Docs updated because of this
docs/progress/R4_ui_design/PROGRESS.md, docs/progress/R4_ui_design/daily/D03_R4.md, docs/progress/R4_ui_design/CARRYOVER.md and docs/learning/R4_ui_design/INDEX.md.

## 20. Walkthrough drill: passed by / date
not yet
