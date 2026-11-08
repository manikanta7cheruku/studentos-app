# Profile and skills screens - build session

| Field | Value |
|---|---|
| Date / Author (role) | 2026-11-04 / R3 Frontend and App Screens |
| Linked task / ADR / PR | R3-D3-1 / DOC-07 / Branch: `r3/d3-profile-slice` |
| Related docs | docs/API_CONTRACT.md (PRF-01..04), docs/DATABASE.md, docs/AUTH_AND_TENANCY.md, docs/DESIGN_SYSTEM.md, docs/DEFINITION_OF_DONE.md |

## 1. What we are learning and why it is needed

Students and campus community members need a rich, authentic profile to showcase their skills, interests, and bio to their peers, while retaining strict control over their privacy and personal information. This build session implements the complete Profile slice (backend endpoints PRF-01 through PRF-04 and frontend screens):
1. **View Profile (`/me`)**: Displays the member's profile, avatar, bio, interests, skills with proficiency ratings and verified proof links, and current privacy setting.
2. **Edit Profile (`/me/edit`)**: Allows editing display name, bio, graduation year, degree/branch, interests tags, and avatar upload with client + server size & magic byte validation.
3. **Skills Search & Management (`/me/skills`)**: Searchable autocomplete against the college skills catalog, rating proficiency (1 Beginner to 5 Expert), and linking HTTPS evidence/portfolio links.
4. **Visibility Toggle (`college` vs `hidden`)**: Strict privacy toggle preventing hidden student profiles from appearing in the college people directory or peer member lookups.

## 2. What problem it solves

- **Real file inspection, not spoofable extensions**: Attackers often upload `.php` or `.html` disguised as `.png`. Server-side validation inspects the first 12+ bytes of the file buffer (magic signatures for PNG, JPEG, GIF, WebP, AVIF, SVG) and validates size ≤ 2 MB before touching object storage.
- **Strict student privacy (Hidden profile rule)**: When visibility is set to `hidden`, the member can still see and edit their own profile, but any peer lookup returns a 404/NOT_FOUND, and college people queries automatically exclude hidden records.
- **Structured skills and evidence**: Skills are standardized through a searchable catalog while still allowing students to attach verified portfolio/GitHub links.
- **Accessible, token-driven UI**: Built with shadcn/ui and Radix primitives, adhering strictly to the StudentOS Warm Editorial design system (Fraunces serif headings, warm stone tokens, ≥ 44px tap targets, 4 mandatory UI states: loading skeleton, empty, error with request ID and retry, and success).

## 3. Concepts and terminology

- **Magic bytes**: Initial file header bytes identifying the true format (e.g., `89 50 4E 47 0D 0A 1A 0A` for PNG, `FF D8 FF` for JPEG).
- **Hidden Profile**: Privacy setting where a member is invisible to college directories and peer queries.
- **Proficiency Level**: 1 (Beginner) to 5 (Expert) skill rating.
- **Tenant Isolation**: Profiles and skills are tied to the authenticated user and their active college membership.

## 4. How it works internally

1. **Contracts (`src/contracts/profile.ts`)**:
   - `prf01GetProfileResponseSchema`, `prf01PatchProfileBodySchema`
   - `prf02PutSkillsBodySchema`, `prf02PutSkillsResponseSchema`
   - `prf03GetSkillsResponseSchema`
   - `prf04AvatarUploadUrlBodySchema`, `prf04AvatarUploadUrlResponseSchema`
2. **Backend Module (`src/modules/profile/`)**:
   - `profile.ts`: Core functions (`getMyProfile`, `updateMyProfile`, `getMySkills`, `updateMySkills`, `searchSkills`, `getVisibleCollegePeople`).
   - `avatar-validator.ts`: Buffer inspection with `detectImageMime` and `validateAvatarBuffer` (2 MB ceiling).
3. **API Routes (`src/app/api/v1/`)**:
   - `GET /api/v1/me/profile`, `PATCH /api/v1/me/profile`
   - `PUT /api/v1/me/skills`
   - `GET /api/v1/skills?q=`
   - `POST /api/v1/me/avatar/upload-url`
   - `POST /api/v1/me/avatar` (direct multi-part upload endpoint)
   - `GET /api/v1/c/[slug]/people`
4. **Screens & Components (`src/features/profile/`)**:
   - `ProfileViewScreen`: Profile card, bio, tags, badges, skills grid, quick edit buttons.
   - `ProfileEditScreen`: Controlled inputs with `FormField`, avatar upload button, visibility toggle cards, inline validation.
   - `SkillsScreen`: Autocomplete search, level selector (1-5), HTTPS proof URL input, remove action.
   - `ProfileSkeleton`: Accessible loading states.

