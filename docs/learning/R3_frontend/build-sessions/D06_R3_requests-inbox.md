# Requests and decisions (Day 6) - build session

| Field | Value |
|---|---|
| Date / Author (role) | 2026-11-10 / R3 Frontend and App Screens (project owner takeover) |
| Linked task / ADR / PR | R3-D6-1 / D-27 / Branch: `r3/d6-requests-inbox` |
| Related docs | docs/API_CONTRACT.md (TMF-06 to TMF-10, section 10), docs/DESIGN_SYSTEM.md |

## 1. What we are learning and why it is needed

A team post is only useful when classmates can ask to join a role and the author can answer. Day 6 adds both sides on the real API: ask (with a short message), withdraw, and for the author an inbox with accept and decline.

## 2. The screens

| Where | What it does | Endpoints |
|---|---|---|
| Post page, each role | **Ask to join** (dialog with a message up to 500 characters). After sending: "You asked to join. Waiting for the author." with **Withdraw request**. After an acceptance: "You are on the team." and the team chat link appears, with **Leave the team** | TMF-06, TMF-09 |
| Post page, author only | **Requests** list: name, headline, skills, message. **Accept**, or **Decline** with an optional note. When the last place is filled the post shows "The team is full" | TMF-07, TMF-08 |
| `/collaborate/requests` | "Waiting for your answer" (my open posts with requests) and "Requests I sent" with their state, the author's note, and Withdraw | TMF-02, TMF-03, TMF-10 |
| Notifications | A team notification opens the post it is about (`payload.post_id`) | NTF-01 |

## 3. How it works

- **One live request per post.** A person with a waiting or accepted request cannot ask for a second role in the same post (the Ask button is hidden), and the server also answers `ALREADY_REQUESTED`.
- **Idempotency.** Asking and deciding send an `Idempotency-Key`; one attempt keeps one key, so a double tap or a retry cannot ask or decide twice.
- **Plain words for refusals**: `SLOTS_FULL` ("That role was just filled"), `CONFLICT` ("This post is no longer taking requests" or "already decided"), `FORBIDDEN` (your own post), `RATE_LIMITED` (10 waiting requests).
- **No page flash after an answer**: `useLoad` now keeps the data it already has while a `reload` runs (and tells the screen with `refreshing`), so accepting a request updates the page in place instead of showing a skeleton. A failed reload still shows the error, and a retry after an error shows loading.
- **No email addresses anywhere**: the author sees name, headline and skills only. Contact happens through the team chat link after an acceptance.

## 4. Tests

```bash
node node_modules/vitest/vitest.mjs run src/features/collaborate        # error words, notification links
pnpm test:e2e -- e2e/team-requests.ui.spec.ts                           # two students, real backend, desktop and phone
```

Browser tests use two students in two browser windows: ask and accept (the notification opens the post, the team chat link appears only after the acceptance), decline with a note (the applicant reads it in Requests), withdraw. Pages are checked for sideways scrolling.

## 5. What a human verified

Ran the 6 browser tests (desktop and phone) against the real local backend.

## 6. Docs updated

ROUTES_AND_NAVIGATION, R3 progress and daily.
