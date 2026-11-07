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
