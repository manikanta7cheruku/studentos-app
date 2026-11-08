# App shell, tab navigation, typed API client and MSW sample API - build session

| Field | Value |
|---|---|
| Date / Author (role) | 2026-11-03 / R3 Frontend |
| Linked task / ADR / PR | R3-D1-1 / ADR-002, ADR-005 / PR pending |
| Related docs | docs/DESIGN_SYSTEM.md, docs/ROUTES_AND_NAVIGATION.md, docs/API_CONTRACT.md |

## 1. What we are learning and why it is needed

We built the core frontend foundation for StudentOS:
1. A typed sample college fixture with configurable module flags (`campus`, `collaborate`, `career`).
2. A typed, browser-safe API client (`src/lib/api-client.ts`) that handles JSON requests, envelopes (`{ data, meta }`), and turns any failure into an `ApiError`.
3. A Mock Service Worker (MSW) setup to intercept API requests in local development and Vitest tests so frontend work can proceed before the real backend is ready.
4. An accessible, responsive tenant app shell (`src/app/c/[slug]/layout.tsx`) with a 4-destination navigation: mobile bottom nav (< 768px) and desktop left rail (>= 768px), dynamic college accent colors via CSS variables, and automatic hiding of disabled modules while always showing "Me".

## 2. What problem it solves

Without this foundation:
- Frontend screens would make ad-hoc, untyped `fetch` calls, resulting in duplicate error handling and broken data parsing.
- Frontend development would be blocked waiting for backend endpoints to be deployed.
- Navigation would hardcode tabs, risking student access to disabled campus features or showing broken layouts on different screen sizes.

## 3. Concepts and terminology (short glossary)

- **Tenant App Shell**: The outer layout wrapping all tenant routes (`/c/[slug]/*`). It renders the header, left rail (desktop), and bottom nav (phone).
- **Module Flags**: Settings on a college (`modules.campus`, `modules.collaborate`, `modules.career`) determining whether specific features are enabled. Disabled modules are removed from navigation.
- **Typed API Client**: A lightweight wrapper around browser `fetch` that enforces JSON headers, includes session cookies, validates response envelopes, and returns strongly typed data.
- **ApiError**: A custom error class representing any frontend API failure (HTTP error status, backend error envelope with `request_id`, network drop, or malformed JSON).
- **MSW (Mock Service Worker)**: An API mocking library that uses Service Worker in the browser and interceptors in Node.js to mock HTTP requests at the network level.

## 4. How it works internally (appropriate depth)

- **College App Shell**: `src/app/c/[slug]/layout.tsx` is an async Next.js Server Component receiving `params: Promise<{ slug: string }>`. It awaits `params`, resolves the tenant college data (from sample data or MSW), and renders `CollegeAppShell`.
- `CollegeAppShell` injects CSS custom properties (`--primary`, `--accent`, `--ring`) using the validated `accent_hex`. It builds navigation links dynamically: if a module flag is false, that tab is omitted. "Me" is always appended.
- **API Client**: `apiClient<T>(path, options)` prepends `/api/v1`, sets `Content-Type: application/json` and `credentials: "include"`. On 2xx response, it parses JSON and returns `envelope.data`. If `options.schema` (Zod) is provided, it validates `envelope.data`. If non-2xx or bad JSON, it extracts `code`, `message`, `status`, and `requestId`, throwing `ApiError`.
- **MSW**: When `NEXT_PUBLIC_API_MOCKING=enabled` is set in development, `MSWProvider` initializes `src/mocks/browser.ts` before rendering children. Vitest uses `src/mocks/server.ts` to mock handlers during testing.

## 5. How it is used in StudentOS (files/modules)

