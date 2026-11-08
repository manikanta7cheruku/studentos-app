> Note: this file came from the first planning package. Old "doc NN" numbers, "T-" task IDs and Figma mentions are out of date. The task list is in ROADMAP.md. Design is built in code (see DESIGN_SYSTEM.md). Project folders are simpler now: src/contracts and src/components/ui.

# 15 - Authentication, Authorization and Tenancy

| Field | Value |
|---|---|
| Doc ID | DOC-15 |
| Version / Date | 0.1.0 / 2026-10-15 |
| Owner | R2 (R5 verifies) |
| Status | Proposed. **Security-critical: any change requires R2 + R5 review.** |

## 1. Identity and session model
- Identity = Supabase Auth user (email OTP/magic link, v1). One identity may hold memberships in several tenants (schema); v1 UI uses one active membership.
- Session: JWT access token + refresh token in HttpOnly, Secure, SameSite=Lax cookies; short access lifetime (default 1 h), refresh rotation; sign-out revokes refresh token; "sign out everywhere" supported.
- Server verifies the token on every request (`getUser`, not just decoding), then loads memberships.
- **Phone OTP is not an identity proof** and not in v1. **Self-selected college is a claim, not proof.**

## 2. Onboarding sequence
1. Open `/c/{slug}` → public branding (TEN-01).
2. Email OTP sign-in (AUTH-01/02). New `profiles` row created.
3. Join: creates `memberships` row (`pending`, level 0/1) via a verification method (§3).
4. When active: onboarding (display name, skills), consent to privacy notice recorded (`consents` row: version, timestamp).

## 3. Verification methods (tenant-configurable; multiple allowed)
Trust levels: **0** none · **1** self-claimed (manual request pending/or invite w/ approval) · **2** institutionally verified · **3** document-verified (reserved).

