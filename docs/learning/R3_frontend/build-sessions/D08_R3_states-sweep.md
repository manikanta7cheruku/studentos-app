# Loading, empty, error and offline on every screen, and the admin console (Day 8) - build session

| Field | Value |
|---|---|
| Date / Author (role) | 2026-11-10 / R3 Frontend and App Screens (project owner takeover) |
| Linked task / ADR / PR | R3-D8-1 / docs/DESIGN_SYSTEM.md rule 2 / Branch: `r3/d8-states-sweep` |
| Related docs | docs/API_CONTRACT.md (ADM-03 to ADM-11, ANN-02, OPP-03, RPT-01 to RPT-03), docs/PERMISSIONS.md, docs/DESIGN_SYSTEM.md |

## 1. What we are learning and why it is needed

Rule 2 of the design system: every data screen has four states. **Loading** (a skeleton the shape of the page), **empty** (says what to do next), **error** (plain words, a retry, a support code) and **success**. On top, the whole app must say when the device is **offline**. Day 8 checks every screen against the rule, adds what was missing, and wires the last screens that still showed sample data: the **admin console**. A college could not run itself without it (no way to approve people, make invite codes, post a notice or an opportunity).

## 2. The sweep (every screen, four states)

| Screen | Loading | Empty | Error and retry | Notes |
|---|---|---|---|---|
| College gate and shell | outline of the shell | not a member goes to join | message with retry | the gate decides sign in, join, waiting |
| Campus | skeletons | "No announcements yet" | `LoadError` | |
| Notifications | skeletons | "Nothing new" | `LoadError` | |
| Profile, edit, skills, settings, people | skeletons | text that says what to do | `LoadError` | settings undo a failed switch |
| Team Finder list, post, edit | skeletons | "No team posts yet" with a New post button | `LoadError` | filters have their own empty text |
| Requests (author inbox, my requests) | skeletons | "Nobody has asked yet" | `LoadError` | |
| Tracker list, application | skeletons | "Nothing here yet" | `LoadError` | |
| Opportunities list, detail | skeletons | "Your college has not posted any" | `LoadError` | |
| **Admin: overview, join requests, members, invite codes, announcements, opportunities, reports, settings, audit** | `ListSkeleton` | one sentence per screen | `LoadError` | **new this day, on real data** |
| Not found, unknown college, crash | | | `not-found.tsx`, `error.tsx`, `ScreenMessage` | |

New: **`OfflineBanner`** in the root layout. It listens to the browser's online and offline events (`useSyncExternalStore`) and shows a bar at the top of every page: "You are offline. Nothing you do is saved until the connection is back." A screen that fails to load while offline shows its own error with a Try again button; both are tested.

## 3. The admin console (new, on the real API)

`/c/{slug}/admin` is behind the college gate. The shell reads the role: **college admins** see everything, **moderators** see Announcements, Opportunities and Reports, **students** see "This area is for college admins and moderators". It replaces R4's sample data screens (removed with their tests).

| Screen | What it does | Endpoints |
|---|---|---|
| Overview | members, waiting for approval, invite codes in use; a line when someone waits | ADM-11 |
| Join requests | see the details (email, course, year, last 4 of the enrolment number), Approve, Reject with a reason | ADM-06, ADM-07 |
| Members | search, filter by status and role, make moderator or admin, suspend, remove (a reason of 5 or more characters), reactivate; the last admin cannot be removed | ADM-08, ADM-09 |
| Invite codes | create (name, uses, end date, joins at once or needs approval); the code is shown **once** with a Copy button; revoke | ADM-05 |
| Announcements | write, publish or keep as a draft, pin, edit, remove | ANN-02 |
| Opportunities | create and edit (stipend in rupees a month), publish or draft, "I checked it today", remove | OPP-03 |
| Reports | what members reported; Dismiss, Hide, Warn, Suspend (note required except dismiss) | RPT-02, RPT-03 |
| Settings | which join methods, admin approval, which tabs are on, who can post teams. Global's methods are locked | ADM-03 |
| Audit log | who did what, newest first | ADM-10 |

Members can now **report** a team post or a classmate's profile (`ReportButton`, RPT-01): the report goes to the moderators' queue, and the person is not told who reported.

## 4. Bugs found by writing the tests (and fixed)

- The **report action** (RPT-03) needs an `Idempotency-Key`; the screen did not send one, so every Dismiss answered "Check the highlighted fields". Found by the browser test, fixed with `useAttempt`.
- The **invite list contract** said `created_by` is always a user id. It is `null` when the admin who made the code deletes their account, so the whole list would stop loading for the college. The contract now allows null (and the OpenAPI file was regenerated).
- A list that refilters (search) **replaces its rows**, so an action dialog opened in the same moment is lost. Not a bug in real use (nobody clicks within 350 ms of typing), but a real race in tests: wait for the search answer first.

## 5. Tests

```bash
supabase test db                                               # no database change this day
node node_modules/vitest/vitest.mjs run                        # unit
pnpm test:e2e -- e2e/admin-console.ui.spec.ts                  # 12 journeys, desktop and phone
```

Browser journeys: a student cannot open the console; overview and navigation; create an invite code, see it once, a new student joins with it, revoke; a manual join request approved by the admin and the student gets in; an announcement shows on Campus; an opportunity shows under Career; a member reports a post and the admin dismisses it; settings saved and the audit log shows it; members searched, suspended and reactivated; **offline** banner appears and goes away; a screen whose server call fails shows a retry that works.

## 6. Docs updated

ROUTES_AND_NAVIGATION (admin routes), API_CONTRACT note and OpenAPI (invite `created_by`), R3 progress and daily.
