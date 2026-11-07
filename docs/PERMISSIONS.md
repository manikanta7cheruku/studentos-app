# Permission table (who can call what)

One row per route method. The test `tests/integration/permission-matrix.test.ts` reads this table and fails when:

- a `route.ts` method exists that is not in this table (or a row has no route), or
- a row has no matching call in the matrix (every row is called as anon, pending, suspended, student level 1 and 2, moderator, admin, student of another college, admin of another college).

Who: **pub** = nobody signed in needed. **ses** = any signed-in person. **mem** = active member of the college (pending and suspended get 403 `MEMBERSHIP_NOT_ACTIVE`). **mod** = active moderator or admin. **adm** = active college admin.
Other college = always 404 on `/c/{slug}/...` (never confirms the college exists). Nobody signed in = 401 on everything except **pub**.
Paths are under `/api/v1` unless they start with `/api/`.

Write limit: 60 writes a minute per person (`write_user`). Moderator and admin endpoints use their own 120 a minute bucket (`admin_user`). Extra limits are listed in the last column.

| ID | Method | Path | Who | Extra limits |
| --- | --- | --- | --- | --- |
| SYS-01 | GET | /api/health | pub | none |
| SYS-01 | GET | /api/ready | pub | none |
| AUTH-01 | POST | /auth/otp/request | pub | 5/h per email, 20/h per IP |
| AUTH-02 | POST | /auth/otp/verify | pub | lock after 5 wrong codes |
| AUTH-03 | POST | /auth/logout | ses | write limit |
| TEN-01 | GET | /colleges/public/{slug} | pub | none |
| TEN-02 | GET | /c/{slug}/me/membership | ses | none |
| TEN-03 | POST | /c/{slug}/join/invite | ses | write limit, 10/h |
| TEN-04 | POST | /c/{slug}/join/manual | ses | write limit, 10/h |
| TEN-05 | POST | /c/{slug}/join/email-domain | ses | write limit |
| NTF-01 | GET | /me/notifications | ses | none |
| NTF-02 | POST | /me/notifications/read | ses | write limit |
| RPT-04 | PUT | /me/blocks/{userId} | ses | write limit |
| RPT-04 | DELETE | /me/blocks/{userId} | ses | write limit |
| WL-01 | POST | /waitlist | pub | 5/h per IP |
| PRF-01 | GET | /me/profile | ses | none |
| PRF-01 | PATCH | /me/profile | ses | write limit |
| PRF-02 | GET | /me/skills | ses | none |
| PRF-02 | PUT | /me/skills | ses | write limit |
| PRF-03 | GET | /skills | ses | none |
| PRF-04 | POST | /me/avatar | ses | write limit |
| PRF-04 | POST | /me/avatar/upload-url | ses | write limit |
| PRF-05 | GET | /c/{slug}/people | mem | none |
| ANN-01 | GET | /c/{slug}/announcements | mem | none |
| RPT-01 | POST | /c/{slug}/reports | mem | write limit |
| ANN-02 | GET | /c/{slug}/admin/announcements | mod | admin bucket |
| ANN-02 | POST | /c/{slug}/admin/announcements | mod | admin bucket |
| ANN-02 | PATCH | /c/{slug}/admin/announcements/{id} | mod | admin bucket |
| ANN-02 | DELETE | /c/{slug}/admin/announcements/{id} | mod | admin bucket |
| RPT-02 | GET | /c/{slug}/admin/reports | mod | admin bucket |
| RPT-03 | POST | /c/{slug}/admin/reports/{id}/action | mod | admin bucket |
| ADM-03 | GET | /c/{slug}/admin/settings | adm | admin bucket |
| ADM-03 | PATCH | /c/{slug}/admin/settings | adm | admin bucket |
| ADM-11 | GET | /c/{slug}/admin/stats | adm | admin bucket |
| ADM-05 | GET | /c/{slug}/admin/invites | adm | admin bucket |
| ADM-05 | POST | /c/{slug}/admin/invites | adm | admin bucket |
| ADM-05 | DELETE | /c/{slug}/admin/invites/{id} | adm | admin bucket |
| ADM-06 | GET | /c/{slug}/admin/verification-requests | adm | admin bucket |
| ADM-07 | POST | /c/{slug}/admin/verification-requests/{id}/decision | adm | admin bucket |
| ADM-08 | GET | /c/{slug}/admin/members | adm | admin bucket |
| ADM-09 | PATCH | /c/{slug}/admin/members/{membershipId} | adm | admin bucket |
| ADM-10 | GET | /c/{slug}/admin/audit-logs | adm | admin bucket |

Inside the rows above, extra rules that the matrix cannot show (self-handling, who may suspend whom) are tested in `tests/integration/engagement.test.ts` and `admin.test.ts`.
