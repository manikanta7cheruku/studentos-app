> Note: this file came from the first planning package. Old "doc NN" numbers, "T-" task IDs and Figma mentions are out of date. The task list is in ROADMAP.md. Design is built in code (see DESIGN_SYSTEM.md). Project folders are simpler now: src/contracts and src/components/ui.

# RELEASE CHECKLIST

| Field | Value |
|---|---|
| Doc ID | DOC-REL |
| Version / Date | 0.1.0 / 2026-10-15 |
| Owner | R5 (executes), release decision per doc 26 §12 |
| Rule | Each line needs **evidence** (link/screenshot/run id). Unchecked = fail. **🚫 = release blocker; not negotiable by vote or deadline.** |

## S1 - Internal MVP (staging)
| ✓ | Gate | Evidence |
|---|---|---|
| ☐ 🚫 | CI green on `main` (format, lint, types, unit, integration, pgTAP, build) | run link |
| ☐ 🚫 | Tenant-isolation + permission suite 100% pass; RLS coverage check passes | run link |
| ☐ 🚫 | Journeys J1–J9 pass on staging | Playwright report |
| ☐ 🚫 | No open Sev1/Sev2 bugs | bug list |
| ☐ | axe: no critical issues on P0 pages; keyboard check on J1,J5,J6 | report |
| ☐ | All P0 rows in TRACEABILITY.csv = Verified | CSV |
| ☐ | Incomplete features hidden by flags; CHANGELOG "Not available yet" correct | review |
| ☐ | Docs synced with code (13, 14, ADRs) | T-DOC-04 |
| ☐ | Learning files exist for every built feature; walkthrough drill passed for core flows | LEARNING_INDEX |
| ☐ | Health/ready endpoints and error tracking working | screenshots |

## S2 - Limited beta (all of S1 plus)
| ✓ | Gate | Evidence |
|---|---|---|
| ☐ 🚫 | Production environment separate from staging; no shared secrets/data | config review |
| ☐ 🚫 | Hosting/DB plans permit commercial use and include backups (D-11) | plan + terms screenshot |
| ☐ 🚫 | **Backup restore tested** and RTO recorded; rollback rehearsed | OPS_LOG |
| ☐ 🚫 | Security checklist (doc 19 §7): secrets scan, dependency audit, CSP, rate limits, admin 403 tests | reports |
| ☐ 🚫 | Privacy notice + terms exist; consent captured; **minors policy decided**; counsel review done or explicit written acceptance of residual risk | docs + DECISIONS |
| ☐ 🚫 | Licensing gate (doc 34 §15) complete | registers |
| ☐ | Pilot college admin owner named; tenant onboarding runbook rehearsed | RB-10 |
| ☐ | Support rota + moderation process; report SLA | rota |
| ☐ | k6 baseline + Lighthouse recorded; no regressions vs budget | reports |
| ☐ | Failure drills executed (F3, F5, F20, F21) | drill notes |
| ☐ | Beta onboarding kit approved; feedback loop ready | T-MKT-02 |
| ☐ | Cohort size ≤ 50 and disclosed limitations (e.g. 24 h RPO) | kit |

## S3 - Public production (all of S2 plus)
Upgrade triggers monitored (doc 12 §6) · incident runbook tested end-to-end · legal obligations for launch date assessed (DPDP phases, doc 19 §5) · on-call rota · multi-tenant onboarding repeated at least twice with different colleges · accessibility audit beyond automated tools · public status page.

## Sign-off
| Role | Name | Date | Decision (Go / Delay / Narrow) |
|---|---|---|---|
| Release owner (R5) | | | |
| Tech lead (R2) | | | |
| Product (R1) | | | |
| Team consensus (doc 26 §12) | | | |
