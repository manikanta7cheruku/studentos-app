# Third party register: dependencies

Written by R5 (Uday1217k) on 2026-11-15, Day 3. Rules: [LICENSING.md](LICENSING.md) section 4. The rules are enforced on every pull request by the **Licence check** job in CI (`pnpm licenses:check`). The allowed licences are in `licenses.allow.json` and the exceptions are in `licenses.exceptions.json`. This file is the readable record of both.

## How this file stays true

- A new package with a licence that is not allowed makes CI fail. It needs an entry in `licenses.exceptions.json` with a reason, and the entry only counts when `status` is `approved` and `approvedBy` and `approvedOn` are filled in (LICENSING.md section 4.3).
- Approving or removing an exception, or changing the allowed list, needs R2 or the admin. R5 proposes, and does not approve.
- `pnpm licenses:check --strict` also fails while any exception is still pending. That is the release gate for S2.
- The tables below were generated on 2026-11-15 from `pnpm licenses list --json` and from `licenses.exceptions.json`. When dependencies change a lot, regenerate or edit them by hand and keep the date.

## 1. Summary on 2026-11-15

The lockfile on the R5 machine (Windows) has 717 package versions and 14 different licences. CI on Linux sees one more package, because the image library binary differs by platform.

| Licence | Package versions | Allowed by the list? |
|---|---|---|
| MIT | 614 | yes |
| Apache-2.0 | 33 | yes |
| ISC | 29 | yes |
| BSD-2-Clause | 13 | yes |
| BSD-3-Clause | 9 | yes |
| MPL-2.0 | 6 | yes |
| BlueOak-1.0.0 | 3 | yes |
| MIT-0 | 2 | no, exception pending |
| CC0-1.0 | 2 | yes |
| (MIT OR CC0-1.0) | 2 | yes |
| Apache-2.0 AND LGPL-3.0-or-later | 1 | no, exception pending |
| Python-2.0 | 1 | yes |
| CC-BY-4.0 | 1 | no, exception pending |
| 0BSD | 1 | yes |

## 2. Exceptions

All of these are proposals. **None is approved.** The Licence check passes today only because pending exceptions are allowed in the normal mode.

| Package | Licence | Scope | Reason | Status | Proposed by | Approved by | Approved on |
|---|---|---|---|---|---|---|---|
| @csstools/color-helpers | MIT-0 | development | MIT-0 is the MIT licence without the attribution requirement. Seen only in the development list on the R5 machine, so it is not shipped. | pending | R5 (Uday1217k) on 2026-11-15 | nobody yet |  |
| @csstools/css-syntax-patches-for-csstree | MIT-0 | development | MIT-0 is the MIT licence without the attribution requirement. Seen only in the development list on the R5 machine, so it is not shipped. | pending | R5 (Uday1217k) on 2026-11-15 | nobody yet |  |
| @img/sharp-win32-x64 | Apache-2.0 AND LGPL-3.0-or-later | production | Image library binary used by Next.js. LGPL is weak copyleft: allowed with review (LICENSING.md section 4.1). The reviewer must confirm the LGPL part (libvips) is a separate library file that can be replaced. | pending | R5 (Uday1217k) on 2026-11-15 | nobody yet |  |
| @img/sharp-libvips-* | LGPL-3.0-or-later | production | The libvips library for other platforms (the Linux CI machine). Same review as above. The exact names are confirmed by the first CI run. | pending | R5 (Uday1217k) on 2026-11-15 | nobody yet |  |
| caniuse-lite | CC-BY-4.0 | production | Browser support data, not code. CC-BY-4.0 requires attribution, so it must be listed in the third party notices. | pending | R5 (Uday1217k) on 2026-11-15 | nobody yet |  |

## 3. Direct dependencies

| Package | Declared | Installed | Licence | Scope |
|---|---|---|---|---|
| @supabase/ssr | ^0.12.7 | 0.12.7 | MIT | production |
| @supabase/supabase-js | ^2.118.0 | 2.118.0 | MIT | production |
| class-variance-authority | ^0.7.1 | 0.7.1 | Apache-2.0 | production |
| cn | ^0.5.0 | 0.2.6, 0.5.0 | MIT | production |
| lucide-react | ^1.64.0 | 1.64.0 | ISC | production |
| next | 16.4.2 | 16.4.2 | MIT | production |
| radix-ui | ^1.8.1 | 1.8.1 | MIT | production |
| react | 19.3.0 | 19.3.0 | MIT | production |
| react-dom | 19.3.0 | 19.3.0 | MIT | production |
| shadcn | ^4.23.0 | 4.23.0 | MIT | production |
| sonner | ^2.0.8 | 2.0.8 | MIT | production |
| tw-animate-css | ^1.4.0 | 1.4.0 | MIT | production |
| web-push | ^4.0.0 | 4.0.0 | MPL-2.0 | production |
| zod | ^4.6.7 | 4.6.7 | MIT | production |
| @playwright/test | ^1.64.1 | 1.64.1 | Apache-2.0 | development |
| @tailwindcss/turbopack | ^4 | 4.3.3 | MIT | development |
| @testing-library/dom | ^10.4.2 | 10.4.2 | MIT | development |
| @testing-library/react | ^16.3.3 | 16.3.3 | MIT | development |
| @types/node | ^20 | 20.19.43 | MIT | development |
| @types/react | ^19 | 19.3.0 | MIT | development |
| @types/react-dom | ^19 | 19.3.0 | MIT | development |
| @types/web-push | ^3.6.4 | 3.6.4 | MIT | development |
| axe-core | ^4.14.0 | 4.14.0 | MPL-2.0 | development |
| eslint | ^9 | 9.39.5 | MIT | development |
| eslint-config-next | 16.4.2 | 16.4.2 | MIT | development |
| jsdom | ^30.1.3 | 30.1.3 | MIT | development |
| msw | ^3.0.3 | 3.0.3 | MIT | development |
| prettier | ^3.9.10 | 3.9.10 | MIT | development |
| supabase | ^2.122.0 | 2.122.0 | MIT | development |
| tailwindcss | ^4 | 4.3.3 | MIT | development |
| typescript | ^5 | 5.9.3 | Apache-2.0 | development |
| vitest | ^5.0.5 | 5.0.5 | MIT | development |

## 4. Checklist for a new dependency (LICENSING.md section 4.3, item 4)

Write these in the pull request: the licence (SPDX id), whether its own dependencies were scanned, whether it is maintained, its size, and the alternatives considered.

## 5. Open items

1. R2 or the admin must approve or remove the pending exceptions in section 2. The reviewer of the image library (LGPL part) must confirm the LGPL code is a separate library file that can be replaced.
2. `THIRD_PARTY_NOTICES.txt` (package, version, licence, copyright and licence text, linked from the legal page) is **not generated yet** (LICENSING.md section 4.3, item 3). MIT, BSD and Apache licences require the notices to be kept.
3. `caniuse-lite` is CC-BY-4.0 data and needs its attribution on the legal page.
4. The licence of a package is read from what the package says about itself. R5 has not read licence texts file by file.
