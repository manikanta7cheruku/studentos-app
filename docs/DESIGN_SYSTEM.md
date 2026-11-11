# Design system v2 (decision D-29, 2026-11-11)

This section replaces the colours, the fonts and the "rules" below where they disagree. The old text stays for the history.

## Principles
1. **Phone first.** Every screen is made at 390px wide and then widened. Most students use a phone.
2. **One brand, one gradient.** The gradient (violet `#5B4CF5`, magenta `#9A3FE6`, pink `#E0368F`) is the only colour of the product. It is on the main button, the mark, the selected chip, the vote that is on, the switch that is on, and the plan covers. Everything else is neutral. Plans differ a little from each other (three gradient sets inside the brand colours), so the feed has rhythm but never turns into a rainbow.
3. **Plans are loud, ideas are quiet.** A plan is a card with a gradient cover. An idea is text with a vote pill. So a feed never looks like one repeated card.
4. **Small and calm.** Base type 14px (14.5px on phones), headings 1.6 to 2rem, buttons 36 to 44px. Space does the separating, not lines.
5. **It feels alive.** Everything eases out in 200 to 320ms. Lists rise in one after another (`.stagger`), cards lift on hover, buttons press down, the active dock item opens its name, votes pop, skeletons shimmer. All of it is off for people who asked for less motion.

## Tokens (`src/app/globals.css`)
| Token | Value | Use |
|---|---|---|
| bg | #0B0B10 | page |
| surface / surface-2 | #14141B / #1C1C25 | cards, sheets |
| ink / ink-muted | #F5F5F8 / #A3A3B2 | text |
| border / border-strong | #272733 / #62627A | lines, input borders |
| accent | #7656FF | links, focus colour, small highlights |
| success, warning, danger | #42D392, #F5B83D, #FF7070 | states |
| `--grad` | brand gradient | `bg-brand` and `text-brand` |

Utilities: `glass` (blurred lit surface for the dock and sheets), `bg-brand`, `text-brand`, `lift` (card hover), `stagger`, `shimmer`, `grain` (fine noise over gradients).

## Components
- **Button** (`ui/button.tsx`): default is the gradient with an inner highlight, lifts 1px on hover, presses to 97%. `outline`, `secondary`, `ghost`, `destructive`, `link`. Sizes xs 36px, sm 40px, default 44px, lg 48px.
- **Switch** (`ui/switch.tsx`): the track fills with the gradient from behind the knob, the knob stretches while pressed and springs, a small tick fades in when it is on. Used instead of checkboxes for settings.
- **ChoiceCard** (`app/choice-card.tsx`): a choice among a few, with a round radio. Used for the space and the join rule.
- **Poster** (`app/poster.tsx`): the gradient cover with grain and an optional big word.
- **Dock and create sheet** (`college/college-shell.tsx`, `app/create-sheet.tsx`).
- **VoteButtons, IdeaCard, PostRow (plan card)**: optimistic votes, one tap to open.

## Success marks and badges
Small. A success mark is 40px at most, never a big hero tick.

## Accessibility kept
Text contrast is checked for body text on `bg` and `surface`. Focus rings are always visible (`--ring`). Every control has a name. Motion respects `prefers-reduced-motion`. Targets are at least 36px (decision D-29 replaces the 44px rule; the dock and the main buttons are 44px or more).

---

# Design system v1 (built in code, no Figma; superseded in part by v2 above)

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
