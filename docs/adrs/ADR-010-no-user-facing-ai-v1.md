> Note: this file came from the first planning package. Old "doc NN" numbers, "T-" task IDs and Figma mentions are out of date. The task list is in ROADMAP.md. Design is built in code (see DESIGN_SYSTEM.md). Project folders are simpler now: src/contracts and src/components/ui.

# ADR-010: No user-facing AI features in v1; AI used only as development assistant under policy

| Field | Value |
|---|---|
| ID | ADR-010 |
| Date | 2026-10-15 |
| Status | **Proposed** (team ratifies on Day 1; change to Accepted in `DECISIONS.md`) |
| Owner | R2 Tech Lead |

## Context and problem
Cost, accuracy, privacy, and moderation risk; unproven demand.

## Options considered
Ship AI resume/interview feedback; defer.

## Decision
Defer. Revisit when: demand validated, cost per user bounded, privacy review done, evaluation method defined.

## Reasons
Keeps scope and cost controlled; avoids sending student data to third parties.

## Trade-offs and consequences
Misses a trend-driven differentiator.

## Revisit conditions
Interviews show strong demand for AI feedback and a safe, bounded-cost design exists.
