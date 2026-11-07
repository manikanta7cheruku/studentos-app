# Helping R3 connect the real API - build session

| Field | Value |
|---|---|
| Date / Author (role) | 2026-11-07 / R2 Backend and database |
| Linked task / ADR / PR | R2-D6-2 / none / https://github.com/manikanta7cheruku/studentos-app/pull/32 |
| Related docs | docs/CONNECTING_THE_API.md, docs/API_CONTRACT.md, docs/PERMISSIONS.md |

## 1. What we are learning and why it is needed

R3 builds screens on sample data. The jump to the real API is where surprises happen (cookies, idempotency keys, cursors, error codes). This task removes the surprises before R3 reaches them.

## 2. What problem it solves

- One guide (docs/CONNECTING_THE_API.md): how to run the backend, who the sample people are, the rules every call follows, a screen to endpoint map, the surprises, and what is not built yet.
- Sample answers for every Day 4 and Day 5 endpoint, so R3 can build those screens today and switch to the real API later without changing the screen.
- The missing `modules` flags in TEN-01 (which tabs a college has on), asked for by R3's navigation.
- A real bug found in R3's PR 25 earlier in the day (the people directory returned 503) is already fixed on that branch.

## 3. Concepts and terminology (short glossary)

- Sample handler (MSW): a fake server inside the browser or the tests that answers with fixtures.
- Contract fixture: a JSON sample that must pass the Zod schema of the endpoint.
- `modules`: `{ campus, collaborate, career }`, each true unless an admin turned it off.

## 4. How it works internally (appropriate depth)

1. `src/mocks/handlers-day4-5.ts` has one handler for each of the 17 Day 4 and Day 5 calls, with the same URL and method as the real route.
2. `src/mocks/handlers-day4-5.test.ts` starts a mock server, calls every handler and checks the body against the contract schema of the real endpoint. If a contract changes and the fixture does not, this fails.
3. `public_college_branding` (the view behind TEN-01) now returns `modules`. A tab is on unless `college_settings.features.<tab>` is false. Only those three flags are public.

## 5. How it is used in StudentOS (files/modules)

`docs/CONNECTING_THE_API.md`, `src/mocks/handlers-day4-5.ts` (+ test), `src/mocks/handlers.ts` (spreads them), `src/contracts/tenant.ts` and `fixtures/ten-01.success.json` (`modules`), the migration (view), `src/app/api/v1/colleges/public/[slug]/route.ts`.

## 6. Request/response and data flow (diagram or numbered trace)

R3 hides the Career tab: `GET /api/v1/colleges/public/alpha` answers `modules.career: false` after the admin switched it off, so the navigation drops the tab before sign in.

## 7. API methods, endpoints, schemas, status codes

TEN-01 answer has one new field, `modules`. Nothing else changed for R3 except the 409 `Retry-After` rule on create calls (explained in the guide).

## 8. Database changes and relationships

The view `public_college_branding` gets a `modules` column computed from `college_settings.features`.

## 9. Authentication / authorization behaviour

Unchanged. The public view still shows only branding columns of active colleges (the exposure test lists the columns and now includes `modules`).

## 10. Errors and edge cases

- A college that never set `features` has all three tabs on.
- Other feature flags are not public.
- The mock handlers are sample answers only: they do not check login or validate the request body. A real call can still fail with 401, 403, 404, 409 or 429, so screens must handle those (the guide lists them).

## 11. Tests: what exists and how to run them (exact commands)

```
pnpm test                 # src/mocks/handlers-day4-5.test.ts: 18 tests
pnpm test:integration     # TEN-01 modules test in reliability.test.ts, postgrest-exposure.test.ts
```

Seen on 2026-11-07: unit 395 passed, integration 807 passed (2 skipped on purpose).

## 12. How to debug common failures

- A screen works with the mocks and fails on the real API: compare the real answer with the fixture (guide section 7), then send R2 the `X-Request-Id`.
- `NEXT_PUBLIC_API_MOCKING=enabled` but the real API answers: the service worker was not started. Reload.

## 13. Security considerations

The sample handlers never contain real data. The `modules` flags reveal nothing private.

## 14. Alternatives and trade-offs

Generating the mock handlers from the contract automatically would remove drift entirely, but costs a build step. For now a test keeps them honest.

## 15. What AI generated or suggested (prompts used, summary)

AI (Claude Code) wrote the guide, handlers, test, migration and docs from R3's mock setup, the API contract and the roadmap line "Help R3 connect the real API".

## 16. What a human verified (how: ran tests, read code, checked docs, tried to break it)

Done with real output: unit and integration tests, build, the TEN-01 flag test with a real switch on and off.

Not done yet (open on purpose): R3 has not read the guide or tried it, no screen was connected, no second reviewer.

## 17. What each teammate can now explain/implement independently

R3: switch a screen from the sample handlers to the real API, read errors, and use idempotency keys. R4: see which fixtures a screen should be designed against.
