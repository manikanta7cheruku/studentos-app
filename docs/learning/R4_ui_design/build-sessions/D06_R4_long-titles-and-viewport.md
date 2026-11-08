# Long titles and viewport test - build session

| Field | Value |
|---|---|
| Date / Author (role) | 2026-11-05 / R4 (UI and design) |
| Linked task / ADR / PR | R4-D6-1 / ADR-009 (UI primitives) / #27 |
| Related docs | docs/DESIGN_SYSTEM.md, docs/ACCESSIBILITY.md |

## 1. What we are learning and why it is needed
Team Finder and admin screens must look right at 360px, 768px and 1280px, even when a name or title is very long. A long word with no spaces can push the whole page wider than the screen, so the user has to scroll sideways.

## 2. What problem it solves
In a flex row, a child box does not shrink below the width of its content unless we allow it. A 60-character title made the page 1712px wide on a 768px screen. Students on phones would see cut-off text and a sideways scroll.

## 3. Concepts and terminology (short glossary)
- **min-w-0**: lets a flex or grid child shrink below its content width.
- **break-words**: lets a long word break onto the next line.
- **scrollWidth / clientWidth**: scrollWidth is how wide the page really is, clientWidth is how wide the screen is. If scrollWidth is bigger, the page scrolls sideways.
- **Viewport**: the visible screen area. We test 360px (phone), 768px (tablet), 1280px (laptop).
- **Rebase**: replay my commits on top of the latest main, so the pull request only shows my work.

## 4. How it works internally (appropriate depth)
The placeholder screen header is `flex flex-col sm:flex-row`. Below 640px it is a column, so the title gets the full width and wraps. From 640px up it is a row, and the title box grew to fit the long word. Adding `min-w-0` to the title box and `break-words` to the h1 fixed it.

## 5. How it is used in StudentOS (files/modules)
- `src/features/tenancy/components/placeholder-screen.tsx` (used by collaborate, campus, career, me)
- Admin screens in `src/features/admin/components/`, `src/features/reports/moderator-reports-queue.tsx`
- Shared parts: `badge.tsx`, `empty-state.tsx`, `error-summary.tsx`, `responsive-list.tsx`, `card.tsx`
- Test: `e2e/viewport-long-names.ui.spec.ts`

## 6. Request/response and data flow (diagram or numbered trace)
No server request. The test flow:
1. Open a page at a given width.
2. Replace every h1 and h2 with 60 letters "A".
3. Read scrollWidth and clientWidth.
4. Fail if scrollWidth is bigger than clientWidth.

## 7. API methods, endpoints, schemas, status codes
None. No API change.

## 8. Database changes and relationships
None.

## 9. Authentication / authorization behaviour
None changed. This is class-name and layout work only.

## 10. Errors and edge cases
- At 360px the page passed even before the fix, because the header is a column there. The bug only showed at 768px and 1280px.
- The test only changes h1 and h2 text. It does not test long names inside cards, badges or table cells.
- Team Finder is not mounted on /c/[slug]/collaborate yet. That route shows the placeholder screen.

## 11. Tests: what exists and how to run them (exact commands)
- `pnpm exec playwright test e2e/viewport-long-names.ui.spec.ts --project=chromium` (needs the dev server on port 3000 or lets Playwright start one)
- `pnpm verify`
- The test file name must end in `.ui.spec.ts` or the Playwright config will not run it.

## 12. How to debug common failures
- If the test says "page is 1712px wide on a 768px screen", find the heading and its flex parent and add `min-w-0 break-words`.
- In the browser console: `document.documentElement.scrollWidth > document.documentElement.clientWidth` prints true when the page scrolls sideways.

## 13. Security considerations
None. No data, secrets or permissions changed.

## 14. Alternatives and trade-offs
- `truncate` (cut with ...) hides text, so a screen reader user or a sighted user may lose part of a name. We used wrapping for headings.
- `overflow-x-hidden` on the body hides the symptom but cuts text off. We did not use it.

## 15. What AI generated or suggested (prompts used, summary)
An AI agent wrote the first fixes and measured pages in a browser. An AI helper guided me through the checks, the new test, the rebase and the pull request.

## 16. What a human verified (how: ran tests, read code, checked docs, tried to break it)
- I ran format, lint, typecheck, tests and build myself: 29 test files, 307 tests passed.
- I ran the Playwright test: 27 passed.
- I put the old placeholder file back for one run: 2 tests failed, so the test can catch the bug. Then I restored the fix.
- I reproduced the bug by hand in Safari and Chrome with a 60-letter title.
- I rebased onto main and re-ran everything.
- Not checked by me: long names inside cards, badges and table cells; the four states by eye; emoji, colours and fake numbers on screen.

## 17. What each teammate can now explain/implement independently
- Why a long word can make a page scroll sideways in a flex row.
- How to fix it with min-w-0 and break-words.
- How to run the viewport test and read its failure message.

## 18. Further learning resources
- Tailwind docs: min-width and overflow-wrap utilities
- MDN: flexbox and min-width: auto

## 19. Docs updated because of this (per trigger table)
Progress file, daily file, carryover and learning index. No API or database docs changed.

## 20. Walkthrough drill: passed by / date
not yet
