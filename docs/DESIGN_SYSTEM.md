# Design system (built in code, no Figma)

We design in code with AI help. Rules keep the UI clean and not generic.

## Tools
Tailwind CSS with design tokens in CSS variables, shadcn/ui (built on Radix) copied into `src/components/ui`, Lucide icons, self-hosted fonts (Fraunces for headings, Public Sans for text; check their licences in LICENSING.md). All components are shown on the page `/dev/components` with every state.

## Colors (contrast numbers were calculated)
| Token | Hex | Use |
|---|---|---|
| bg | #FAF7F2 | page background |
| surface | #FFFFFF | cards and inputs |
| ink | #1B1A17 | main text (16.3 to 1 on bg) |
| ink-muted | #5C574E | second text (6.7 to 1) |
| border | #DDD6CA | light lines |
| border-strong | #8C857A | input borders (3.4 to 1) |
| accent | #2340C8 | links and main buttons (7.5 to 1; white on it 8.0 to 1) |
| accent-soft | #E6EAFB | selected background |
| success | #1E7A4C | good state (5.0 to 1) |
| warning | #8A5100 | warning text (6.0 to 1) |
| danger | #B3261E | errors (6.1 to 1) |
A college can pick its own accent color, but it must have at least 4.5 to 1 contrast on white and on bg. The admin screen blocks bad colors.

## Type and space
Body 16px minimum, line height 1.5. Headings use Fraunces. Space scale: 4, 8, 12, 16, 24, 32, 48, 64. Radius: 4 inputs, 8 cards, 12 sheets. Almost no shadows. Use thin borders.

## Rules for every screen
1. One main action per screen.
2. Every data screen has loading (skeleton), empty (tells what to do), error (retry and request id) and success states.
3. Visible labels on all inputs. Errors are written in plain words and linked to the field.
4. Buttons at least 44px high. Focus ring is always visible.
5. Mobile first. Check 360px, 768px and 1280px.
6. Never use color alone to show meaning. Add text or an icon.
7. Words: short and clear. Say "your college", never "tenant".

## Do not do (this is what makes UI look AI generated)
Gradients and glowing blobs, glass effects, rows of three identical icon cards, fake numbers, fake reviews, emoji as icons, stock photos of smiling students, bouncing animations, huge shadows, centered everything.

## Review check before every UI pull request
- Does it use tokens (no random colors)?
- Does it work with the keyboard?
- Does it work at 360px?
- Are all four states there?
- Could this screen belong to any app? If yes, make the words and layout more specific to StudentOS.

## Testing the design with real students
There is no Figma prototype. R1 tests the staging app with 5 students on Day 6 (sign in, join, post a team request, request to join, track an application).
