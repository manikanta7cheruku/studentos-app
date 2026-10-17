> Note: this file came from the first planning package. Old "doc NN" numbers, "T-" task IDs and Figma mentions are out of date. The task list is in ROADMAP.md. Design is built in code (see DESIGN_SYSTEM.md). Project folders are simpler now: src/contracts and src/components/ui.

# ADR-001: Modular monolith architecture

| Field | Value |
|---|---|
| ID | ADR-001 |
| Date | 2026-10-15 |
| Status | **Proposed** (team ratifies on Day 1; change to Accepted in `DECISIONS.md`) |
| Owner | R2 Tech Lead |

## Context and problem
Five-person team, one week, need maintainability.

## Options considered
Microservices; serverless function-per-feature; modular monolith.

## Decision
Modular monolith (Next.js app + Supabase) with enforced module boundaries.

## Reasons
Lowest operational overhead; easiest to test and learn; boundaries keep future extraction possible.

## Trade-offs and consequences
Single deploy unit; scaling is coarse; discipline needed to keep modules decoupled.

## Revisit conditions
Sustained load needs independent scaling of a module; team grows beyond ~12; a module needs a different runtime.
