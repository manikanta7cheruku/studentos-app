# Security pass 1: headers, CSP, write limits, permission table - build session

| Field | Value |
|---|---|
| Date / Author (role) | 2026-11-07 / R2 Backend and database |
| Linked task / ADR / PR | R2-D4-2 / DECISIONS (CSP with inline scripts) / PR link added when opened |
| Related docs | docs/PERMISSIONS.md, docs/SECURITY_AND_PRIVACY.md, docs/AUTH_AND_TENANCY.md section 4 |

## 1. What we are learning and why it is needed

Before more features arrive, check the basics: browser protections (security headers and a Content Security Policy), a limit on how fast one person can write, and a written table of who may call every endpoint that a script checks.

## 2. What problem it solves

- A malicious page cannot frame StudentOS, sniff file types or load scripts from other sites.
- One person (or a script) cannot send unlimited writes: 60 a minute.
- Nobody can add an endpoint without writing down who may call it, because a test fails.

## 3. Concepts and terminology (short glossary)

- CSP (Content Security Policy): a header that lists where the page may load scripts, styles, images and connections from.
- Nonce: a random value per page that allows one inline script. Needs a fresh page for every request.
- HSTS: tells the browser to use HTTPS only.
- Permission matrix: the table of endpoint by role with the expected status code, run as a test.

## 4. How it works internally (appropriate depth)

1. `next.config.ts` sets headers for every path: CSP, `X-Content-Type-Options: nosniff`, `X-Frame-Options: DENY`, `Referrer-Policy`, `Permissions-Policy`, `Cross-Origin-Opener-Policy`, `Cross-Origin-Resource-Policy`, and in production `Strict-Transport-Security` and `upgrade-insecure-requests`. `X-Powered-By` is off.
2. CSP decision: this app uses Cache Components and partial prerendering. The Next.js guide says nonce based CSP needs dynamic rendering for every page and is incompatible with partial prerendering. So scripts and styles allow `'unsafe-inline'`, and everything else is strict (`default-src 'self'`, no plugins, no framing, `base-uri` and `form-action` own origin, connections only to our origin and the Supabase URL). `'unsafe-eval'` and websockets are allowed in development only. Subresource Integrity is the experimental way to remove `'unsafe-inline'` later.
3. `limitWrites(userId)` (60 a minute, bucket `write_user`) now runs on every member write endpoint, including logout and the three join endpoints. Admin and moderator endpoints keep their own 120 a minute bucket.
4. `docs/PERMISSIONS.md` has one row per route method. The test in `tests/integration/permission-matrix.test.ts` reads the route files and the table: a route missing from the table, a row with no route, or a row with no matrix call all fail.
5. The matrix calls each endpoint as: not signed in, pending, suspended, student level 1 and 2, moderator, admin, student of another college and admin of another college. For endpoints that would change data, the call is a harmless probe (an unknown id, or an empty body), so the status shows whether the permission check came first.

## 5. How it is used in StudentOS (files/modules)

`next.config.ts`, `src/lib/security-headers.test.ts`, `src/lib/write-limit.ts`, `docs/PERMISSIONS.md`, `tests/integration/permission-matrix.test.ts`, the join and logout routes.

## 6. Request/response and data flow (diagram or numbered trace)

Request arrives, Next adds the headers to the response, the route runs its checks (origin, login, role, limit), and only then the body is read. The matrix proves the order: a student sending an empty body to an admin endpoint gets 403, not 400.

## 7. API methods, endpoints, schemas, status codes

No new endpoints. Extra code: 429 `RATE_LIMITED` with `Retry-After` on all write endpoints after 60 in a minute.

## 8. Database changes and relationships

None.

## 9. Authentication / authorization behaviour

Results are in docs/PERMISSIONS.md. Findings are in section 10.

## 10. Errors and edge cases (findings of this pass)

| # | Finding | Result |
|---|---|---|
| 1 | No security headers at all | Fixed: headers added and tested |
| 2 | Write limit of 60 a minute was not applied to join and logout | Fixed |
| 3 | SQL raised `VALIDATION_FAILED` without `details.fields` (breaks the error contract) | Fixed in `mapDbError` |
| 4 | Permission matrix only covered the read endpoints and some writes | Fixed: all 34 route methods have a row and a call |
| 5 | CSP needs `'unsafe-inline'` for scripts | Accepted for now, written in DECISIONS. Revisit with SRI |
| 6 | Moderator endpoints returned correct codes even with the TypeScript role check removed | Good: the SQL check is a second lock (defence in depth) |
| 7 | pgTAP file 007 fails if integration tests ran before it on the same database (it counts all audit rows) | Open: run `db reset` first. Follow-up for R5 |
| 8 | Header values shown in the browser pane after `next start` | Checked with curl and in the browser: all headers present, page renders, no console errors |

## 11. Tests: what exists and how to run them (exact commands)

```
pnpm test                 # src/lib/security-headers.test.ts
pnpm test:integration     # permission-matrix.test.ts (381 checks here)
pnpm verify
```

Seen on 2026-11-07: unit 314 passed, pgTAP PASS (after reset), integration 584 passed, 2 skipped. Mutation checks: allowing students on moderator routes made matrix checks fail (the SQL lock still refused them); removing one row from docs/PERMISSIONS.md made the table test fail.

## 12. How to debug common failures

- A page is blank in the browser and the console says "Refused to load...": the CSP blocks it. Add the origin to the right directive in `next.config.ts` on purpose, not `*`.
- The table test says a route is missing: add the row to docs/PERMISSIONS.md and a call to the matrix.

## 13. Security considerations

`'unsafe-inline'` weakens XSS protection for scripts. The app has no user-written HTML (text only), and other directives stay strict. HSTS preload is only a header here; submitting the domain to the preload list is a separate decision.

## 14. Alternatives and trade-offs

Nonces (strictest) would make every page dynamic and slower. SRI is the future option. A report-only CSP first would help find breakage, but local browser checks showed none.

## 15. What AI generated or suggested (prompts used, summary)

AI (Claude Code) read the Next.js CSP guide in `node_modules/next/dist/docs`, wrote the config, tests, table and this note, and ran the mutation checks.

## 16. What a human verified (how: ran tests, read code, checked docs, tried to break it)

Done with real output: all suites, curl of the headers on a production build, the page in the in-app browser. Not done: a security reviewer who is not the author, a check of the staging site headers (after deploy), an external scanner.

## 17. What each teammate can now explain/implement independently

R5: add a row to the permission table and the matrix for a new endpoint. R3: know why inline scripts are allowed and that new external hosts need a CSP change.
