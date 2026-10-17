> Note: this file came from the first planning package. Old "doc NN" numbers, "T-" task IDs and Figma mentions are out of date. The task list is in ROADMAP.md. Design is built in code (see DESIGN_SYSTEM.md). Project folders are simpler now: src/contracts and src/components/ui.

# 23 - Backup, Recovery and Release Runbook

| Field | Value |
|---|---|
| Doc ID | DOC-23 |
| Version / Date | 0.1.0 / 2026-10-15 |
| Owner | R5 (release decision owner per governance rule) |
| Status | Proposed. **No backup has been configured or restored yet.** |

## 1. Backup policy
| Item | Staging (fake) | Pilot/Production (real) |
|---|---|---|
| Provider backups | none required | **Paid plan with daily backups** (Supabase Pro reports daily, 7-day retention - verify) |
| Own logical dumps | optional | `pg_dump` nightly via scheduled job to a **separate** storage (different provider/account); keep 14 daily + 8 weekly |
| Storage buckets | n/a | Weekly sync of buckets to separate storage; keep 4 |
| Encryption | n/a | Dumps encrypted (age/gpg); key held by R2 + R5 (two custodians) |
| Verification | monthly | **Restore test before beta, then monthly**; record in `OPS_LOG.md` |
Never rely on a free database as a backup substitute.

## 2. Recovery objectives (stage-appropriate proposals)
Pilot: **RPO ≤ 24 h**, **RTO ≤ 4 h**. Public: tighten after measuring (consider PITR if available/affordable). The team accepts up to 24 h data loss in beta *only if disclosed to the pilot college*.

## 3. Restore procedure (RB-09)
1. Declare incident; freeze writes (maintenance flag/read-only).
2. Identify restore point (before corruption/incident).
3. Restore to a **new** project/database (never overwrite blindly).
4. Run integrity checks (row counts, latest ids, RLS tests via `pnpm db:test`).
5. Point app to restored DB (env switch) or copy data back; re-enable writes.
6. Communicate to tenants; post-mortem.
Restore drill steps are identical but target a scratch project; time it and record RTO actually achieved.

## 4. Deployment checklist (production)
- [ ] `main` green; staging smoke passed; no open Sev1/2.
- [ ] Release checklist (root `RELEASE_CHECKLIST.md`) complete and signed.
- [ ] Backup/snapshot taken **now** (timestamp noted).
- [ ] Migration plan reviewed (below).
- [ ] Feature flags for incomplete features verified OFF.
- [ ] Release owner + backup + on-duty person present for 60 minutes after deploy.
- [ ] Announce to pilot admin (if user-visible change).

## 5. Migration checklist
- [ ] Applied on staging with production-like volume.
- [ ] Locks reviewed (no long exclusive locks on hot tables).
- [ ] Backward compatible with currently deployed code.
- [ ] Rollback/compensation script ready; destructive step separated into later release.
- [ ] pgTAP passes after migration; RLS coverage test passes.

## 6. Rollback procedure (RB-04)
1. Disable new feature flags.
2. Roll back hosting deploy to last good build.
3. If migration involved: confirm schema is compatible; if not, apply compensating migration (not manual SQL).
4. If data corrupted: RB-09.
5. Record in incident log.

## 7. Post-release smoke tests (production, synthetic accounts)
`/api/ready` OK · sign-in OTP delivered · pilot tenant landing loads with branding · member loads feed · create + delete a test team post (synthetic tenant) · admin queue loads · error tracking receives a test event · logs show request ids.

## 8. Incident escalation
Anyone → R5 (duty) → R2 → all-hands for Sev1. Pilot college admin contact kept in `OPS_CONTACTS.md` (access-restricted). Legal/counsel contacted for Sev1 involving personal data (doc 19 §6).

## 9. Release decision owner
The **release owner** (default R5, backup R2) executes; the **team decision** to release follows the consensus rule in `27_MEETINGS...`; **gate failures are not negotiable by vote** (security, isolation, data integrity, core journey, tested restore for S2+).

## 10. Known limitations record
Every release lists limitations in `CHANGELOG.md` and tenant admin notes (e.g. "Marketplace disabled", "Backups: daily, 24 h RPO").

## 11. Runbook stubs
Each RB-xx in doc 22 §9 has a one-page file under `../templates/RUNBOOK_TEMPLATE.md`; R5 fills RB-01..RB-10 during T-OPS-07 (Day 7) and rehearses RB-04/RB-09 on Day 6.

## 12. Tenant onboarding runbook (RB-10)
1. Platform admin creates tenant (ADM-01) with slug/name; sets status `draft`.
2. Add domain(s), choose methods, branding; invite first college admin.
3. Admin signs in; completes checklist (settings, one announcement, invite codes).
4. Smoke test as a test student; then set `active`.
5. Share landing link/QR; monitor queue first 48 h; check support channel.
