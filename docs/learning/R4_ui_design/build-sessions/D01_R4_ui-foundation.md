# UI foundation - build session

| Field | Value |
|---|---|
| Date / Author (role) | 2026-10-29 / R4 UI design |
| Linked task / ADR / PR | R4-D1-1 / none / PR not opened yet |
| Related docs | docs/DESIGN_SYSTEM.md, docs/learning/AI_RULES.md |

## 1. What we are learning and why it is needed

We built the building blocks of the StudentOS screens: buttons, text fields, cards, labels, a pop-up (dialog), a message (toast), loading placeholders, an empty-state box and a banner. We also built one page, /dev/components, that shows every block in every state. Every future screen is made from these blocks, so they must be right first.

## 2. What problem it solves

If each person made their own buttons and colours, the app would look messy. Mistakes such as tiny buttons or pale text would be repeated on every screen. With one shared set, we fix a problem once and every screen gets the fix.

## 3. Concepts and terminology (short glossary)

- Design token: a colour or size saved once under a name, so every screen uses the same value. File: src/app/globals.css.
- Tailwind CSS: we style things by adding short class names such as h-11 (height) or text-base (text size).
- shadcn/ui: ready-made blocks. We copy their code into src/components/ui and edit it to match our design.
- Name trap: in our code, bg-primary is the brand blue. bg-accent is the pale hover colour. Do not mix them up.
- Sandbox page: /dev/components. It is only for looking at the blocks.
- Vitest: runs our tests. jsdom: a pretend browser used inside tests.
- axe-core and Lighthouse: tools that check accessibility (can everyone use the page?).

## 4. How it works internally (appropriate depth)

- The colours live in globals.css. The blocks only use those names, never their own colours.
- Each block has variants (for example a button can be default, outline or destructive).
- One test (design-rules) reads the block files and fails if it finds something our design forbids: text under 16px, dark mode classes, blur, gradients, plain black or white, very round corners, or hex colours.
- Other tests draw a block in the pretend browser and check its text, role and state.
- One test (axe) opens the sandbox page in the pretend browser and fails on serious accessibility problems. It cannot check colour contrast, so we check contrast in Chrome Lighthouse.

## 5. How it is used in StudentOS (files/modules)

- src/app/globals.css: colours and the focus ring
- src/app/layout.tsx: loads the two fonts from our own files (public/fonts)
- src/components/ui/: all the blocks
- src/app/dev/components/page.tsx: the sandbox page
- src/lib/utils.ts and components.json: made by shadcn
- tests/ui/ and tests/a11y/: the tests
- vitest.config.ts: changed so tests can be .tsx files

## 6. Request/response and data flow (diagram or numbered trace)

Not applicable: nothing is sent to a server. For one block, it goes like this:

1. A screen imports a block from src/components/ui.
2. The block uses a class such as bg-primary.
3. That class reads the colour from globals.css.
4. The browser shows the block in our colours and fonts.

## 7. API methods, endpoints, schemas, status codes

Not applicable: we added no API.

## 8. Database changes and relationships

Not applicable: we changed no database.

## 9. Authentication / authorization behaviour

Not applicable for the blocks. One open question: /dev/components appears as a normal page in the production build, so people could open it on a live site. We have not decided whether to hide it. To ask R3 and R5.

## 10. Errors and edge cases

- The pretend browser has no styling, so tests check class names, not real sizes or colours.
- On the sandbox page, hover and focus are forced with classes so you can see them without a mouse.
- The toast test needs a small fake (matchMedia) because the pretend browser lacks it.
- Lighthouse reloads the page, so the dialog was closed when it ran.
- Toasts are always light colour because we have no dark mode.

## 11. Tests: what exists and how to run them (exact commands)

Run every check: pnpm verify. Run only the tests: pnpm test.

On 2026-10-29 we saw in the terminal: 6 test files, 32 tests, all passed, and pnpm verify passed all five steps.

- tests/ui/design-rules.test.ts: 9 tests
- tests/ui/components.test.tsx: 12 tests
- tests/ui/dialog.test.tsx: 4 tests
- tests/ui/toast.test.tsx: 2 tests
- tests/a11y/sandbox.test.tsx: 1 test
- tests/repo-hygiene.test.ts: 4 tests (written by R5)

We also checked that two tests can really fail. We added a text-sm class and the design-rules test failed. We added an image with no alt text and the axe test failed. We removed both afterwards.

## 12. How to debug common failures

- Port 3000 is busy: an old dev server is running. Run kill followed by the number it shows, then pnpm dev again.
- design-rules test fails: the message names the file. Fix the class in that file.
- axe test fails: the message names the rule, for example image-alt.
- Terminal shows a colon: press q.

## 13. Security considerations

- No secrets and no real student data. The sandbox uses made-up text. One sample email in it is ajay@gmail.com. Better to change it to name@college.edu.
- New packages in the app: radix-ui, class-variance-authority, lucide-react, sonner, tw-animate-css, shadcn, cn. New packages for tests only: jsdom, @testing-library/react, @testing-library/dom, axe-core. We added next-themes and then removed it.
- We have not yet checked the cn package against its official page (AI_RULES rule 4).
- The fonts (Fraunces and Public Sans) are in our own files, with their OFL licence files.

## 14. Alternatives and trade-offs

- Writing every block by hand: slower, and keyboard support would be our job.
- shadcn blocks come with small text, round corners and blur. Each new block needs cleaning. The design-rules test catches the common problems.
- We check colour contrast in Chrome, because the pretend browser cannot.

## 15. What AI generated or suggested (prompts used, summary)

AI (Claude) wrote the code, the tests and the commands. That includes the earlier work (colours, fonts, shadcn setup, blocks, sandbox page) and today's fixes to the dialog, badge and toast, the removal of next-themes, the test setup and every test file. What I gave the AI: the Day 1 prompt from the student kit, a handoff note, and a step-by-step chat. In that chat I ran every command and pasted back the real output.

## 16. What a human verified (how: ran tests, read code, checked docs, tried to break it)

Done by me, with terminal output or screenshots as proof:

- Ran every command and pasted the real output, including pnpm test and pnpm verify. All passed.
- Looked at the sandbox page and the open dialog in Chrome.
- Ran Lighthouse (Accessibility only, Chrome, mobile) on http://localhost:3000/dev/components. Score: 100. The Performance score (46) comes from the slow dev server and was ignored.
- Made the two tests fail on purpose, then removed the mistakes.
- Pushed the branch and checked that main had no new commits.

Not done yet:

- Reading every block file line by line (AI_RULES rule 3).
- Trying the Tab key by hand on the sandbox page.
- Checking screen widths 768px and 1280px.
- Checking the open dialog with Lighthouse.
- Checking the cn package against its official page.

## 17. What each teammate can now explain/implement independently

Planned, not yet confirmed by a teammate: use a block from src/components/ui, add a new block with shadcn (say no if it asks to overwrite button.tsx), clean it to our rules, show it on the sandbox page, and run pnpm verify.

## 18. Further learning resources

The official docs for Tailwind CSS, shadcn/ui, Radix UI, Vitest, Testing Library, axe-core and Lighthouse. Also docs/DESIGN_SYSTEM.md in this repo.

## 19. Docs updated because of this (per trigger table)

To do in this PR: docs/progress/R4_ui_design/PROGRESS.md and docs/progress/R4_ui_design/daily/D01_R4.md. After the merge: one row in docs/learning/R4_ui_design/INDEX.md. We have not yet checked whether other docs need changes.

## 20. Walkthrough drill: passed by / date

Not done yet. A teammate must pass it.