- `src/features/tenancy/types.ts`: Defines `College` and module flag interfaces.
- `src/features/tenancy/sample-data.ts`: Provides sample colleges (`alpha` with all modules, `beta` with career disabled).
- `src/features/tenancy/components/college-app-shell.tsx`: Main responsive shell and dynamic tab bar.
- `src/features/tenancy/components/placeholder-screen.tsx`: Loading, empty, and error placeholder states for each tab.
- `src/app/c/[slug]/layout.tsx`: Root layout for tenant pages.
- `src/app/c/[slug]/campus/page.tsx`, `collaborate/page.tsx`, `career/page.tsx`, `me/page.tsx`: Route placeholders.
- `src/lib/api-client.ts`: The typed API client and `ApiError` class.
- `src/mocks/handlers.ts`, `browser.ts`, `server.ts`, `msw-provider.tsx`: MSW mocking infrastructure.

## 6. Request/response and data flow (diagram or numbered trace)

```
1. User visits /c/alpha/campus
2. layout.tsx awaits dynamic params { slug: "alpha" }
3. College data loaded (Alpha College, accent #1D4ED8, modules: campus, collaborate, career)
4. CollegeAppShell mounts:
   - Sets CSS variables (--accent: #1D4ED8)
   - Filters nav items -> [Campus, Collaborate, Career, Me]
   - Renders left rail on desktop (>=768px) or bottom nav on mobile (<768px)
5. Child page renders with Loading, Empty, and Success states
6. Screens fetch data via apiClient("/colleges/public/alpha")
   - Request intercepted by MSW worker (dev) or handled by route handler
   - Envelope { data, meta } unwrapped and returned
```

## 7. API methods, endpoints, schemas, status codes

- `GET /api/v1/colleges/public/:slug` (TEN-01): Returns public branding and enabled join methods.
- Envelopes:
  - Success (200): `{ "data": T, "meta": { "request_id": string } }`
  - Error (4xx/5xx): `{ "error": { "code": string, "message": string, "details": {}, "request_id": string } }`

## 8. Database changes and relationships

None (handled in R2 Day 1/Day 2 backend tasks).

## 9. Authentication / authorization behaviour

- Client requests send cookies with `credentials: "include"`.
- Tab hiding is a UX feature, not a security boundary. The backend server and database RLS must still verify tenant membership and module enablement.

## 10. Errors and edge cases

- **Invalid Hex Color**: If a college's `accent_hex` is invalid or missing, it safely falls back to the StudentOS brand blue `#2340C8`.
- **Missing College**: Falls back to `sampleCollege` if an unknown slug is opened in mock mode.
- **Network failure or HTML error page**: `apiClient` catches non-JSON responses and network disconnects, wrapping them into an `ApiError` with code `INTERNAL` or `NETWORK_ERROR`.
- **Disabled Module**: Nav item is excluded completely, never disabled or greyed out.
- **Next.js 16 Instant Navigation Validation**: Next.js 16.4.2 with Partial Prefetching checks for instant navigation during dev. Dynamic tenant routes (`/c/[slug]`) awaiting `params` in layouts or suspense boundaries trigger an "Instant: Dropped segment" validation error if not opted out. Setting `export const instant = false;` on the layout and page segments opts them out of instant validation cleanly.

## 11. Tests: what exists and how to run them (exact commands)

Run unit tests:
```bash
pnpm test
```
Outputs:
- `src/lib/__tests__/api-client.test.ts`: 3 tests (success data unwrapping, error envelope mapping to ApiError, network/bad JSON error handling).
- `src/features/tenancy/__tests__/navigation.test.tsx`: 3 tests (shows 4 tabs when all modules enabled, hides tab for disabled module, Me tab always visible).

Run full project verification:
```bash
pnpm verify
```
Runs `pnpm format:check`, `pnpm lint`, `pnpm typecheck`, `pnpm test`, and `pnpm build`. All 5 passed.

## 12. How to debug common failures

- **MSW not intercepting**: Ensure `NEXT_PUBLIC_API_MOCKING=enabled` is present in your `.env.local` or environment.
- **Port 3000 in use**: Run `lsof -i :3000` and kill the old process, then rerun `pnpm dev`.
- **Zod validation failed**: If `apiClient` throws `VALIDATION_FAILED`, inspect `error.details` for schema mismatches against `@/contracts`.
- **Instant Navigation Dropped Segment Error**: If the dev overlay warns `Could not validate that a segment in your UI has instant navigation - Dropped segment`, ensure `export const instant = false;` is exported from the dynamic route segment (see Next.js 16.3+ instant route segment config).

