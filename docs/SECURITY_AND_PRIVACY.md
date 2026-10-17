> Note: this file came from the first planning package. Old "doc NN" numbers, "T-" task IDs and Figma mentions are out of date. The task list is in ROADMAP.md. Design is built in code (see DESIGN_SYSTEM.md). Project folders are simpler now: src/contracts and src/components/ui.

# 19 - Security and Privacy

| Field | Value |
|---|---|
| Doc ID | DOC-19 |
| Version / Date | 0.1.0 / 2026-10-15 |
| Owner | R2 (R5 co-owner) |
| Status | Proposed. **This is an engineering plan, not a legal compliance certification. Qualified legal advice is required.** |

## 1. Assets and trust boundaries
Assets: student identities and contact data, verification data, private career data (applications), content, admin power, tenant isolation, audit logs. Trust boundaries: browser ↔ Next.js; Next.js ↔ Supabase; Next.js ↔ email/analytics/Sentry; Vercel/GitHub CI ↔ secrets; admin ↔ student data.

## 2. Threat model (STRIDE-style summary)
| Threat | Example | Control | Test |
|---|---|---|---|
| Spoofing | Fake student joins college | Doc 15 §3, §12 | TC-VER-* |
| Tampering | Client sets `college_id`/role | Server derives from path/session; RLS WITH CHECK | TC-PERM-* |
| Repudiation | Admin denies action | Append-only audit logs | TC-ADM-10 |
| Info disclosure | Cross-tenant read, IDOR, verbose errors, logs with PII | RLS, 404 policy, scrubbed logs | TC-TEN-*, log review |
| Denial of service | OTP spam, large uploads, expensive queries | Rate limits, size limits, pagination caps, timeouts | TC-RATE-*, k6 |
| Elevation | Student calls admin endpoint | Role checks + RLS; separate route group | TC-PERM-* |
| Supply chain | Malicious/typosquat package | Dependency policy, lockfile, audit, review | CI |
| Secrets leakage | `.env` committed | Secret scanning (gitleaks), pre-commit, rotation | CI |
| Content abuse | Spam, harassment, copyright | Reports, moderation, rate limits, takedown process | TC-RPT-* |

## 3. Controls
- **AuthN/AuthZ:** doc 15; server-side only; deny by default.
- **Input validation:** Zod on every route; length/size limits; reject unknown fields.
- **Output encoding / XSS:** React escaping; no `dangerouslySetInnerHTML`; user text rendered as plain/limited markdown through a sanitiser; strict CSP (no inline scripts, nonce), `X-Content-Type-Options`, `Referrer-Policy`, `Permissions-Policy`, `frame-ancestors 'none'`.
- **SQL injection:** parameterised queries/RPC only; no dynamic SQL from input; DB roles least-privilege.
- **CSRF:** SameSite=Lax cookies, `Origin`/`Host` verification on mutating routes, no state change on GET.
- **Session:** HttpOnly/Secure cookies, rotation, short lifetime, revocation on sign-out.
- **Secrets:** only in provider secret stores/GitHub Secrets; separate per environment; rotation procedure in runbook; never in client bundle (`NEXT_PUBLIC_*` reviewed).
- **Uploads:** server-validated MIME (magic bytes), size caps, random filenames, private buckets, signed URLs ≤ 5 min, no executable types, images re-encoded server-side where feasible; malware scanning deferred (risk R-021).
- **Rate limiting/abuse:** per-route limits (doc 14), per-tenant caps, IP + account keys; Turnstile if abused.
- **Dependencies:** Dependabot/Renovate, `pnpm audit`, secret scan, SAST (CodeQL) in CI.
- **Admin access:** doc 15 §8; support grants audited; production DB access limited to R2/R5 via SSO/2FA; no shared credentials.
- **Logging:** privacy-safe (doc 17 §6).
- **Backups:** doc 23; encrypted by provider.
- **Tenant isolation:** CI-enforced RLS coverage + negative tests.

