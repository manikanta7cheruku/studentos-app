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
