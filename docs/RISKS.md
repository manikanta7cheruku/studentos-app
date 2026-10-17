> Note: this file came from the first planning package. Old "doc NN" numbers, "T-" task IDs and Figma mentions are out of date. The task list is in ROADMAP.md. Design is built in code (see DESIGN_SYSTEM.md). Project folders are simpler now: src/contracts and src/components/ui.

# 30 - Risks and Risk Register

| Field | Value |
|---|---|
| Doc ID | DOC-30 |
| Version / Date | 0.1.0 / 2026-10-15 |
| Owner | R1 (register), each risk owner |
| Status | Proposed; ratings are judgements, not measurements |
| Scales | Probability L/M/H · Impact L/M/H/Critical. **Review date:** every Day-1 sync, then weekly (first review 2026-10-16). |

| ID | Category | Risk | Prob | Impact | Early warning signal | Mitigation | Contingency | Owner | Review |
|---|---|---|---|---|---|---|---|---|---|
| R-001 | Product | Concept demand is unproven (students may not switch from WhatsApp/LinkedIn) | H | H | Interviews cannot recall recent episodes; low response to concierge test | Behavioural tests before heavy build; narrow wedge | Pivot/narrow per T-RES-06 | R1 | 2026-10-16 |
| R-002 | Adoption | Cold start: empty tenants feel dead | H | H | <20% activation; empty browse screens | Single-player value (profile/tracker); official content seeded; cohort invites; flags hide empty modules | Delay network modules | R1 | 2026-10-16 |
| R-003 | Product | Scope too large for 5 people/1 week | H | H | M-tasks slipping at midday checkpoints | Scope freeze; tiers; flags; scope cuts not quality cuts | Beta delayed | R1 | 2026-10-16 |
| R-004 | Adoption | No college admin will own a tenant | M | H | No named owner by Day 7 | Student-led pilot + staff interviews; light admin tools | Operate via ambassadors; re-pitch | R1 | 2026-10-16 |
| R-005 | Product | Differentiation unclear vs incumbents | M | M | Interviewees say 'WhatsApp is enough' | Pick jobs they do poorly; prove with prototype | Reposition | R1 | 2026-10-16 |
| R-006 | Product | Opportunity supply missing (curated only) | M | M | Few listings posted | Admin tools + templates; seed from official college circulars | Defer Opportunities | R1 | 2026-10-16 |
| R-010 | Financial | No revenue evidence; costs rise with users | M | M | No budget holder by pilot end | Hypotheses in doc 04; cost triggers | Seek grants; narrow | R1 | 2026-10-16 |
| R-011 | Financial | Hosting free tier violates terms or loses data (Vercel Hobby non-commercial; Supabase pause/no backups) | H | H | Plan limits reached; terms notice | D-11; paid plan at S2; backups | Migrate host | R5 | 2026-10-16 |
| R-012 | Financial | Hidden costs (domain, email, SMS, storage) | M | L | Bills/alerts | Doc 12 §7; monthly review | Cap features | R5 | 2026-10-16 |
| R-013 | Financial | Team funding/expense disputes | M | M | Disagreement on spending | Doc 32 checklist | Mediated discussion | R1 | 2026-10-16 |
| R-014 | Business | Sales cycle too long | H | M | No decision after 4 weeks | Student-led start; pilot agreement | Reduce dependence | R1 | 2026-10-16 |
| R-020 | Security | Cross-tenant data leak via RLS/policy bug | M | Critical | Failing isolation test; odd 200s | RLS + CI coverage + negative suite + reviews | Disable tenant/flag; incident RB-06 | R2 | 2026-10-16 |
| R-021 | Security | Malicious uploads (malware, abusive images) | M | H | Odd files; reports | Type/size limits, private buckets, signed URLs; scanning when scaled | Disable uploads | R2 | 2026-10-16 |
| R-022 | Security | OTP abuse / email bombing / enumeration | H | M | OTP spike | Rate limits, uniform responses, Turnstile option | Throttle harder | R2 | 2026-10-16 |
| R-023 | Security | Forged membership / leaked invites | H | M | Burst of joins; reports | Doc 15 controls; revoke; admin review | Raise verification level | R2 | 2026-10-16 |
| R-024 | Security | Secrets committed or leaked | M | H | gitleaks alert | Scans, env validation, rotation | Rotate immediately RB-07 | R5 | 2026-10-16 |
| R-025 | Security | Dependency/supply-chain compromise or AI-invented package | M | H | Audit alerts; unknown package | Dependency policy; lockfile; review | Remove/pin | R2 | 2026-10-16 |
| R-026 | Security | AI-generated insecure code merged unreviewed | H | H | Reviews skipped | AI rules + mandatory second review | Revert; add test | R2 | 2026-10-16 |
| R-027 | Privacy | Non-compliance with DPDP (notice, consent, minors, breach) once obligations apply | M | H | Counsel flags gaps | Doc 19; counsel; minimisation; no under-18 pilot until guidance | Pause real data | R1 | 2026-10-16 |
| R-028 | Privacy | Minors on platform | M | H | Users who state age <18 | Tenants confirm 18+; legal advice | Block until guidance | R1 | 2026-10-16 |
| R-029 | Privacy | Student ID/enrollment data breach | L | H | - | Hashing; ID upload disabled | RB-06 | R2 | 2026-10-16 |
| R-030 | Team | Burnout from 'finish today' rule and long days | H | H | Missed sleep, defects up, mood | Realistic sizing; retro hours check; scope cuts | Reduce scope next week | R1 | 2026-10-16 |
| R-031 | Team | Uneven skills; knowledge silos | H | M | Only one person can explain a module | Pairing; learning base; walkthrough drills | Rotate owners | R4 | 2026-10-16 |
| R-032 | Team | Member inactivity/leaves; ownership unclear | M | H | Missed syncs | Backups per task; doc 32 handover | Reassign | R1 | 2026-10-16 |
| R-033 | Team | Decision deadlock (consensus culture) | M | M | Decisions >20 min unresolved | Doc 26 §12 rule | Majority vote/owner tie-break | R1 | 2026-10-16 |
| R-040 | Technical | Supabase/Vercel outage or limit hit | M | M | Alerts | Observability; status pages; runbooks | Rollback/restore | R5 | 2026-10-16 |
| R-041 | Technical | Data loss/migration failure | L | Critical | Failed migration | Snapshot before migration; drills | RB-05/09 | R5 | 2026-10-16 |
| R-042 | Technical | Performance poor on low-end phones/4G | M | M | LCP >2.5 s | Budgets, Lighthouse, pagination | Optimise | R3 | 2026-10-16 |
| R-043 | Technical | Email deliverability for OTP | M | H | OTP complaints | SPF/DKIM/DMARC; provider choice; test across providers (incl. college mail) | Alternate provider | R2 | 2026-10-16 |
| R-044 | Technical | Integration drift between parallel work | H | M | Contract test failures | Contract-first, fixtures, checkpoints | Freeze+fix | R5 | 2026-10-16 |
| R-050 | Operational | Moderation overload / harassment incidents | M | H | Reports backlog | Moderators, rules, rate limits, block/report | Disable posting module | R1 | 2026-10-16 |
| R-051 | Operational | Single person owns critical access (bus factor) | M | H | Credentials in one account | Two custodians (doc 24) | Rotate/recover | R5 | 2026-10-16 |
| R-052 | Operational | No tested restore | M | Critical | - | T-OPS-06 before beta | Block beta | R5 | 2026-10-16 |
| R-060 | Legal | Copyright claims on notes/resources | M | M | Takedown notices | Declaration, report, takedown SLA; notes module deferred | Disable module | R1 | 2026-10-16 |
| R-061 | Legal | Brand/name conflicts ('StudentOS') | M | M | Trademark/name clash | Treat name as working; search before branding | Rename | R1 | 2026-10-16 |
| R-062 | Legal | Unclear IP/ownership among founders | M | H | - | Doc 32 checklist; counsel | Agreement | R1 | 2026-10-16 |
| R-063 | Legal | Licence violations (fonts, icons, packages, images) | M | M | Audit finds copyleft/unknown | Doc 34; licence scan in CI | Replace asset | R2 | 2026-10-16 |
| R-064 | Legal | Marketplace liability (prohibited items, disputes) | M | H | Reports | No payments; rules; deferred module | Disable module | R1 | 2026-10-16 |

## Notes
Risks R-001..R-006 are referenced in doc 02. New risks get the next free ID. Closed risks stay in the table with status.
