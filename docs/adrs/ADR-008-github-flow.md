> Note: this file came from the first planning package. Old "doc NN" numbers, "T-" task IDs and Figma mentions are out of date. The task list is in ROADMAP.md. Design is built in code (see DESIGN_SYSTEM.md). Project folders are simpler now: src/contracts and src/components/ui.

# ADR-008: GitHub Flow / trunk-based development with short-lived branches and PR review (deviation from source's Git Flow)

| Field | Value |
|---|---|
| ID | ADR-008 |
| Date | 2026-10-15 |
| Status | **Proposed** (team ratifies on Day 1; change to Accepted in `DECISIONS.md`) |
| Owner | R2 Tech Lead |

## Context and problem
Five people integrating daily in one week; long-lived develop/release branches add merge pain.

## Options considered
Git Flow; GitHub Flow; trunk-based with flags.

## Decision
`main` always deployable; branches `feat/<task-id>-name` ≤ 1 day; PR + 1 review + green CI; feature flags for incomplete work; tags for releases.

## Reasons
Less ceremony, continuous integration, matches flags strategy.

## Trade-offs and consequences
Needs strong CI and flags discipline; deviates from source (team decision D-12).

## Revisit conditions
Team grows or needs multiple supported release lines.
