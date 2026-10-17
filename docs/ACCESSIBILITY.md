> Note: this file came from the first planning package. Old "doc NN" numbers, "T-" task IDs and Figma mentions are out of date. The task list is in ROADMAP.md. Design is built in code (see DESIGN_SYSTEM.md). Project folders are simpler now: src/contracts and src/components/ui.

# 10 - Accessibility and Content Guidelines

| Field | Value |
|---|---|
| Doc ID | DOC-10 |
| Version / Date | 0.1.0 / 2026-10-15 |
| Owner | R4 (R5 verifies) |
| Status | Proposed |

## 1. Target
WCAG 2.2 Level AA on all P0/P1 flows (target, not a certification). Automated tools catch only part of issues; manual checks are required.

## 2. Requirements and how we check
| Area | Requirement | Check |
|---|---|---|
| Keyboard | Every function reachable and operable by keyboard; logical tab order; no traps except dialogs (with Esc) | Manual tab-through each flow |
| Focus | Visible focus ring; focus moves to dialog on open and returns on close; focus moves to error summary on failed submit; route change moves focus to main heading | Manual + Playwright assertions |
| Contrast | Text ≥ 4.5:1; large text and UI components ≥ 3:1 | Token table (computed) + axe |
| Typography | 16 px body min; zoom to 200% without loss; reflow at 320 px | Manual |
| Semantics | One `h1` per page; landmarks (`header`, `nav`, `main`); lists as lists; buttons vs links used correctly | axe + review |
| Forms | Programmatic labels; required indicated in text; errors associated via `aria-describedby`; `autocomplete` tokens | axe + manual |
| Screen reader | Dynamic updates announced (`aria-live` polite for toasts, assertive only for critical); status badges have text | Test with NVDA/VoiceOver on 5 key flows |
| Touch targets | ≥ 44×44 px (the WCAG minimum is lower; we use 44) | Design review |
| Motion | `prefers-reduced-motion` respected; nothing flashes | Manual |
| Images | Meaningful alt text; decorative `alt=""`; user-uploaded images require alt text prompt (optional) | Review |
| Time limits | OTP expiry explained; session expiry warning; drafts preserved | Manual |
| Language | `lang` attribute; text externalised | Lint |
| Errors | Not colour only; plain language | Review |

## 3. Release gate
No unresolved **critical** accessibility defect on a P0 flow (keyboard blocker, unlabeled form control, contrast failure on primary action) at S1/S2.

## 4. Content tone
Friendly, direct, respectful, never condescending. Short sentences. Verbs first for buttons ("Request to join", not "Submit"). No guilt copy. Don't use "simply/just/obviously".

## 5. Inclusive language
Avoid gendered defaults, idioms that don't translate, and region-specific assumptions. Names: allow single names and long names; no forced "first/last". Don't require caste, religion, or other sensitive attributes anywhere.

## 6. Localisation readiness
All strings in message catalogue keys; no string concatenation for sentences; ICU-style plurals; dates/numbers via `Intl`; right-to-left not required now. Candidate locales (to validate): Hindi, Telugu, others per pilot college.

## 7. Microcopy catalogue (starter)
| Situation | Copy |
|---|---|
| Pending verification | "We're checking that you belong to {college}. You'll hear back here." |
| Code expired | "That code has expired. We can send a new one." |
| Slots full | "That role was just filled. See other open roles." |
| Offline | "You're offline. Your changes are saved on this device." |
| Forbidden | "You don't have access to this. If you think that's wrong, contact your college admin." |