## 13. Security considerations

- `src/lib/api-client.ts` never accepts or stores authentication tokens in JavaScript; sessions use HttpOnly cookies with `credentials: "include"`.
- User input is not evaluated as raw HTML; all colors are validated before insertion into CSS custom properties to prevent CSS injection.
- Security boundary is enforced on the server; hidden tabs do not grant permission.

## 14. Alternatives and trade-offs

- **Axios vs fetch**: Chose native browser `fetch` to keep frontend bundle size small and eliminate extra external dependencies.
- **MSW vs Next.js mock route handlers**: MSW allows seamless offline/mock testing in Vitest and dev without adding disposable test endpoints inside `src/app/api/`.

## 15. What AI generated or suggested (prompts used, summary)

Antigravity wrote the code, test files, and configurations according to the StudentOS Day 1 prompt:
- Created `src/features/tenancy/sample-data.ts` and `types.ts`.
- Created `src/lib/api-client.ts` with `ApiError` class and generic typed fetcher.
- Created MSW mock infrastructure in `src/mocks/`.
- Created `src/app/c/[slug]/layout.tsx`, `college-app-shell.tsx`, and placeholder pages.
- Created `api-client.test.ts` and `navigation.test.tsx`.

## 16. What a human verified (how: ran tests, read code, checked docs, tried to break it)

- Ran `pnpm test` and saw 27 test files and 268 tests pass.
- Ran `pnpm verify` and confirmed formatting, linting, typechecking, tests, and build all succeeded cleanly.
- Verified that on `main`, `src/app/c/[slug]/` contained no `layout.tsx` before this work.
- Reviewed the code changes for adherence to CODING_STANDARDS and DESIGN_SYSTEM.

## 17. What each teammate can now explain/implement independently

- How to import and call `apiClient<T>("/route")` to fetch data with automatic error envelopes and typing.
- How to add mock handlers in `src/mocks/handlers.ts` for new endpoints.
- How the college app shell sets accent colors and handles mobile/desktop navigation.

## 18. Further learning resources

