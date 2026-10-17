> Note: this file came from the first planning package. Old "doc NN" numbers, "T-" task IDs and Figma mentions are out of date. The task list is in ROADMAP.md. Design is built in code (see DESIGN_SYSTEM.md). Project folders are simpler now: src/contracts and src/components/ui.

# ADR-002: PostgreSQL via Supabase as primary datastore

| Field | Value |
|---|---|
| ID | ADR-002 |
| Date | 2026-10-15 |
| Status | **Proposed** (team ratifies on Day 1; change to Accepted in `DECISIONS.md`) |
| Owner | R2 Tech Lead |

## Context and problem
Need relational data, constraints, row-level security, auth, storage with small team.

## Options considered
Supabase; Firebase/Firestore; Neon+Auth.js; self-managed Postgres.

## Decision
Supabase (Postgres + Auth + Storage), local dev via Supabase CLI.

## Reasons
Source blueprint choice; RLS enables DB-level tenant isolation; portable standard Postgres.

## Trade-offs and consequences
Free plan pauses after inactivity and has no backups (sources 2026-10-15); vendor-specific auth/storage APIs.

## Revisit conditions
Costs exceed budget; required region/compliance unavailable; reliability incidents; need for features Supabase lacks.