| # | Method | How it works | Level | Cost / admin effort | Privacy | Limitations / attacks |
|---|---|---|---|---|---|---|
| V1 | **College email domain** | User proves control of `x@college.edu` via OTP; domain registered by the admin | 2 | Low | Stores email only | Colleges without student email can't use; alumni/staff with same domain; shared/role mailboxes; domain typos - restrict to registered domains; allow admin exclusions list |
| V2 | **Invite code / link** | Admin or ambassador issues limited-use, expiring codes (hashed at rest) | 1 or 2 per tenant setting | Low | Minimal | Codes get shared in groups → use max_uses, expiry, revoke, per-batch labels, rate limits; leaked code = unverified entrants |
| V3 | **Roster match** | Admin uploads CSV (enrollment no./email); student claims by entering a matching identifier + OTP to any email | 2 | Medium (data prep) | Hashed identifiers; delete after window | Roster errors; enrollment numbers guessable → require second factor (email OTP + birth-year? **not collected**) or admin confirmation for mismatches; one claim per row |
| V4 | **Manual approval** | Student submits enrollment no., program, year; admin decides | 1→2 on approval | High at scale | Enrollment hashed + last4 | Admin can't verify without a source of truth; fake details; load; add "ask for a mentor/faculty vouch" |
| V5 | **Ambassador/club vouch** | Trusted ambassador confirms a student | 1→2 (by policy) | Low | Minimal | Collusion; limit vouches per ambassador; audited |
| V6 | **Student ID photo** (F-30, off) | Upload ID card, admin reviews, image deleted after decision | 3 | High | **Sensitive**; breach impact; DPDP duties | Forged IDs; reviewers see data; photo of others' ID; keep disabled until legal review and secure bucket |
| V7 | **SSO / LMS / ERP / Google Workspace for Education** (future) | OIDC/SAML from the college IdP | 2–3 | High per college | Depends | Needs college IT; availability |
| V8 | **Government/academic identity services** (e.g. India's student ID/DigiLocker-type options) | **Investigate** (pending, not verified) | TBD | TBD | TBD | Availability, terms, consent obligations - research task OQ-12 |
| V9 | **Peer vouching** | N existing verified members vouch | 1→2 | Low | Social graph | Sybil/collusion; only as supplement |
| V10 | **Open join (Global only)** (built, TEN-09) | A signed in person joins the special `global` college at once. No proof of any college | 1 | None | Minimal | Unverified people: keep posting limits, no marketplace or notes, show "not verified by a college" on the profile. The database allows `open` only for the Global college |

**Sign in options (decision D-25, 2026-11-08).** Email code (AUTH-01/02) is always available. **Continue with Google** (AUTH-05/06) is added as the main button once Google is set up in Supabase (`docs/PRODUCTION_SETUP.md`, "Continue with Google"); a person who signs in with Google gets the same account as the same email address. Phone sign in is still not used.

**Who comes in, and where they go.** 1. Sign in. 2. If the person has no college: `/find` offers "enter your college link or code" or "Join Global". 3. Joining a college uses the methods that college allows (V1 to V5). 4. People whose college has no college email, or is not on StudentOS, use Global, or an invite code from a college admin or ambassador. 5. A person may be in Global and in a college at the same time.

**Audience of posts (decided, not built yet).** Each project, team post or event gets an `audience`: `college` or `global`. A college post is seen only by that college. A Global post is seen by Global members and by every college member, so students can team up across colleges. Built together with the Collaborate screens; it needs one new column and one visibility rule in RLS, with tests in `tests/integration/people.test.ts` style (hidden and cross college cases).

**Tenant policy defaults (recommended):** allow V1 + V2 + V4; require admin approval for V2/V4; `min_level_to_post = 1` (Team Finder), `= 2` for marketplace/notes when enabled.

## 4. Roles and permission matrix
Roles: `anon`, `user` (signed in, not a member), `pending`, `student`, `moderator`, `college_admin`, `platform_admin`.
| Capability | anon | user | pending | student (L≥1) | moderator | college_admin | platform_admin |
|---|---|---|---|---|---|---|---|
| View tenant public info | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| Join request | | ✓ | | | | | |
| View own membership status | | | ✓ | ✓ | ✓ | ✓ | |
| Read tenant content (posts, people) | | | | ✓ | ✓ | ✓ | audited support grant only |
| Create posts/team posts/projects | | | | ✓ (per level) | ✓ | ✓ | |
| Edit/delete own content | | | | ✓ | ✓ | ✓ | |
| Hide others' content | | | | | ✓ | ✓ | |
| Report content | | | | ✓ | ✓ | ✓ | |
| Post announcements/opportunities | | | | | ✓ | ✓ | |
| Decide verification requests | | | | | | ✓ | |
| Change roles / suspend members | | | | | suspend only (policy) | ✓ | |
| Manage settings/flags/invites/roster | | | | | | ✓ | |
| Read audit log | | | | | | ✓ | ✓ |
| Create/suspend tenants | | | | | | | ✓ |
| Read private application tracker | | | | owner only | ✗ | ✗ | ✗ |
**Cannot do:** any role reading another tenant's data; any admin reading a student's application tracker or private notes; platform staff silently browsing content.

## 5. Tenant isolation design
- **Layer 1 – DB (authoritative):** RLS on every tenant table (doc 13 §4); policies use `auth.uid()` + `auth_member_colleges()`.
- **Layer 2 – API:** route handler checks tenant from path against membership; returns 404 for cross-tenant ids (no existence leak).
- **Layer 3 – Storage:** bucket policies check path prefix `college_id`.
- **Layer 4 – Tests:** automated cross-tenant negative suite (doc 20 §6) runs in CI; build fails if a table lacks RLS.
- **Service role usage:** only in `server/admin/*` allowlisted files (lint rule); never in request paths for user data.
- **Support access:** platform staff may request a time-limited grant (≤ 24 h) recorded in `support_grants` + audit; granted by tenant admin in-app (preferred) or via explicit consent recorded.

## 6. College-private vs cross-college
Default `network_visibility = private`: nothing crosses. Future modes use **explicit views** that expose only a whitelisted subset of columns, only for tenants that both opted in (`network_shares`). Cross-college interactions need separate threat modelling (OQ-05, F-28).

## 7. Object-level access control
Every `GET/PATCH/DELETE /{resource}/{id}` handler loads by id **within** the tenant and checks ownership/role. Tests: for each resource, user B cannot read/modify user A's private object; admin cannot read user-private objects (applications).

## 8. Administrative privileges and safeguards
Least privilege; separate `platform_admin` auth path with mandatory 2FA (when available); no shared admin accounts; all admin actions audited; last-admin protection; admin impersonation **not implemented**.

## 9. Account recovery
Email-based OTP is the recovery path. If the user lost access to the email: contact tenant admin → admin may trigger **email change request** requiring re-verification; audit logged; cool-down 24 h. No security questions.

## 10. Account deletion
User requests deletion → confirmation by OTP → profile anonymised, memberships ended, private data (applications, notes, reminders) deleted → content handling per doc 13 §6 → confirmation. Deleted data may remain in backups until expiry (disclosed).

## 11. Abuse prevention
OTP rate limits and lockouts; per-IP and per-account throttles; CAPTCHA/Turnstile on OTP request if abuse observed (decision deferred); invite brute-force limits; new-account posting limits (e.g. 3 posts/day until level 2); report-based auto-hide thresholds (T2); admin tools for bulk suspension.

## 12. Threats: forged college membership and unauthorised access
| Threat | Mitigation | Residual risk |
|---|---|---|
| Attacker picks a college and joins | Methods V1–V5; admin approval; level gating | Weak tenants may choose weak methods → show verification level everywhere |
| Leaked invite code | Hash, limits, expiry, revoke, audit, alert on bursts | Some unverified entrants before revoke |
| Spoofed email domain | Prove control via OTP; domain allow-list; no display-name trust | Compromised student email |
| IDOR (changing ids) | Tenant-scoped loads + RLS + tests | Bug in new code → mandatory negative tests |
| Privilege escalation via role field in request | Role never accepted from client; changed only by admin endpoint | - |
| Admin account takeover | Email OTP + audit + alerts; 2FA when available | Phishing |
| JWT theft | HttpOnly cookies, short lifetime, rotation | XSS → CSP + sanitisation |
| Cross-tenant leakage via joins/views | `SECURITY INVOKER` views, review policy for each view | Developer error → CI check |
| Enumeration of accounts/colleges | Uniform responses; rate limits | Tenant slug is public by design |
