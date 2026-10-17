> Note: this file came from the first planning package. Old "doc NN" numbers, "T-" task IDs and Figma mentions are out of date. The task list is in ROADMAP.md. Design is built in code (see DESIGN_SYSTEM.md). Project folders are simpler now: src/contracts and src/components/ui.

# ADR-003: Multi-tenancy by shared schema with college_id and RLS; path-based tenant routing

| Field | Value |
|---|---|
| ID | ADR-003 |
| Date | 2026-10-15 |
| Status | **Proposed** (team ratifies on Day 1; change to Accepted in `DECISIONS.md`) |
| Owner | R2 Tech Lead |

## Context and problem
Product is B2B: each college an isolated tenant, empty at start, onboarding must be configuration only.

## Options considered
DB per tenant; schema per tenant; shared schema + tenant column + RLS.

## Decision
Shared schema, `college_id` on all tenant rows, RLS enforced; `/c/{slug}` path routing in v1; custom subdomains later.

## Reasons
Cheapest to operate; one migration path; RLS gives DB-level guarantee; path routing needs no DNS work.

## Trade-offs and consequences
Noisy-neighbour risk; RLS mistakes are critical (mitigated by CI checks); harder per-tenant data residency.

## Revisit conditions
Enterprise tenant requires dedicated DB/residency; per-tenant performance isolation needed.
