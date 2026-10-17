> Note: this file came from the first planning package. Old "doc NN" numbers, "T-" task IDs and Figma mentions are out of date. The task list is in ROADMAP.md. Design is built in code (see DESIGN_SYSTEM.md). Project folders are simpler now: src/contracts and src/components/ui.

# ADR-006: Search via Postgres full-text and trigram; no external search service

| Field | Value |
|---|---|
| ID | ADR-006 |
| Date | 2026-10-15 |
| Status | **Proposed** (team ratifies on Day 1; change to Accepted in `DECISIONS.md`) |
| Owner | R2 Tech Lead |

## Context and problem
Need basic filtering and keyword search within tenants.

## Options considered
Postgres FTS; Algolia; Meilisearch; Typesense.

## Decision
Postgres FTS + pg_trgm.

## Reasons
Zero extra cost/infrastructure; tenant filter is native.

## Trade-offs and consequences
Limited relevance tuning; scaling limits.

## Revisit conditions
Search latency > 500 ms P95 at current data; need typo-tolerance or faceting beyond SQL.
