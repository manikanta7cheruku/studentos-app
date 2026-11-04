# Progress board - R3 Frontend

Only R3 Frontend tasks are listed here. Other roles keep their own files. See [../README.md](../README.md).

Everyone updates their own rows at the end of each task and each day. Status: Not started, In progress, In review, Blocked, Done.
"Done" means it passed the Definition of Done (docs/DEFINITION_OF_DONE.md), including tests you really ran.

| Day | Role | Task ID | Task | Status | PR link | Tests run (what you saw) | Learning file | Notes |
|---|---|---|---|---|---|---|---|---|
| 1 | R3 | R3-D1-1 | App shell and API client | In review | [PR](https://github.com/manikanta7cheruku/studentos-app/pull/new/r3/d1-app-shell) | pnpm test (27 test files, 268 passed); pnpm verify (all 5 checks passed) | [docs/learning/R3_frontend/build-sessions/D01_R3_app-shell-api-client.md](../../learning/R3_frontend/build-sessions/D01_R3_app-shell-api-client.md) | MSW sample API added under NEXT_PUBLIC_API_MOCKING flag |
| 2 | R3 | R3-D2-1 | Sign in and join screens | In review | ready for PR | `pnpm test src/features/auth-and-join`: 12 passed. `pnpm verify`: 26 files, 274 tests passed, tsc --noEmit ok, eslint ok, format ok, next build ok (all routes static/PPR). Manual browser test: all 6 screens verified on dev server | docs/learning/R3_frontend/build-sessions/D02_R3_signin-join-screens.md | 6 screens built: college landing, enter email, enter code, choose how to verify, pending, rejected. Single switch (AUTH_JOIN_CONFIG.useRealApi), full keyboard/screen-reader accessibility with R4 UI parts, friendly error messages. Draft E2E in e2e/sign-in-and-join.ui.spec.ts |
