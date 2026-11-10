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
Compact scale (decision D-28): the page base is 14px (14.5px on phones) and every rem size follows it; body text is 14px, line height 1.5, touch targets stay at least 40px. Headings use Fraunces. Space scale: 4, 8, 12, 16, 24, 32, 48, 64. Radius: 4 inputs, 8 cards, 12 sheets. Almost no shadows. Use thin borders.

## Rules for every screen
1. One main action per screen.
2. Every data screen has loading (skeleton), empty (tells what to do), error (retry and request id) and success states.
3. Visible labels on all inputs. Errors are written in plain words and linked to the field.
4. Buttons at least 44px high. Focus ring is always visible.
5. Mobile first. Check 360px, 768px and 1280px.
6. Never use color alone to show meaning. Add text or an icon.
7. Words: short and clear. Say "your college", never "tenant".

## App shell and shared parts (built in R3 takeover, Day 1)
These live in `src/components/app` and `src/features/college`. Use them instead of making new ones.

| Part | Use it for |
|---|---|
| `CollegeShell` | The frame of every college screen. Desktop and tablet (768px and up): a left sidebar with the college, the tabs, People and Admin, and the account menu. Phone: a slim top bar (college, people, bell) and a bottom tab bar with the college's tabs. Tabs the college switched off are removed, not greyed out |
| `PageHeader` | The top of a screen: optional way back, small label, title in Fraunces, one sentence, the one main action |
| `LoadError` | The error state of a data screen: plain words, a retry button, the request code |
| `ScreenMessage` | A whole screen message (not found, offline, no access), left aligned on a narrow column |
| `Avatar` | A picture, or initials on one of six quiet tones (`--tone-1` to `--tone-6`). The same name always gets the same tone |
| `OtpInput` | A six digit code: six boxes, one real input behind them (paste, backspace, phone code suggestion) |
| `Spinner` | Always next to a word, never alone |

Tokens added: `--tone-1-bg` to `--tone-6-fg` (avatar tones), `--safe-bottom` (space under the home bar of a phone), class `.page-enter` (a 160ms fade of the page, switched off for people who prefer reduced motion), class `.tabular` (numbers of equal width).

Layout rules for the shell: content column at most 56rem (3xl to 4xl) so lines stay readable, 20px side gutter on a phone and 32px from 768px, left aligned headings, thin borders instead of shadows, a dividing rule under the page header. College accent colour: set with `accentVars(hex)` in `src/lib/color.ts`, which falls back to the StudentOS blue when the colour has less than 4.5 to 1 contrast on white.

### Lists of posts (Team Finder)
A list is rows separated by thin rules, not a grid of cards. Each row: a small caps kind label, a status pill (words, not colour alone), the title as the only link (stretched over the row with `after:absolute after:inset-0`, so a screen reader hears just the title and a finger can use the whole row), two lines of text, role chips with how many places are free, then who and when. Filters are pressed buttons (`aria-pressed`) 44px high, a search box, and one checkbox. "Show more" loads the next page; there is no endless scroll. Roles are chips; a form with repeated parts (roles) uses one bordered block per part with a clear "Remove role 2" button.

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
