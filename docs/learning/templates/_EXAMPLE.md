# Invite-code redemption must be atomic - EXAMPLE (fake, shows depth expected)

| Field | Value |
|---|---|
| Date / Author | 2026-00-00 / R2 (example) |
| Linked | T-BE-04, TEN-03, AC-VER-003 |

## 1–2. Why / problem
Two students can submit the last use of a code at the same moment. A read-then-write check lets both through.
## 4. How it works
One SQL statement: `UPDATE invite_codes SET used_count = used_count + 1 WHERE id=$1 AND used_count < max_uses AND revoked_at IS NULL AND expires_at > now() RETURNING *;` Postgres locks the row for the update; the second concurrent statement re-evaluates the WHERE after the first commits and returns zero rows → `INVITE_EXHAUSTED`.
## 5. Where
`modules/verification/redeem-invite.ts`, `supabase/migrations/…_invites.sql`.
## 6. Trace
UI form → `POST /c/{slug}/join/invite` → Zod validate → service → SQL → membership upsert → audit → 200.
## 11. Tests
`pnpm test tests/verification/invite.concurrent.test.ts` (fires 10 parallel redemptions of a max_uses=3 code; expects exactly 3 successes).
## 15–16. AI vs human
AI suggested select-then-update; reviewer spotted the race, rewrote as one statement, wrote the concurrency test and watched it fail on the first version.
## 17. Others can now
Explain TOCTOU races; write atomic updates; run the concurrency test.
