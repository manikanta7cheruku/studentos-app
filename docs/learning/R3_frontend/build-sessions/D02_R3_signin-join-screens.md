# Sign in and join screens - build session

| Field | Value |
|---|---|
| Date / Author (role) | 2026-11-03 / R3 Frontend and App Screens |
| Linked task / ADR / PR | R3-D2-1 / DOC-07 (F-01) / Branch: `r3/d2-signin-join-screens` |
| Related docs | docs/FEATURES_AND_JOURNEYS.md (F-01), docs/AUTH_AND_TENANCY.md, docs/API_CONTRACT.md (AUTH-01..02, TEN-01..05), docs/DESIGN_SYSTEM.md |

## 1. What we are learning and why it is needed

A new student or visitor enters through their college link (`/c/{slug}`) and needs a frictionless, accessible path to becoming an active member without seeing technical error jargon or raw database error codes. This build session implements the complete user journey: college landing branding, email OTP sign-in, code verification, multi-method verification selection (invite code, college email, manual form), and status tracking (pending review, rejection with guidance).

## 2. What problem it solves

- **No password friction**: Uses email OTP authentication with clear 60s resend cooldown.
- **Friendly error recovery**: Maps raw API codes (`OTP_INVALID`, `OTP_EXPIRED`, `INVITE_EXHAUSTED`, `INVITE_EXPIRED`) to clear, reassuring guidance for students.
- **Accessible by default**: Adheres to WAI-ARIA guidelines using R4's `FormField` and `ErrorSummary` (`role="alert"`), ensuring full keyboard navigation and screen-reader announcements.
- **Zero-coupling development**: Allows frontend testing with rich sample data via a single configuration toggle (`AUTH_JOIN_CONFIG.useRealApi`).
- **Server as source of truth**: The UI does not infer or grant permissions; routing is strictly governed by server-returned membership statuses (`active`, `pending`, `rejected`).

## 3. Concepts and terminology

- **OTP**: One-time 6-digit numeric password delivered to email.
- **Tenant Landing**: The public `/c/{slug}` entrypoint displaying college branding and enabled join methods.
- **Verification Methods**: Tenant-configurable pathways:
  - `invite_code`: Instant activation or pending review via admin/ambassador code.
  - `email_domain`: Proof of enrollment via `@college.edu` email verification.
  - `manual`: Student details (enrollment number, program, grad year) submitted to the admin verification queue.
- **Partial Prerendering (PPR)**: Next.js 16 architecture where static shell HTML is prerendered and dynamic parts stream inside `<Suspense>`.
- **Idempotency Key**: Unique UUID sent in the `Idempotency-Key` header on write requests (`TEN-03`, `TEN-04`) to prevent duplicate enrollments on network retries.

## 4. How it works internally

1. **Routing and Streaming**:
   Each dynamic route (`/c/[slug]`, `/c/[slug]/sign-in`, `/c/[slug]/verify`, `/c/[slug]/pending`, `/c/[slug]/rejected`) receives `params: Promise<{ slug: string }>`. To comply with Next.js 16 Partial Prerendering rules, async parameter resolution is encapsulated inside `<Suspense>` boundaries with matching skeleton fallbacks.
2. **Unified Client Service (`api.ts`)**:
   Calls check `AUTH_JOIN_CONFIG.useRealApi`. When `false`, realistic in-memory handlers simulate latency and specific test error cases (`000000` -> invalid, `999999` -> expired, `EXHAUSTED` -> invite exhausted). When `true`, it delegates to real fetch endpoints with `credentials: "include"`, `Origin`, and `Idempotency-Key` headers.
3. **Screen Flow**:
   - `/c/{slug}`: Queries public branding and checks existing membership.
   - `/c/{slug}/sign-in`: Handles email entry (`EnterEmailStep`) &rarr; 6-digit OTP code (`EnterCodeStep`).
   - If membership is null, redirects to `/c/{slug}/verify`.
   - If membership status is `active`, redirects to `/campus`.
   - If membership status is `pending`, redirects to `/c/{slug}/pending`.
   - If membership status is `rejected`, redirects to `/c/{slug}/rejected`.

## 5. How it is used in StudentOS

- `src/features/auth-and-join/`:
  - `config.ts`: Single toggle switch.
  - `types.ts`: TypeScript contracts and friendly error dictionary.
  - `sample-data.ts`: Mock colleges, memberships, and error triggers.
  - `api.ts`: API service client.
  - `components/`: `landing-screen.tsx`, `enter-email-step.tsx`, `enter-code-step.tsx`, `sign-in-screen.tsx`, `verify-methods-screen.tsx`, `pending-screen.tsx`, `rejected-screen.tsx`.
