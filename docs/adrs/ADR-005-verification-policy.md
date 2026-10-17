> Note: this file came from the first planning package. Old "doc NN" numbers, "T-" task IDs and Figma mentions are out of date. The task list is in ROADMAP.md. Design is built in code (see DESIGN_SYSTEM.md). Project folders are simpler now: src/contracts and src/components/ui.

# ADR-005: Verification is per-tenant policy with multiple methods and trust levels

| Field | Value |
|---|---|
| ID | ADR-005 |
| Date | 2026-10-15 |
| Status | **Proposed** (team ratifies on Day 1; change to Accepted in `DECISIONS.md`) |
| Owner | R2 Tech Lead |

## Context and problem
Colleges differ (email, roster, nothing); wrong verification harms trust.

## Options considered
Single global method; per-tenant methods.

## Decision
Per-tenant `allowed_methods`, verification levels 0–3, admin approval default.

## Reasons
Fits B2B reality; lets weak tenants be visibly weaker; supports future SSO/ID.

## Trade-offs and consequences
More configuration and testing; policy mistakes by admins.

## Revisit conditions
A verification method proves unreliable in beta (fraud rate unacceptable).
