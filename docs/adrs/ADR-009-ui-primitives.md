> Note: this file came from the first planning package. Old "doc NN" numbers, "T-" task IDs and Figma mentions are out of date. The task list is in ROADMAP.md. Design is built in code (see DESIGN_SYSTEM.md). Project folders are simpler now: src/contracts and src/components/ui.

# ADR-009: UI implementation: Tailwind + headless accessible primitives (Radix/shadcn pattern) in src/components/ui

| Field | Value |
|---|---|
| ID | ADR-009 |
| Date | 2026-10-15 |
| Status | **Proposed** (team ratifies on Day 1; change to Accepted in `DECISIONS.md`) |
| Owner | R2 Tech Lead |

## Context and problem
Need accessible components quickly without a generic template look.

## Options considered
Build from scratch; MUI/Chakra; shadcn/Radix.

## Decision
Radix primitives styled with our tokens.

## Reasons
Accessible behaviours solved; styling fully ours.

## Trade-offs and consequences
Dependency management; verify package versions; copy-in components to maintain.

## Revisit conditions
Library maintenance risk; bundle size issues.