## 5. Common pitfalls and failure modes

- **Trusting client-provided MIME headers**: Browsers send `Content-Type: image/png` based on the file extension. Never trust this; always inspect the buffer's binary signature on the server.
- **SVGs with embedded `<script>`**: SVG is valid XML but can contain XSS attacks. Ensure SVGs are inspected for `<script>` or event handlers.
- **Hidden profile leakage**: Writing a raw query that forgets `AND (visibility = 'college' OR user_id = auth.uid())` exposes students who opted to be hidden.
- **State reset on prop change**: When wrapping edit forms inside data loaders, use a `key` prop tied to the fetched entity ID or version to prevent stale form state or illegal setState calls inside effects.


---

## Upgrade (R3 takeover, 2026-11-08): profile, skills, settings and people on the real backend

Branch: `r3/d3-upgrade-profile`. The first version fell back to **sample data** when the API answered 401 or failed, so a broken backend looked like a working screen. The upgrade removes every fallback: a screen shows real data or an honest error with a retry.

### U1. The screens

| Address (inside `/c/{slug}`) | What it does | Endpoints |
|---|---|---|
| `/me` | My profile as classmates see it, with Edit, Skills and Settings | PRF-01 `GET /me/profile`, PRF-02 `GET /me/skills` |
| `/me/edit` | Name, handle, headline, about, career goal, interests, **photo upload** | PRF-01 `PATCH`, PRF-04 `POST /me/avatar` |
| `/me/skills` | Search the skill list, add, level 1 to 5, link to your work, save the whole list | PRF-03 `GET /skills?q=`, PRF-02 `PUT /me/skills` |
| `/me/settings` | Show profile to college or hide it, public portfolio, deadline reminders, sign out, **leave the college**, **delete the account** (two steps) | PRF-01 `PATCH`, REM-01, TEN-07, AUTH-04 |
| `/people` | Classmates who chose to be visible, search by name or interest | PRF-05 |
| `/people/{userId}` | One classmate (never shows an email address) | PRF-06 |

The old addresses without a college (`/me`, `/me/edit`, `/me/skills`, `/me/notifications`) now redirect into your college (the last one you used).

### U2. How it works

- **Only changed fields are sent** (`profileChanges`): the form compares with the saved profile. Cleared text becomes `null`. Nothing changed means no request.
- **Photo**: the browser checks the type (JPEG, PNG, WebP, GIF, AVIF) and the size (2 MB) first, then sends the picture as it is. The server checks the real bytes again (magic bytes), so a renamed file is still refused. SVG is refused because it can carry scripts.
- **Skills**: one `PUT` replaces the whole list. Empty links are left out, links must start with `https://`. The level is a real `<select>` with words ("Just starting" to "Expert"), not colour alone.
- **Interests**: a comma ends an interest (also from a paste or a phone keyboard), no duplicates, up to 20.
- **Settings save at once** with an honest message ("Your profile is hidden.") and undo the checkbox if the server refuses.
- **Delete account has two steps**: the first call emails a code, the second call with the code deletes everything. A person who is the only admin of a college gets a clear message (409). After deleting, the app loads the home page fresh.
- **Leave the college**: a confirm dialog, then a full page load to `/find`.

### U3. Things we learned

- **Stale screens**: because Next keeps the previous screen alive in the background, the profile page you left shows old data for a moment after you edit. `useLoad` re-runs when the screen comes back, so the new data replaces the old within a moment. In browser tests, assert on visible elements only (`filter({ visible: true })`), because the hidden copy is still in the page.
- **A label must point at the input**: `FormField` puts the `id` on its single child. The interests field wraps an input and the chips, so the chips live outside `FormField` and the input is its direct child. Otherwise the label is not connected to the input (a real accessibility bug caught by the browser test).
- **Avoid reloading a form while the person is typing**: the photo upload does not reload the profile, because that would replace the form with a skeleton and lose the text typed so far.

### U4. Tests

```bash
node node_modules/vitest/vitest.mjs run src/features/profile   # profileChanges, skillsPayload, level labels
pnpm test:e2e -- e2e/profile.ui.spec.ts                         # real backend, desktop and phone
```

Browser tests: edit profile and skills and see them on my page, handle that is not allowed, photo upload, a file that is not an image, people search, privacy saved after reload, old `/me` address redirect, leave college, delete account (real code from the mailbox). Every page is checked for sideways scrolling.

### U5. What a human verified

Ran the 18 profile browser tests (desktop and phone) against the real local backend, and looked at the screens at 390px and 1280px wide.

### U6. Docs updated

`docs/ROUTES_AND_NAVIGATION.md` (people and settings routes), `docs/progress/R3_frontend/PROGRESS.md`.
