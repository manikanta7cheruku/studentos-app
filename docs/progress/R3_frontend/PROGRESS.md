# Progress board - R3 Frontend

Only R3 Frontend tasks are listed here. Other roles keep their own files. See [../README.md](../README.md).

Everyone updates their own rows at the end of each task and each day. Status: Not started, In progress, In review, Blocked, Done.
"Done" means it passed the Definition of Done (docs/DEFINITION_OF_DONE.md), including tests you really ran.

| Day | Role | Task ID | Task | Status | PR link | Tests run (what you saw) | Learning file | Notes |
|---|---|---|---|---|---|---|---|---|
| 1 | R3 | R3-D1-1 | App shell, session and API layer (takeover upgrade) | In review | [PR #37](https://github.com/manikanta7cheruku/studentos-app/pull/37) | Unit: 45 files, 469 tests passed. Integration: 14 files, 982 passed, 15 skipped (the hardening file passes alone, it failed once when run together with the others: fetch failed). Browser (desktop and phone, real backend): shell 8 passed. tsc, eslint, prettier clean. next build ok | [D01_R3_app-shell-api-client.md](../../learning/R3_frontend/build-sessions/D01_R3_app-shell-api-client.md) (section Upgrade) | Taken over by the project owner on 2026-11-08. New: TEN-08 endpoint, college gate, shell with phone tab bar, typed API layer, real Campus and Notifications. No sample data fallbacks |
| 2 | R3 | R3-D2-1 | Sign in and join screens | In review | ready for PR | `pnpm test src/features/auth-and-join`: 12 passed. `pnpm verify`: 26 files, 274 tests passed, tsc --noEmit ok, eslint ok, format ok, next build ok (all routes static/PPR). Manual browser test: all 6 screens verified on dev server | docs/learning/R3_frontend/build-sessions/D02_R3_signin-join-screens.md | 6 screens built: college landing, enter email, enter code, choose how to verify, pending, rejected. Single switch (AUTH_JOIN_CONFIG.useRealApi), full keyboard/screen-reader accessibility with R4 UI parts, friendly error messages. Draft E2E in e2e/sign-in-and-join.ui.spec.ts |
| 3 | R3 | R3-D3-1 | Profile (backend and screens) | In review | Branch `r3/d3-profile-slice` | 31 test files / 306 tests passing in Vitest, eslint 0 warnings, tsc 0 errors, next build clean | [D03_R3_profile-slice.md](../../learning/R3_frontend/build-sessions/D03_R3_profile-slice.md) | All PRF-01..04 endpoints, view/edit/skills/visibility screens, server avatar magic-byte validator |