- Next.js 15+ App Router Documentation: [Layouts and Pages](https://nextjs.org/docs/app/building-your-application/routing/pages-and-layouts)
- MSW (Mock Service Worker) Documentation: [MSW v2 Docs](https://mswjs.io/docs/)
- W3C WAI-ARIA Navigation Landmark and Tabs Pattern

## 19. Docs updated because of this (per trigger table)

- `docs/learning/R3_frontend/INDEX.md`
- `docs/progress/R3_frontend/PROGRESS.md`
- `docs/progress/R3_frontend/daily/D01_R3.md`
- `docs/CHANGELOG.md`

## 20. Walkthrough drill: passed by / date

Pending R4 peer review.


---

## Upgrade (R3 takeover, 2026-11-08): the shell, session and API layer connected to the real backend

Branch: `r3/d1-upgrade-app-shell`. This section is added on top of the original session above. The original build used sample data and a placeholder shell. The upgrade connects the shell to the real API, rebuilds the layout for phone and desktop, and adds the pieces the first version was missing.

### U1. What changed and why

| Before | After | Why |
|---|---|---|
| One static shell with sample data and placeholder screens | A **college gate** (`CollegeGate`) in front of every `/c/{slug}` screen, then a **shell** (`CollegeShell`) | A screen must know who is signed in and which college they belong to before it shows anything |
| No way to know who is signed in | One new endpoint **TEN-08 `GET /api/v1/me/memberships`** answers both questions: 401 means signed out, a list means signed in (an empty list means signed in with no college) | One request, no guessing, no extra round trips |
| `fetch` calls spread over hooks, errors as strings | `src/lib/api-client.ts` (`ApiError`, `friendlyMessage`, idempotency keys) and `src/lib/api/endpoints.ts` (one typed function per endpoint, answers checked with the contract schemas) | A screen can never receive a shape the contract does not promise |
| Every screen invented its own loading and error | `useLoad` returns loading, ready or error with `reload`; `LoadError` shows plain words, a retry button and the request code | The four states of DESIGN_SYSTEM rule 2 look the same everywhere |
| Sidebar only | Sidebar on desktop and tablet, a slim top bar plus a **bottom tab bar** on phones (44px and larger touch targets, safe area under the home bar) | Mobile first |
| Same blue for every college | The college accent colour is applied through CSS variables, but only if it has at least 4.5 to 1 contrast on white (`src/lib/color.ts`) | DESIGN_SYSTEM colour rule |

### U2. How it works

1. `CollegeGate` mounts `SessionProvider`, which calls `GET /me/memberships` once and again when the tab becomes visible.
2. `useCollegeLoad(slug)` loads the public college (`GET /colleges/public/{slug}`) and finds my membership in the session. It returns one of: `loading`, `missing` (404), `error`, `signed-out`, `needs-join`, `needs-approval`, `ready`.
3. The gate redirects: signed out to `/signin?next=...`, not a member to `/c/{slug}/join`, waiting or refused to `/c/{slug}/pending`. While it asks, the shell's own outline (skeleton) is shown, so nothing jumps.
4. When `ready`, the shell shows only the tabs the college switched on (`modules`), the unread count on the bell (refreshed every 60 seconds), and my name and picture.
5. Campus shows real announcements (ANN-01) and Notifications shows real notifications (NOT-01, NOT-02). Collaborate and Career are honest "coming soon" pages, not fake content.

### U3. Things we learned the hard way

- **Next.js keeps the screens you left alive in the background** (Cache Components uses React `Activity`). The college gate that saw you signed out was still alive after sign in, and showed the old answer for a moment, so you were sent back to the sign in page. Fix: after sign in, sign out, leaving a college and deleting an account the app does a **full page load** (`window.location.replace`). Rule: when the identity of the person changes, do not use a client navigation.
- **Lint rule `react-hooks/set-state-in-effect`**: state must not be set synchronously in an effect body. `useLoad` stores each answer together with the inputs it belongs to, and "loading" simply means "the stored answer belongs to older inputs". No `setState` in the effect body, no flicker.
- **`export const instant = false`**: routes that depend on the signed in person cannot be prerendered, so they opt out of Next 16's instant navigation check. Client components cannot export it, so each page is a small server component that renders the client screen.
- **Route groups**: `(app)` is behind the gate, `(public)` is not (the college front door, join, waiting). The address stays `/c/{slug}/...`.

### U4. Tests (what exists, how to run)

```bash
node node_modules/vitest/vitest.mjs run src/lib src/components   # color, use-load, api-client, otp-input, avatar
pnpm test:integration                                          # includes TEN-08 and the permission matrix
pnpm test:e2e -- e2e/shell.ui.spec.ts                          # desktop and phone, real backend (needs pnpm db:start)
```

The shell browser tests check: a member sees Campus inside the shell, the tabs open, signing out ends the session, an unknown address shows the not found page, and no page scrolls sideways.

### U5. Docs updated because of this

`docs/API_CONTRACT.md` (section 15, TEN-08), `docs/PERMISSIONS.md`, `docs/BACKEND_STATUS.md`, `docs/openapi.v1.json` (regenerated), `docs/DESIGN_SYSTEM.md` (shell and shared parts), `docs/ROUTES_AND_NAVIGATION.md`, `docs/progress/R3_frontend/PROGRESS.md`.

### U6. What a human verified

Ran the shell against the real local backend (Supabase and the dev server) on a phone width and a desktop width, read the pages in a browser, and ran the tests above. The original sample data mode (`NEXT_PUBLIC_API_MOCKING=enabled`) still works: its handlers are in `src/mocks/handlers-app.ts`.