## 4. Privacy and data minimisation
| Data | Purpose | Lawful basis (to confirm with counsel) | Retention |
|---|---|---|---|
| Email | Sign-in, notices | Consent/contract | Until deletion |
| Name, headline, skills | Profile | Consent | Until deletion |
| Enrollment no. (hashed) + program/year | Verification | Consent | Per doc 13 §6 |
| Applications (private) | Tracker | Consent | Until deletion |
| Analytics events (no PII) | Product improvement | Consent/legitimate use (confirm) | 12 months |
| Audit logs | Security/accountability | Legitimate interest/legal (confirm) | 24 months (proposed) |
- **Collect nothing we don't use.** No gender, caste, religion, address, DOB, phone (v1), government IDs.
- **Consent UX:** plain-language notice before data collection; record version/time; separate consent for optional analytics and emails; withdrawal path in `/me/privacy`.
- **User rights:** access/export, correction, deletion, grievance contact (named role + email) - design for these now.
- **Children/minors:** some students may be under 18. Under India's rules, processing a child's data needs verifiable parental consent (obligations commence later - see §5). **Policy proposal for beta: tenants confirm all invited users are 18+, or the product is not used with minors until legal guidance (OQ-09).**
- **Data location:** choose Supabase region (India/Singapore options to verify); disclose processors (Supabase, Vercel, email, PostHog, Sentry); evaluate cross-border transfer rules.

## 5. Legal and regulatory (India) - verified 2026-10-15, **needs legal review**
- India's **Digital Personal Data Protection Act, 2023** and **DPDP Rules, 2025** were notified; sources (law-firm and news summaries, Nov 2025) state the Rules were notified on 13–14 Nov 2025 with **phased commencement**: Board/definitions immediately; **consent-manager provisions from 14 Nov 2026**; **notice, verifiable consent (incl. children), security safeguards, breach reporting and most obligations from 14 May 2027**.
- Reported obligations (to confirm in the primary text): clear notice with consent request; verifiable parental consent for children's data; reasonable security safeguards; breach notification (sources mention 72-hour reporting to the Board); erasure/retention rules; grievance redressal within a stated period (sources: ≤ 90 days).
- **Planning stance:** build to the Rules' standards *before* May 2027 since we will hold student data; treat today's pilot as if the obligations already apply.
- Also investigate: IT Act/CERT-In incident-reporting expectations; terms of service and privacy policy; copyright takedown handling for notes (Copyright Act); intermediary obligations for user-generated content; college agreements (data processing roles: college as data fiduciary vs StudentOS as processor - **needs counsel**); contract/consumer law for any paid tier.
- Primary sources to read (R1+counsel): official Gazette text of DPDP Act 2023 and DPDP Rules 2025 (MeitY).

## 6. Security incident response
| Step | Owner | Time target |
|---|---|---|
| Detect (alert/report) | Anyone → R5 | - |
| Triage severity (Sev1 data exposure; Sev2 auth issue; Sev3 other) | R2 + R5 | 30 min |
| Contain (disable feature flag/tenant, rotate secrets, revoke sessions) | R2 | 1 h Sev1 |
| Preserve evidence (logs, DB snapshot) | R5 | Parallel |
| Assess impact (which tenants/users/data) | R2 | 24 h |
| Notify (affected tenant admins/users; Board if legally required - **counsel**) | R1 with counsel | Per law |
| Fix and verify (regression test) | Owner | - |
| Post-mortem blameless, within 5 days | R5 chairs | - |
Contact tree in `RUNBOOK` (doc 23).

## 7. Security release checklist
See `../RELEASE_CHECKLIST.md` §Security. Minimum: RLS coverage test green, negative tenant tests green, dependency audit no critical/high unresolved, secrets scan clean, CSP verified, rate limits active, admin endpoints 403 for students verified, error pages leak nothing.

## 8. Open questions
OQ-09 minors; OQ-10 data region; OQ-11 counsel; OQ-13 college as fiduciary/processor.
