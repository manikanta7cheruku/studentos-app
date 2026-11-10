> Note: this file came from the first planning package. Old "doc NN" numbers, "T-" task IDs and Figma mentions are out of date. The task list is in ROADMAP.md. Design is built in code (see DESIGN_SYSTEM.md). Project folders are simpler now: src/contracts and src/components/ui.

# 08 - Information Architecture and Navigation

| Field | Value |
|---|---|
| Doc ID | DOC-08 |
| Version / Date | 0.1.0 / 2026-10-15 |
| Owner | R4 UX/UI (R3 backup) |
| Status | Proposed |

## 1. Main navigation (source recommendation, SRC S1 p.9)
Four top-level destinations: **Campus · Collaborate · Career · Me**. A fifth, **Admin**, appears only for admins/moderators. Mobile: bottom tab bar with the tabs the college switched on (up to 4), a slim top bar with People and the notification bell. Desktop and tablet (768px and up): left sidebar with the same tabs, a "Your college" group (People, and Admin for admins and moderators), the bell, and the account menu. Disabled modules (flag off) are **removed from navigation**, not greyed out.

Layered growth (REC): new members see Campus + Collaborate + Me; Career is introduced after the student sets a career goal or taps "Career".

## 2. Route inventory
Public: `/` landing · `/c/{slug}` tenant landing · `/p/{handle}` public portfolio · `/legal/*` (privacy, terms) · `/status`.
Before a college: `/signin` (email, then a six digit code, `?next=` brings the person back) · `/start` (where a person lands after signing in with nowhere specific to go back to: it opens their college, Global, or `/find`) · `/find` (a signed in person with no college enters the college code or link, or joins **Global**) · `/c/{slug}` (the college front door) · `/c/{slug}/join` (invite code, college email, or ask to join, only the methods the college allows) · `/c/{slug}/pending` (waiting for approval, not accepted, or paused).
Member (all under `/c/{slug}`):
| Area | Routes |
|---|---|
| Campus | `/campus` (feed: announcements first) · `/campus/announcements/[id]` · `/campus/events` `/events/[id]` · `/campus/lost-found` `/[id]` `/new` · `/campus/market` `/[id]` `/new` · `/campus/notes` `/[id]` `/new` · `/campus/activities` |
| Collaborate | `/collaborate` (Team Finder: all posts or mine, search, kind filter, show more) · `/collaborate/new` (post to your college or Global) · `/collaborate/[id]` (the post and its roles) · `/collaborate/[id]/edit` · `/collaborate/requests` (posts with requests waiting for my answer, and the requests I sent) |
| Career | `/career` (my tracker, private) · `/career/tracker/new` · `/career/tracker/[id]` (status, history, notes) · `/career/tracker/[id]/edit` · `/career/opportunities` (posted by the college, filter, save) · `/career/opportunities/[id]` (save, add to tracker) · later: `/career/roadmap` `/plan` `/resume` `/practice` `/review` (flagged) |
| Me | `/me` (my profile) · `/me/edit` (profile and photo) · `/me/skills` · `/me/settings` (privacy, reminders, sign out, leave the college, delete the account) · `/notifications` · `/people` (directory with search) · `/people/[userId]` · later: `/me/projects` `/[id]` · `/me/achievements` |
| Admin (college admins see all, moderators see announcements, opportunities and reports) | `/admin` (overview) · `/admin/verification` (join requests) · `/admin/members` · `/admin/invites` · `/admin/announcements` · `/admin/opportunities` · `/admin/reports` · `/admin/settings` · `/admin/audit` · later: `/admin/roster` |
Platform: `/platform` (staff only, separate auth role) · `/platform/colleges` · `/platform/colleges/[id]`.

**How a college screen opens (built in R3 takeover, Day 1).** Every address under `/c/{slug}` in the `(app)` route group goes through the college gate (`src/features/college/college-gate.tsx`): not signed in goes to `/signin?next=...`, not a member goes to `/c/{slug}/join`, waiting or refused goes to `/c/{slug}/pending`, an active member sees the shell. Who is signed in comes from one call, `GET /api/v1/me/memberships` (TEN-08). The pages before a college (the front door, join, waiting) are in the `(public)` route group and do not need membership.

Older addresses without a college (`/me`, `/me/edit`, `/me/skills`, `/me/notifications`) redirect into the college the person used last (`src/features/session/college-redirect.tsx`).

## 3. Module boundaries (frontend folders)
`features/{tenancy,auth,verification,admin,profile,projects,team-finder,tracker,opportunities,announcements,events,lost-found,market,notes,activities,reports,notifications}`. Each owns its components, hooks, API client, and tests; cross-feature imports go through the feature's `index.ts` only.

## 4. Screen relationship map
```mermaid
flowchart TD
  Land[Tenant landing] --> SignIn --> Verify --> Pending
  Verify --> Home[Campus home]
  Home --> Collab[Collaborate] --> Post[Post detail] --> Req[Request]
  Home --> Career --> Tracker
  Home --> Me --> Projects
  Collab --> Me
  Admin --> Queue[Verification queue]
```

## 5. State patterns (required on every data screen)
| State | Rule |
|---|---|
| Loading | Skeleton matching layout; never spinner-only for lists; timeout after 10 s → error state |
| Empty | Explain what belongs here + a primary action; for a new tenant, show helpful starter content (e.g. "Post the first team request") |
| Error | Plain-language message, retry button, error code (request id) for support |
| Success | Inline confirmation (toast ≤ 4 s) plus visible result |
| Offline | Banner "You're offline"; forms keep drafts locally; no silent failures |
| Forbidden | Explains why and what to do (e.g. "Waiting for verification") |
| Suspended tenant | Full-page notice |

## 6. Responsive behaviour
360–599 px: single column, bottom nav, sheets for filters. 600–1023: two columns, rail collapsed. ≥1024: rail + content + optional detail pane. No horizontal scrolling except in tables inside their own scroll container.

## 7. Search
v1: per-module filters + Postgres full-text on posts/people/opportunities within the tenant. Global search is T2. External search service is **not** used until needed (ADR-006).

## 8. Deep links
All detail routes are shareable only to signed-in members of the same tenant; unauthenticated visitors are redirected to tenant landing with `next` param (validated against allowlist to avoid open redirects).
