> Note: this file came from the first planning package. Old "doc NN" numbers, "T-" task IDs and Figma mentions are out of date. The task list is in ROADMAP.md. Design is built in code (see DESIGN_SYSTEM.md). Project folders are simpler now: src/contracts and src/components/ui.

# 22 - Observability and Operations

| Field | Value |
|---|---|
| Doc ID | DOC-22 |
| Version / Date | 0.1.0 / 2026-10-15 |
| Owner | R5 (R2 backup) |
| Status | Proposed |

## 1. Structured logs
JSON lines: `ts, level, event, request_id, route, method, status, duration_ms, tenant_id, user_id_hash, error_code`. Forbidden fields in doc 17 §6. Request id generated at edge/middleware, returned in `X-Request-Id` and error envelope. Retention: provider defaults (free tiers are short - Supabase logs ~7 days per sources; export key events if needed).

## 2. Error tracking
Sentry (free tier, verify) in browser + server; `beforeSend` scrubs emails/tokens; release tagging with git SHA; source maps uploaded in CI only; tenant id as tag (not name).

## 3. Health and readiness
- `GET /api/health` - process up (no dependencies) → 200.
- `GET /api/ready` - DB reachable (simple query, 2 s timeout), storage reachable, config valid → 200/503. Used by uptime monitor.
- External uptime monitor (free tier; to select) hitting `/api/ready` every 5 min with alert to the team channel.

## 4. Application metrics
| Metric | Source | Why |
|---|---|---|
| Request rate, error rate (4xx/5xx), P50/P95 latency by route | Hosting logs/APM | Reliability |
| OTP requests, success rate, resend rate | App events | Auth health + abuse |
| Verification funnel (started → completed → approved) | PostHog | Onboarding |
| Active members/week per tenant | PostHog/DB | Adoption |
| Reports open/age | DB | Safety SLA |
| DB size, connections, slow queries | Supabase dashboard | Capacity |
| Storage & egress | Supabase | Cost |
| Email sent/bounced | Provider | Deliverability |
| Job run success | Logs | Reminders working |

## 5. Alerts and ownership
| Alert | Condition | Severity | Owner (backup) |
|---|---|---|---|
| Site down | `/api/ready` fails 2× | Sev1 | R5 (R2) |
| Error spike | 5xx > 2% for 10 min | Sev2 | R2 (R5) |
| Auth failures spike | OTP failures > 3× baseline | Sev2 | R2 |
| DB near limit | > 70% size/conn | Sev3 | R5 |
| Backup missing | no successful backup in 26 h | Sev2 | R5 |
| Email bounce > 5% | | Sev3 | R2 |
| Open reports > 24 h old | | Sev3 | tenant moderators; R1 notified |
| Cost alert | > 70% of any paid quota | Sev3 | R5 |
Channel: team chat + email; during beta a **duty rota** (one primary per day, one backup) is posted.

## 6. Privacy-safe diagnostics
Prefer ids and codes; sampling for verbose logs; support asks users for the request id, never for their password/OTP; debug mode never enabled in production.

## 7. Provider failure visibility
Status pages subscribed (Supabase, Vercel, email provider, GitHub); wrapper adapters emit `provider_error{provider,op}` counters; `/status` page (T2) lists degraded modes.

## 8. Incident triage
Severity: **Sev1** data exposure/major outage/data loss; **Sev2** core journey broken for many; **Sev3** minor/degraded. Steps: acknowledge in channel → assign incident lead → mitigate (flag off/rollback) → communicate (banner/status) → fix → post-mortem (Sev1–2). Template in `../templates/INCIDENT_TEMPLATE.md`.

## 9. Runbooks (index; text in doc 23)
RB-01 Site down · RB-02 DB paused/unavailable · RB-03 OTP emails not arriving · RB-04 Bad deploy rollback · RB-05 Migration failure · RB-06 Suspected data exposure · RB-07 Leaked secret · RB-08 Invite code abuse · RB-09 Restore from backup · RB-10 Tenant onboarding.

## 10. Capacity and cost monitoring
Weekly review (10 min) of quota dashboards vs triggers in doc 12 §6; record in `OPS_LOG.md`.
