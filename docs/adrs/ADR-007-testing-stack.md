> Note: this file came from the first planning package. Old "doc NN" numbers, "T-" task IDs and Figma mentions are out of date. The task list is in ROADMAP.md. Design is built in code (see DESIGN_SYSTEM.md). Project folders are simpler now: src/contracts and src/components/ui.

# ADR-007: Testing stack: Vitest, Playwright (+axe), pgTAP, k6; test pyramid with mandatory tenant-isolation suite

| Field | Value |
|---|---|
| ID | ADR-007 |
| Date | 2026-10-15 |
| Status | **Proposed** (team ratifies on Day 1; change to Accepted in `DECISIONS.md`) |
| Owner | R2 Tech Lead |

## Context and problem
Need verifiable correctness with AI-assisted code.

## Options considered
Jest; Cypress; only manual QA.

## Decision
Vitest unit/integration; pgTAP for RLS/SQL; Playwright e2e + a11y; k6 smoke load.

## Reasons
Fast, TypeScript-native, database-level tests catch RLS bugs early.

## Trade-offs and consequences
Learning curve; e2e flakiness needs discipline.

## Revisit conditions
E2E runtime > 15 min; flakiness > 2%.
