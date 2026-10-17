> Note: this file came from the first planning package. Old "doc NN" numbers, "T-" task IDs and Figma mentions are out of date. The task list is in ROADMAP.md. Design is built in code (see DESIGN_SYSTEM.md). Project folders are simpler now: src/contracts and src/components/ui.

# ADR-012: Monetary transactions and payments excluded from v1

| Field | Value |
|---|---|
| ID | ADR-012 |
| Date | 2026-10-15 |
| Status | **Proposed** (team ratifies on Day 1; change to Accepted in `DECISIONS.md`) |
| Owner | R2 Tech Lead |

## Context and problem
Payments bring compliance, fraud, dispute, and support burdens.

## Options considered
Integrate payments; display price only.

## Decision
No payment processing; price is informational.

## Reasons
Reduces legal/operational risk.

## Trade-offs and consequences
No commission revenue early.

## Revisit conditions
Marketplace shows sustained successful handovers and demand for protected payments.
