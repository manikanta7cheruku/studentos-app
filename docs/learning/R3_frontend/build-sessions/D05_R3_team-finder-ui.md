# Team Finder screens (Day 5) - build session

| Field | Value |
|---|---|
| Date / Author (role) | 2026-11-10 / R3 Frontend and App Screens (project owner takeover) |
| Linked task / ADR / PR | R3-D5-1 / D-26, D-27 / Branch: `r3/d5-team-finder-ui` |
| Related docs | docs/API_CONTRACT.md (TMF-01 to TMF-05, section 10), docs/DECISIONS.md (D-25, D-27), docs/DESIGN_SYSTEM.md (Lists of posts) |

## 1. What we are learning and why it is needed

Team Finder is the core of StudentOS: a student posts what they are building and the roles they need, and classmates find it. This day builds the screens on the real backend (R2 built it on Day 5 of the backend). R4's parts in `src/features/team-finder` are sample data parts; the real screens live in `src/features/collaborate` and talk to the API.

## 2. The screens

| Address (inside `/c/{slug}`) | What it does | Endpoints |
|---|---|---|
| `/collaborate` | List of posts. All posts or My posts, search (after you stop typing), kind chips, "also show closed and full", Show more | TMF-02 |
| `/collaborate/new` | Post with 1 to 8 roles (name, places 1 to 20, skills that help), deadline up to 180 days, two optional links. One `Idempotency-Key` per attempt | TMF-01, PRF-03 (skill search) |
| `/collaborate/[id]` | The post, its roles and free places, links (the team chat link only for the author and accepted members), Edit and Close for the author | TMF-03, TMF-05 |
| `/collaborate/[id]/edit` | Change the details. Roles cannot be changed (the server refuses it), so they are shown read only | TMF-04 |

## 3. Posting to Global (decision D-27)

Global is a normal college space, so "Post to My college or Global" simply means which space the post is created in: the form posts to `/c/{chosen slug}/team-posts`. A student who is in a college and in Global sees both choices, a student who is only in a college is offered "Join Global". The post then lives in that space and is read there. Nothing is shared across colleges, so no new backend and no new security rule were needed. On a phone the account menu does not exist, so Settings has "Your spaces" to switch; on desktop the account menu has "Switch space".

## 4. How it works

- **Filters keep the screen simple**: the results component is keyed by the filters, so changing a filter starts a fresh load (no stale state, no effect that sets state). "Show more" appends the next page with the server cursor.
- **The title is the link** (stretched over the row): one link per post for screen readers, a big tap target for everybody.
- **Only changed fields are sent** when editing, and a cleared link becomes `null`.
- **Plain words for server answers**: `VERIFICATION_LEVEL_TOO_LOW` ("Your college has to verify you before you can do that"), `SLOTS_FULL`, `RATE_LIMITED`.

## 5. Tests

```bash
node node_modules/vitest/vitest.mjs run src/features/collaborate        # labels and date helpers
pnpm test:e2e -- e2e/team-finder.ui.spec.ts                             # real backend, desktop and phone
```

Browser tests: the empty list, a short title and no role are explained before sending, post with two roles and a skill and find it, filter by kind and search, edit, close (the Edit button disappears), post to Global and see it only in Global, the Join Global offer, Your spaces on a phone. Every page is checked for sideways scrolling.

## 6. What a human verified

Ran the browser tests on a desktop and a phone browser (12 tests) against the real local backend, and looked at the list at 1280px wide.

## 7. Docs updated

ROADMAP and DECISIONS (D-26 Day 4 deferred, D-27 Global posting), ROUTES_AND_NAVIGATION, DESIGN_SYSTEM (Lists of posts), R3 progress and daily.
