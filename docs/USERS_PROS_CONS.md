> Note: this file came from the first planning package. Old "doc NN" numbers, "T-" task IDs and Figma mentions are out of date. The task list is in ROADMAP.md. Design is built in code (see DESIGN_SYSTEM.md). Project folders are simpler now: src/contracts and src/components/ui.

# Who Will Use StudentOS, and Honest Pros and Cons

| Field | Value |
|---|---|
| Doc ID | DOC-FIT |
| Version / Date | 0.1.0 / 2026-10-15 |
| Owner | R1 Product Owner |
| Status | Proposed |
| Evidence level | **All adoption statements are UNVALIDATED hypotheses** until interviews and beta data exist. No market size or demand figures are claimed. |

## 1. Will users use this product? (what we can and cannot say)
We cannot answer this from a desk. We can state **what would have to be true** and **how we will find out**.

| Hypothesis | Must be true | How we test (doc 03) | Failure signal |
|---|---|---|---|
| H1 Students feel recurring pain finding teammates | They describe a *recent* specific instance and a workaround | 10–15 interviews on past behaviour | Fewer than ~4 of 10 recall a concrete instance in last 3 months |
| H2 Students will leave WhatsApp for a structured space for at least one job | They post/respond in a pilot within 7 days | Concierge test (manual Team Finder in a group + form) | Few responses to posts despite reach |
| H3 Placement-season students want one tracker | They already keep sheets/notes/apps | Observe their current tracking method | They are content with Sheets/Notion |
| H4 Colleges want an official channel | A staff member agrees to pilot and name an owner | 3 admin conversations | No one will own the admin role |
| H5 Colleges or students would pay | A named budget holder exists | Pricing conversations after the pilot | Only "sounds nice" |

*(Thresholds are proposals for the team to ratify.)*

## 2. Who is likely to use it (segments, hypotheses)
| Segment | Likely value | Likely behaviour | Confidence |
|---|---|---|---|
| Engineering/CS students in hackathon/project culture | Team Finder, portfolio | Episodic bursts around events | Medium-low |
| Placement-year students | Tracker, opportunities, reminders | Intense daily use for a few months | Medium-low |
| First-years | Announcements, seniors' items, orientation | High at start, then drops | Low |
| Club/ambassador leads | Announce, recruit | Weekly | Medium-low |
| College admins | Control, official channel, visibility | Weekly/monthly | Unknown |

## 3. Pros
**For students:** one identity and portfolio that outlives any group chat; searchable (not buried in chat); verified college-only space (safer than public marketplaces); progress-oriented career tools; free.
**For colleges:** control over membership and content; official, auditable channel; less WhatsApp chaos; aggregate engagement data; configurable modules; no vendor-specific hardware.
**For the founders:** one multi-tenant codebase, low marginal cost per tenant, natural B2B sales motion once a pilot works, strong learning path.

## 4. Cons and honest risks
| Con / risk | Why it matters | Mitigation (doc) |
|---|---|---|
| **Cold start** | A tenant with 20 users makes marketplace/feed feel dead | Launch features that work alone (profile, tracker); seed official content; one network feature at a time (doc 05) |
| **Incumbents are free and habitual** | WhatsApp, LinkedIn, Internshala, Unstop, OLX | Pick jobs they do badly (structure, trust, history); do not compete on volume |
| **Broad scope** | ~25 features across 4 pillars; thin everything = nothing great | Tiered scope, feature flags |
| **Verification is imperfect** | Fake accounts hurt trust | Multiple methods, per-tenant policy, admin control, limits documented (doc 15) |
| **B2B sales is slow** | Colleges decide slowly; student-led adoption may not convert | Student-led pilot first, then ask college to sponsor |
| **Marketplace trust/safety** | Money and strangers | No payments in v1; reporting; safety tips; moderation |
| **Privacy and law** | Student data; some users may be under 18; India's DPDP Rules phase in (doc 19) | Data minimisation; legal advice before launch |
| **Free hosting limits** | Pausing, no backups, commercial-use restrictions (doc 12) | Plan paid tier for production data |
| **Team capacity** | 5 students, learning while building | Learning base, strict scope, tests, backups owners |
| **Moderation burden** | Even small communities need rules | Tenant moderators, reports, audit |

## 5. Alternatives students use today (to be verified in doc 03 research)
WhatsApp/Telegram groups, Instagram, Google Drive, LinkedIn, Internshala, Unstop, Naukri, OLX, college ERP/portals, GitHub/Behance, personal Sheets/Notion. *(Names from general knowledge; features and current status not yet verified.)*

## 6. Verdict (as of today)
The concept is plausible but **unproven**. The first seven days should reduce the biggest unknowns: do students recurringly feel the pain, will they act on a new tool, and will any college admin own a tenant. The decision to continue, narrow, or pivot should be based on those results, recorded in `DECISIONS.md`.
