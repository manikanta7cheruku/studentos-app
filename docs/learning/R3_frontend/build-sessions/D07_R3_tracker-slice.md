# Application tracker and opportunities (Day 7) - build session

| Field | Value |
|---|---|
| Date / Author (role) | 2026-11-10 / R3 Frontend and App Screens (project owner takeover) |
| Linked task / ADR / PR | R3-D7-1 / docs/FEATURES_AND_JOURNEYS.md F-13, F-14 / Branch: `r3/d7-tracker-slice` |
| Related docs | docs/API_CONTRACT.md (section 16 APP-01 to APP-04, section 12 OPP), docs/DATABASE.md (2.4 Career), docs/PERMISSIONS.md, docs/DESIGN_SYSTEM.md |

## 1. What we are learning and why it is needed

Students lose deadlines and forget follow-ups. The tracker is a private list of the applications a student is chasing, with a status that moves along and a history. The roadmap gave R3 both the backend (the endpoints did not exist) and the screens, and R2 reviews. The opportunities screens (the college posts listings, students save them) already had a backend from R2 and are wired in the same day, with "Add to my tracker" linking the two.

## 2. The backend (new)

| Piece | What it does |
|---|---|
| Migration `20261113000000_job_applications.sql` | `job_applications` and `application_events`. Closed to clients (row level security says no, grants revoked), private to the person, never shared, not even with admins. Deleted with the account |
| `app_create` | Creates the application and its first event. At most 200 per person (`RATE_LIMITED`). A linked opportunity must be one of a college the person is an active member of |
| `app_update` | Edits fields. `If-Match: <version>`: an old number is refused with `VERSION_CONFLICT`. Raises the version by 1 |
| `app_change_status` | Changes the status and writes one event (from, to, time, note) in one step. The same status again is `CONFLICT`. Setting `applied` fills the applied date once |
| Routes | APP-01 `POST /me/applications` (IDEM), APP-02 `GET`, APP-03 `GET`, `PATCH`, `DELETE /me/applications/{id}`, APP-04 `POST /me/applications/{id}/status` |

Rules the code follows: every query carries the signed in user id and the database checks it again; another person's id is always 404 (never 403, so nobody can find out an id exists); times are answered in the form ending in Z; a search text cannot change the query (special characters are removed).

## 3. The screens

| Address (inside `/c/{slug}`) | What it does |
|---|---|
| `/career` | My applications. Status chips with counts, search, sort by recently changed or nearest deadline. A line at the top when open applications are past their deadline. Deadline words: "Due in 3 days", "2 days overdue" |
| `/career/tracker/new` and `/edit` | The form. The status of an existing application is not in the edit form: it is changed on its own page so every change leaves an event |
| `/career/tracker/[id]` | Move to another status with an optional note, the history (newest first), notes, Edit, Open the listing, Delete (confirm) |
| `/career/opportunities` | Posted by the college: kind chips, search, All or Saved, closed ones on request, Show more. A "changed since you saved it" label |
| `/career/opportunities/[id]` | All details, the stipend in rupees a month, Apply on their site, Save, **Add to my tracker** (creates an application with the company, role, link, deadline and the opportunity id), and "In your tracker" once added |

## 4. Things we learned

- **The tracker is one list of at most 200**, so the screen loads it once and filters, searches and sorts in the browser: the chips and the counts answer at once and no cursor is needed.
- **Optimistic concurrency with a version.** Two screens open on the same application: the second one to save is refused with a plain message ("This changed somewhere else") and a Load the latest button, and nothing is overwritten. A browser test opens the same application in two pages to prove it.
- **The database tie**: events written in one transaction share the same `now()`, so a test must not rely on their order inside one transaction (real calls are separate transactions).
- **Duplicates in browser tests**: Next keeps the page you left alive in the background, so a text can exist twice. Assert on visible elements (`filter({ visible: true })`).

## 5. Tests

```bash
supabase test db                                                       # 14 files, includes 014_job_applications
node node_modules/vitest/vitest.mjs run --config vitest.integration.config.ts tests/integration/applications.test.ts
node node_modules/vitest/vitest.mjs run src/features/career             # deadline words, filter and sort, money
pnpm test:e2e -- e2e/career.ui.spec.ts                                  # desktop and phone, real backend
```

pgTAP: closed to clients, create trims, first event, version check, status events, another person gets nothing and cannot change anything, table rules (https, status list), 200 limit, deletion cascades. Integration: 11 tests (create and replay, validation, list filters and sort and search, read, edit with a version, 404 for another person, status history). Permission matrix rows for APP-01 to APP-04. Browser: empty tracker, validation, add and filter and move and edit and delete, conflict on two screens, opportunities (save, add to tracker, in your tracker).

## 6. What a human verified

Ran all of the above locally, desktop and phone browsers, against the real local backend.

## 7. Docs updated

API_CONTRACT (section 16), PERMISSIONS, BACKEND_STATUS (APP rows move from Not built to built), DATABASE, OpenAPI, ROUTES_AND_NAVIGATION, R3 progress and daily. **R2 should review** the migration and the tracker routes (R2-D7-2).
