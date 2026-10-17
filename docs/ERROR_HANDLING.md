> Note: this file came from the first planning package. Old "doc NN" numbers, "T-" task IDs and Figma mentions are out of date. The task list is in ROADMAP.md. Design is built in code (see DESIGN_SYSTEM.md). Project folders are simpler now: src/contracts and src/components/ui.

# 18 - Error Handling and Failure Modes

| Field | Value |
|---|---|
| Doc ID | DOC-18 |
| Version / Date | 0.1.0 / 2026-10-15 |
| Owner | R2 (R5 owns failure tests) |
| Status | Proposed |

## 1. Principles
1. Fail safe: when unsure, deny access and keep data consistent.
2. Every failure has: user-visible behaviour, server behaviour, log/alert, retry policy, recovery, test.
3. **Never blindly retry non-idempotent operations.** Retries are allowed only for reads, idempotent writes (idempotency key / natural key), and with bounded exponential backoff + jitter (max 3 tries, total ≤ 10 s on client).
4. Timeouts everywhere: DB query 5 s, external HTTP 8 s, route handler 10 s (plan limits permitting).
5. Transactions wrap multi-step writes; partial failure leaves no half-state.

## 2. Failure catalogue
| # | Failure | User sees | Server does | Log / alert | Retry | Recovery | Test |
|---|---|---|---|---|---|---|---|
| F1 | Client network loss/timeout on read | Offline banner / retry button; cached data shown | - | - | Auto retry GETs 2× | Manual retry | E2E offline mode |
| F2 | Network loss on write | "We couldn't confirm that went through. Check before trying again." | If request arrived, idempotency key returns original result on retry | - | Retry **with same key** | Safe replay | TC-IDEM-01 |
| F3 | Email provider down (OTP) | "We're having trouble sending codes. Try again in a few minutes." | Return 503; don't reveal account existence | error + alert if > 5% 15 min | Client cooldown 60 s | Switch provider via config | TC-AUTH-11 (mock outage) |
| F4 | Storage down / upload fail | "Upload didn't finish. Try again." Draft form preserved | Signed URL expiry 5 min; orphan cleanup job | warn | User retries | Cleanup removes orphans | TC-UPL-03 |
| F5 | DB unavailable / paused (free tier) | Full-page "Temporarily unavailable" with status link | `/api/ready` fails; 503 | Sentry + alert | Backoff | Restore project; (free pause: unpause) | TC-SYS-02 |
| F6 | Transaction conflict / deadlock | Normally invisible | Retry transaction up to 2× on serialization/deadlock errors | warn | Auto bounded | - | TC-CONC-01 |
| F7 | Invalid input | Field-level errors | 400 `VALIDATION_FAILED` | none | None | Fix input | contract tests |
| F8 | Missing required / oversized input | Same + limits stated | 400/413 | none | None | | TC-VAL-02 |
| F9 | Wrong MIME/extension spoof | "That file type isn't allowed." | Server sniffs magic bytes, rejects | warn | None | | TC-UPL-01 |
| F10 | Session expired | Soft prompt to sign in again; draft kept | 401; refresh attempted once | none | One silent refresh | Re-auth | TC-AUTH-12 |
| F11 | Permission failure | Explains why (pending, role) | 403 with code | audit if admin endpoint | None | Contact admin | TC-PERM-* |
| F12 | Cross-tenant id access | "Not found" | 404 | **security log** (warn) | None | - | TC-TEN-* |
| F13 | Duplicate request/double click | One result shown | Idempotency key / unique constraint / disabled button | none | Replay safe | | TC-IDEM-02 |
| F14 | Concurrent edit (application) | "This changed elsewhere. Reload to see latest." | `version` check → 409 | none | Manual | | TC-APP-06 |
| F15 | Concurrent accept for last slot | "That role was just filled." | Row lock + CHECK → 409 `SLOTS_FULL` | info | None | | TC-TMF-14 |
| F16 | Empty search results | Empty state with suggestions (clear filters, post a request) | 200 empty | none | None | | e2e |
| F17 | Partial failure (post created, notification failed) | Success shown; notification retried silently | Notification write inside same transaction where possible; else outbox row + job retry | warn | Job retries 3× | Manual replay | TC-NTF-03 |
| F18 | Rate limited | "Too many attempts. Try again in N seconds." | 429 + Retry-After | counter | After delay | | TC-RATE-01 |
| F19 | Unexpected exception | "Something went wrong. Reference: {request_id}" | 500 `INTERNAL` | Sentry w/ request id | None automatic | Support uses id | TC-ERR-01 |
| F20 | Bad deployment (broken build) | Previous version continues (atomic deploys) | Health check fails post-deploy → alert | CI/alert | - | Roll back to last good deploy | Runbook drill |
| F21 | Migration fails midway | Maintenance banner if needed | Transactional migration; abort; no partial schema | alert | None | Fix forward or restore snapshot | Staging rehearsal |
| F22 | Migration drops/changes data wrongly | - | Pre-migration snapshot; dry run on staging copy | alert | - | Restore + compensating migration | Rehearsal |
| F23 | Notification delivery failure (email) | In-app still works | Mark failed; retry later; give up after 24 h | warn | Bounded | Resend from admin tool (T2) | TC-NTF-04 |
| F24 | Tenant suspended mid-session | Full-page notice | 403 `TENANT_SUSPENDED` | audit | None | Admin/platform restores | TC-TEN-06 |
| F25 | Scheduled job fails/doubles | Delayed reminders only | Job idempotent by unique (user,kind,ref,date) | alert on missing run | Next run catches up | | TC-JOB-01 |
| F26 | Roster import with bad rows | Preview with row errors; nothing imported until confirmed | Validation pre-pass; commit in one transaction | info | None | Fix CSV | TC-ADM-04 |
| F27 | OTP brute force | Lockout message | Attempt counter, lock 15 min | security log | None | Wait | TC-AUTH-06 |
| F28 | Leaked invite code | Code shows "revoked" | Revoke; audit; entrants flagged for review | alert on burst | - | Admin reviews | TC-VER-05 |
| F29 | Free-tier quota exceeded | Degraded features with notice | 429/503 from provider mapped to `UPSTREAM_UNAVAILABLE` | alert at 70% | - | Upgrade plan (doc 12 §6) | Ops check |
| F30 | Clock skew / timezone errors | Dates in tenant timezone | Store UTC | - | - | | unit tests |

## 3. Idempotency design
- Table `idempotency_keys` (doc 13). Middleware: on IDEM routes, hash body; if key exists → compare hash → replay stored response or 422; else execute and store result in same transaction as the write where possible.
- Natural idempotency (unique constraints) as a second line.
## 4. Retry policy summary
Client: reads 2× with jitter; writes only with key, 3×. Server→providers: email 3× (1 s, 3 s, 9 s) for transient errors only; storage 2×; DB serialization failures 2×. **Never** retry on 4xx.
## 5. Graceful degradation
Email down → in-app notifications still work; storage down → text-only posting works; analytics/Sentry down → app unaffected (fire-and-forget with timeouts).
