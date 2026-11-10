# Bug fixes, speed check and the walkthrough (Day 9) - build session

| Field | Value |
|---|---|
| Date / Author (role) | 2026-11-10 / R3 Frontend and App Screens (project owner takeover) |
| Linked task / ADR / PR | R3-D9-1 and R3-D9-2 / Branch: `r3/d9-bugfix-polish` |
| Related docs | docs/TESTING.md, docs/DESIGN_SYSTEM.md, docs/DEFINITION_OF_DONE.md |

## 1. Bugs fixed during the takeover (the list, so nothing is forgotten)

| Where | What was wrong | Fix |
|---|---|---|
| Sign in | after sign in the college gate showed its old "signed out" answer (Next keeps screens you left alive) and sent the person back | full page load after sign in, sign out, leave and delete |
| Google sign in | landed on the public home page, which does not know who you are | the callback goes to `/start`, which opens the right place |
| Email code | the "Coming soon" switch never reached `main` (pushed after a merge) | PR #51 |
| Interests field | label not connected to the input; a comma from a paste or a phone keyboard did not end an interest | fixed and tested |
| Lists | accessible name of a whole-row link lost its text | the title is the link, stretched over the row |
| `useLoad` | an action (accept, move status) flashed a skeleton | keeps the data while a reload runs |
| Admin | report action had no Idempotency-Key | sent with `useAttempt` |
| Admin | invite list would break when the creator's account was deleted | contract allows `created_by` null |
| Repo | stray screenshots and drafts in the project root | removed, ignored |
| CI | PRs not aimed at `main` ran only one check | merge in order, retarget, close and reopen |

## 2. Speed check

Measured on a **production build** (`next build`, `next start`), on this computer, at phone size (390 px), signed in, with the local database. These are not real-network numbers; they show what the app itself costs.

| Page | Heading visible | JavaScript | All files |
|---|---|---|---|
| Home (public) | 0.30 s | 635 KB | 1.2 MB |
| Sign in | 0.18 s | 700 KB | 1.2 MB |
| Campus | 1.16 s (first signed-in page, cold) | 969 KB | 1.5 MB |
| Team Finder | 0.28 s | 845 KB | 1.4 MB |
| My applications | 0.26 s | 837 KB | 1.4 MB |
| Profile | 0.36 s | 969 KB | 1.5 MB |
| Admin overview | 0.31 s | 853 KB | 1.4 MB |

The sizes are **not compressed** (the local server does not compress). All JavaScript of the whole app is 1.6 MB raw and about **530 KB compressed**; one page loads a part of it, roughly 200 to 300 KB compressed. On a 4G connection that is about one second. Honest verdict: **fine for a pilot, not lean**. What would make it leaner later: the contract schemas (Zod) are bundled into the browser so that every answer is validated; icons and Radix parts are shared but large. Nothing blocks the release. The API side is covered by `tests/integration/performance.test.ts` (R2).

Not measured here and still to do: a Lighthouse run on staging over a real connection, and a test on a mid range Android phone.

## 3. Walkthrough: how the frontend works (a teammate should be able to explain this)

1. **Routes** are in `src/app`. Everything for one college is under `src/app/c/[slug]`. The `(public)` group (front door, join, waiting) needs no membership. The `(app)` group is behind the **college gate** (`src/features/college/college-gate.tsx`). Pages are tiny server components that render one screen from `src/features/*`.
2. **Who is signed in** comes from one call, `GET /me/memberships` (`SessionProvider`). The gate decides: sign in, join, wait, or show the shell.
3. **Talking to the server** goes through `src/lib/api-client.ts` (errors, request ids, idempotency keys) and the typed calls in `src/lib/api/endpoints.ts`, which validate every answer with the same Zod contracts the server uses (`src/contracts`).
4. **Loading data** uses one hook, `useLoad` (and `usePaged` for lists). It returns loading, ready or error, keeps old data during a reload, and has no `setState` inside an effect.
5. **Doing something** (post, ask, decide) follows one pattern: validate in the browser, send with one `Idempotency-Key` per attempt (`useAttempt`), turn each error code into plain words (`friendlyMessage` and a few screen specific ones), show the result in place.
6. **Space**: a college, or Global. Global is a normal college with an open join method.
7. **Look**: tokens and rules in `docs/DESIGN_SYSTEM.md`; shared parts in `src/components/app` and `src/components/ui`.

### Trace of one action: "Ask to join a role"
`Ask to join` button in `role-list.tsx` opens `request-dialog.tsx`. The dialog calls `api.teamPosts.request(slug, postId, roleId, message, key)`. That sends `POST /api/v1/c/{slug}/team-posts/{id}/roles/{roleId}/requests` with the cookie session and `Idempotency-Key`. The route (`src/app/api/v1/c/[slug]/team-posts/.../requests/route.ts`) checks the origin, the session, the member and the limits, runs the SQL function, notifies the author, and answers `{ data }`. The dialog closes and `onChanged` reloads the post, so the role now reads "You asked to join. Waiting for the author." The author sees a notification that opens the post, and the request in the inbox.

### Drill (answer without looking)
1. Why does sign in do a full page load, not a client navigation? 2. What does `useAttempt` prevent? 3. Where does Global's "post to" choice send the request? 4. Why is another person's application a 404 and not a 403? 5. Why is the invite code shown only once? 6. What does `If-Match` do on the tracker? 7. Which three admin screens can a moderator open? 8. What happens to the list when you type in the search box, and why wait 350 ms? 9. Where do you look to see the rows a student created, on staging? 10. Which file lists every route the API has, and which test keeps it honest?

Answers: 1 Next keeps old screens alive, so the gate would show the old answer. 2 Creating or deciding twice on a double tap or a retry. 3 `POST /c/{chosen space}/team-posts`. 4 So nobody can find out that an id exists. 5 We store only a scrambled version. 6 Refuses an edit made on an old copy (`VERSION_CONFLICT`). 7 Announcements, Opportunities, Reports. 8 It reloads after typing stops, so one request per word. 9 Supabase dashboard, Table Editor (docs/DEV_SETUP.md). 10 `src/contracts/registry.ts`, kept honest by `registry.test.ts` and `docs-sync.test.ts`.

## 4. Docs updated

R3 progress and daily. This file is the learning walkthrough (R3-D9-2).
