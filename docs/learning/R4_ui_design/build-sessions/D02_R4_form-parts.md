# Form and state parts - build session

| Field | Value |
|---|---|
| Date / Author (role) | 2026-10-30 / R4 (UI and design) |
| Linked task / ADR / PR | R4-D2-1 / ADR-009 (UI primitives) / #7 |
| Related docs | docs/DESIGN_SYSTEM.md, docs/ACCESSIBILITY.md |

## 1. What we are learning and why it is needed
Sign in and join need forms. Every form needs the same parts: a labelled field with help and error text, a summary of errors, a select, a checkbox, tabs, phone navigation, and a way to show table data on a phone. We build them once so R3 and later screens use the same parts and behave the same way.

## 2. What problem it solves
Without shared parts, each screen builds its own form. Labels and errors then get disconnected from the input, so screen reader users do not hear the error and keyboard users cannot reach it. Tables also break on phones because they scroll sideways.

## 3. Concepts and terminology (short glossary)
- **aria-describedby**: tells assistive technology which help or error text belongs to an input.
- **aria-invalid**: marks an input as having a problem.
- **Error summary**: a box at the top of a form that lists every problem, each one linking to its field.
- **Focus ring**: the visible outline showing which element the keyboard is on.
- **Responsive**: the layout changes with screen width (here the breakpoint is 768px, the `md` size).
- **axe**: an automatic accessibility checker we run inside tests.

## 4. How it works internally (appropriate depth)
- **FormField** creates an id (or uses the one passed in) and gives the child input that id. The label points to it with `htmlFor`. Help and error paragraphs get ids, and the input gets `aria-describedby` listing them and `aria-invalid` when there is an error.
- **ErrorSummary** has `role="alert"` and takes focus when errors appear, so a screen reader reads it. Each message is a link to `#fieldId`. On click it finds the field by id and focuses it.
- **Select** is a styled native `<select>`. We keep the browser control so phone pickers, the keyboard and screen readers work without extra code.
- **Checkbox and Tabs** are built on Radix primitives, which handle keyboard behaviour and states. CheckboxField adds a clickable label and an error line in a row at least 44px high.
- **BottomNav** is a `nav` fixed to the bottom, hidden from 768px up. The item matching `currentPath` gets `aria-current="page"`.
- **ResponsiveList** renders both a real table (shown from 768px) and a list of cards (shown below 768px). CSS shows one and hides the other.

## 5. How it is used in StudentOS (files/modules)
- `src/components/ui/form-field.tsx`, `error-summary.tsx`, `select.tsx`, `checkbox.tsx`, `tabs.tsx`, `bottom-nav.tsx`, `responsive-list.tsx`
- Demo page: `src/app/dev/components/form-parts.tsx`, added to `src/app/dev/components/page.tsx`
- Tests: `tests/ui/form-field.test.tsx`, `tests/ui/form-parts.test.tsx`
- R3 will use FormField, ErrorSummary, Select and CheckboxField in the sign in form.

## 6. Request/response and data flow (diagram or numbered trace)
No server request. Flow for a failed submit:
1. The form finds problems and passes them to ErrorSummary.
2. ErrorSummary appears and takes focus.
3. The user activates a message link.
4. The link handler finds the field by id and focuses it.
5. The field shows its own error text, linked by `aria-describedby`.

## 7. API methods, endpoints, schemas, status codes
Not applicable. These are UI parts only.

## 8. Database changes and relationships
Not applicable.

## 9. Authentication / authorization behaviour
Not applicable. The parts do not check permissions. The server must still check all input.

## 10. Errors and edge cases
- A summary link whose `fieldId` has no matching element does nothing visible. We hit this on the demo page.
- Two elements with the same id on one page. The browser may focus the wrong one, and it is invalid HTML. We hit this too.
- ResponsiveList renders its content twice (table and cards), so tests that look for text can find it more than once.
- An empty error list makes ErrorSummary render nothing.
- Left and right fields in a two-column grid look uneven if only one has help text.

## 11. Tests: what exists and how to run them (exact commands)
- All checks: `pnpm verify`
- Only these tests: `pnpm test tests/ui/form-field.test.tsx tests/ui/form-parts.test.tsx`
- The axe check on the demo page is `tests/a11y/sandbox.test.tsx`.
- Last run before the PR: 8 test files and 63 tests passed.

## 12. How to debug common failures
- Summary link does nothing: open the browser inspector and search for the id. It should exist exactly once.
- Error not read by a screen reader: check that the input has `aria-describedby` with the error id.
- Bottom nav or cards missing: check the window width against 768px.
- `pnpm verify` fails on format: run `pnpm exec prettier --write` on the file.

## 13. Security considerations
These parts only show things. Real validation and permission checks must run on the server. Demo data uses fake names and emails (example addresses only), with no real student data.

## 14. Alternatives and trade-offs
- A custom dropdown looks more designed, but a native select is more reliable on phones and for assistive technology.
- Rendering both table and cards is simple and needs no JavaScript, but it puts the data in the page twice.
- Using Radix for Tabs and Checkbox saves us from writing keyboard handling ourselves, at the cost of one more dependency.

## 15. What AI generated or suggested (prompts used, summary)
I asked the AI to build these parts: FormField, error summary, Select, Checkbox, Tabs, bottom navigation for phones, and a list that replaces tables on phones. The AI produced an install script that wrote the components, the demo section and the tests.

## 16. What a human verified (how: ran tests, read code, checked docs, tried to break it)
- Ran `pnpm verify` and saw it pass (63 tests, including axe, and the build).
- Pressed Tab through the demo page and saw a focus ring on each part.
- Looked at the normal, error and disabled states of FormField, Select and Checkbox in the browser.
- Clicked both error summary links. They first did not work because the demo fields had no matching ids. After adding the ids, each link moved focus to its own field.
- Found and removed two hidden duplicate inputs that had the same ids.
- Saw uneven fields in the two-column demo and fixed it by giving all four fields help text.
- Narrowed the window to phone width: the bottom nav appeared and the table became cards.
- Not checked yet: arrow keys on Tabs, and testing with a real screen reader.
- Known small gap: the Checkbox error text has no icon, unlike the Select error.

## 17. What each teammate can now explain/implement independently
- Why a label, help text and error must be linked to an input, and how `aria-describedby` does it.
- How the error summary takes focus and sends the user to a field.
- Why Select is native.
- How ResponsiveList switches between table and cards.
- How to run the tests and what to check when a summary link does nothing.

## 18. Further learning resources
- docs/ACCESSIBILITY.md in this repo
- WAI-ARIA Authoring Practices (tabs and forms), at w3.org
- Radix UI documentation for Tabs and Checkbox

## 19. Docs updated because of this (per trigger table)
This learning file, `docs/learning/R4_ui_design/INDEX.md`, and the R4 progress files. No other docs changed.

## 20. Walkthrough drill: passed by / date
Not done yet.