- `src/app/c/[slug]/`:
  - `page.tsx`: Route for Screen 1.
  - `sign-in/page.tsx`: Route for Screens 2 & 3.
  - `verify/page.tsx`: Route for Screen 4.
  - `pending/page.tsx`: Route for Screen 5.
  - `rejected/page.tsx`: Route for Screen 6.
- `src/features/auth-and-join/__tests__/sign-in-join-screens.test.tsx`: 12 component tests verifying all 6 screens and error states.
- `e2e/sign-in-and-join.ui.spec.ts`: End-to-end user journey draft.

## 6. Verification and testing

- `pnpm test src/features/auth-and-join`: 12 component tests passed.
- `pnpm verify`: 26 test files passed, 274 tests passed, format, lint, typecheck, and build ok.
- Verified in browser with `pnpm dev` on port 3000 across all 5 routes.


---

## Upgrade (R3 takeover, 2026-11-08): sign in and join screens built on the real backend

Branch: `r3/d2-upgrade-signin-join`. **Important correction:** the original Day 2 work (six screens behind a `useRealApi` switch) was never pushed to GitHub, so there were no sign in or join pages in the product. This upgrade builds them again, connected to the real API from the first line, with no switch.

### U1. The screens

| Address | What it does | Endpoints |
|---|---|---|
| `/signin` | Email, then a six digit code. Works for new and returning people. Goes to `?next=` or to your college | AUTH-01 `POST /auth/otp/request`, AUTH-02 `POST /auth/otp/verify`, TEN-08 |
| `/find` | A signed in person with no college enters the college code or pastes its link | none (goes to `/c/{code}`) |
| `/c/{slug}` | The college front door: name, place, what is inside, one button | TEN-01 `GET /colleges/public/{slug}` |
| `/c/{slug}/join` | Only the join methods the college allows: invite code, college email (two steps), or ask to join (enrolment number, course, year) | TEN-03, TEN-04, TEN-05 |
| `/c/{slug}/pending` | Waiting for approval (checks again every 30 seconds), or not accepted or paused, with the reason from the college | TEN-02 |

### U2. Rules these screens follow

- **One main action, left aligned, no template look**: `AuthFrame` is a plain top bar and two columns on a wide screen (what this step is, the step itself) and one column on a phone.
- **Six boxes for the code, one real input behind them** (`OtpInput`): typing moves on, backspace moves back, paste fills all boxes, phones offer the code from the mail (`autocomplete="one-time-code"`), screen readers see one field.
- **The resend button counts down** (`useCooldown`, starts from `retry_after_seconds`).
- **Safe `next` address** (`safeNext`): only a path inside the app is accepted. `https://other.site`, `//other.site`, backslashes and control characters are dropped, so a crafted sign in link cannot send a person away.
- **Idempotency**: the invite and manual join calls send an `Idempotency-Key`. One attempt keeps one key, so a double tap or a retry after a dropped connection cannot join twice. The key is renewed after a real answer from the server.
- **Plain error words** for `INVITE_INVALID`, `INVITE_EXPIRED`, `INVITE_EXHAUSTED`, `OTP_INVALID`, `OTP_EXPIRED`, `RATE_LIMITED` (with the number of seconds), offline. Field errors from `VALIDATION_FAILED` are shown next to the field.
- **No account enumeration**: the screens say the same thing whether or not the address exists, like the server.
- **Full page load after sign in** (see D01 upgrade, U3): the college gate that saw you signed out would otherwise show the old answer.

### U3. Edge cases covered

Not signed in on a college page goes to sign in and comes back. A member who opens `/join` goes straight to the campus. A person who is waiting goes to `/pending`. A person who left can join again. A refused person can try again. Unknown college shows "We could not find that college". Offline shows a retry button with the request code.

### U4. Tests

```bash
node node_modules/vitest/vitest.mjs run src/features/auth       # safeNext, looksLikeEmail, collegeCodeFrom
pnpm test:e2e -- e2e/signin-join.ui.spec.ts e2e/shell.ui.spec.ts # real backend, desktop and phone
```

The browser tests sign in with a real code read from the local mailbox (Mailpit), join with real invite codes created in the database, and check: wrong email, wrong code, no college, signed out visitor, good invite, wrong invite, invite that needs approval, unknown college, and no sideways scrolling on every page.

### U5. What a human verified

Ran all browser tests on a desktop and a phone browser against the real local backend (18 sign in and join tests passed, 7 shell tests passed and 1 skipped because the phone sign out is in Settings, Day 3), and looked at the pages at 390px and 1280px wide.

### U6. Docs updated

`docs/ROUTES_AND_NAVIGATION.md` (real sign in, find, join and waiting addresses), `docs/progress/R3_frontend/PROGRESS.md` (the old Day 2 row said the screens were ready, but they were never pushed; corrected).
