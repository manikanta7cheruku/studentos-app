# Permission table (who can call what)

One row per route method. The test `tests/integration/permission-matrix.test.ts` reads this table and fails when:

- a `route.ts` method exists that is not in this table (or a row has no route), or
- a row has no matching call in the matrix (every row is called as anon, pending, suspended, student level 1 and 2, moderator, admin, student of another college, admin of another college).

Who: **pub** = nobody signed in needed. **ses** = any signed-in person. **mem** = active member of the college (pending and suspended get 403 `MEMBERSHIP_NOT_ACTIVE`). "(author)" or "(applicant)" means the rule inside the function also needs you to own the post or request: someone else gets 403 or 404 (tested in `teamfinder.test.ts`). **mod** = active moderator or admin. **adm** = active college admin. **cron** = the scheduler, with the shared secret (people get 401 whoever they are).
Other college = always 404 on `/c/{slug}/...` (never confirms the college exists). Nobody signed in = 401 on everything except **pub**.
Paths are under `/api/v1` unless they start with `/api/`.

Write limit: 60 writes a minute per person (`write_user`). Moderator and admin endpoints use their own 120 a minute bucket (`admin_user`). Extra limits are listed in the last column.

| ID | Method | Path | Who | Extra limits |
| --- | --- | --- | --- | --- |
| SYS-01 | GET | /api/health | pub | none |
| SYS-01 | GET | /api/ready | pub | none |
| SYS-02 | POST | /api/internal/maintenance | cron | secret in `Authorization: Bearer` (CRON_SECRET), never a cookie |
| AUTH-01 | POST | /auth/otp/request | pub | 5/h per email, 20/h per IP |
| AUTH-02 | POST | /auth/otp/verify | pub | lock after 5 wrong codes |
| AUTH-05 | GET | /auth/google | pub | none (Google and Supabase limit it) |
| AUTH-06 | GET | /auth/google/callback | pub | none (needs a one time code from Google) |
| AUTH-03 | POST | /auth/logout | ses | write limit |
| AUTH-04 | DELETE | /me | ses | write limit, code by email (sign in code limits) |
| TEN-01 | GET | /colleges/public/{slug} | pub | none |
| TEN-08 | GET | /me/memberships | ses | read limit |
| TEN-02 | GET | /c/{slug}/me/membership | ses | none |
| TEN-03 | POST | /c/{slug}/join/invite | ses | write limit, 10/h |
| TEN-04 | POST | /c/{slug}/join/manual | ses | write limit, 10/h |
| TEN-05 | POST | /c/{slug}/join/email-domain | ses | write limit |
| TEN-09 | POST | /c/{slug}/join/open | ses | write limit, 10/h |
| TEN-07 | POST | /c/{slug}/me/leave | ses | write limit |
| NTF-01 | GET | /me/notifications | ses | none |
| NTF-02 | POST | /me/notifications/read | ses | write limit |
| RPT-05 | GET | /me/blocks | ses | read limit |
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
| PRF-06 | GET | /c/{slug}/people/{userId} | mem | none |
| TMF-01 | POST | /c/{slug}/team-posts | mem | write limit, 10 open posts |
| TMF-02 | GET | /c/{slug}/team-posts | mem | none |
| TMF-03 | GET | /c/{slug}/team-posts/{id} | mem | none |
| TMF-04 | PATCH | /c/{slug}/team-posts/{id} | mem (author) | write limit |
| TMF-05 | POST | /c/{slug}/team-posts/{id}/close | mem (author) | write limit |
| TMF-06 | POST | /c/{slug}/team-posts/{id}/roles/{roleId}/requests | mem | write limit, 10 waiting requests |
| TMF-07 | GET | /c/{slug}/team-posts/{id}/requests | mem (author) | none |
| TMF-08 | POST | /c/{slug}/join-requests/{id}/decision | mem (author) | write limit |
| TMF-09 | DELETE | /c/{slug}/join-requests/{id} | mem (applicant) | write limit |
| TMF-10 | GET | /c/{slug}/me/join-requests | mem | none |
| OPP-01 | GET | /c/{slug}/opportunities | mem | none |
| OPP-02 | GET | /c/{slug}/opportunities/{id} | mem | none |
| OPP-03 | GET | /c/{slug}/admin/opportunities | mod | admin bucket |
| OPP-03 | POST | /c/{slug}/admin/opportunities | mod | admin bucket |
| OPP-03 | PATCH | /c/{slug}/admin/opportunities/{id} | mod | admin bucket |
| OPP-03 | DELETE | /c/{slug}/admin/opportunities/{id} | mod | admin bucket |
| OPP-04 | PUT | /me/saved-opportunities/{id} | ses | write limit |
| OPP-04 | DELETE | /me/saved-opportunities/{id} | ses | write limit |
| TMF-11 | POST | /c/{slug}/team-posts/{id}/join | mem | write limit, open plans only |
| TMF-12 | GET | /c/{slug}/team-posts/{id}/participants | mem | read limit, names only for the host and people who joined |
| ADM-13 | POST | /c/{slug}/admin/content/remove | mod | moderators and admins, audit logged, the author is told |
| ADM-14 | GET | /c/{slug}/admin/content | mod | moderators and admins |
| EVT-01 | POST | /c/{slug}/events | mem | write limit, 10 upcoming per person |
| EVT-02 | GET | /c/{slug}/events | mem | read limit |
| EVT-03 | GET | /c/{slug}/events/{id} | mem | read limit |
| EVT-04 | PUT | /c/{slug}/events/{id}/rsvp | mem | write limit |
| EVT-05 | DELETE | /c/{slug}/events/{id} | mem | author, or moderator and admin (audit logged) |
| VEN-01 | GET | /c/{slug}/venues | mem | read limit |
| VEN-02 | POST | /c/{slug}/venues | mem | write limit, any member, 20 per person |
| VEN-03 | GET | /c/{slug}/venues/{id} | mem | read limit |
| VEN-04 | DELETE | /c/{slug}/venues/{id} | mem | write limit, the venue's manager only |
| VEN-05 | GET | /c/{slug}/venues/{id}/slots | mem | read limit |
| VEN-06 | POST | /c/{slug}/venues/{id}/bookings | mem | write limit, 6 waiting requests per person |
| VEN-07 | GET | /c/{slug}/venues/{id}/bookings | mem | read limit, the venue's manager only |
| VEN-08 | GET | /c/{slug}/me/bookings | mem | read limit, my own requests |
| VEN-09 | POST | /c/{slug}/bookings/{id}/decision | mem | write limit, the venue's manager only |
| VEN-10 | DELETE | /c/{slug}/bookings/{id} | mem | write limit, the person who asked only |
| BRD-01 | POST | /c/{slug}/board | mem | write limit, 15 a day |
| BRD-02 | GET | /c/{slug}/board | mem | read limit |
| BRD-03 | GET | /c/{slug}/board/{id} | mem | read limit |
| BRD-04 | POST | /c/{slug}/board/{id}/status | mem | author only |
| BRD-05 | DELETE | /c/{slug}/board/{id} | mem | author, or moderator and admin (audit logged) |
| BRD-06 | GET | /c/{slug}/board/{id}/messages | mem | the author sees all threads, others only their own |
| BRD-07 | POST | /c/{slug}/board/{id}/messages | mem | write limit, 30 an hour |
| IDE-01 | POST | /c/{slug}/ideas | mem | write limit, 20 a day |
| IDE-02 | GET | /c/{slug}/ideas | mem | read limit |
| IDE-03 | GET | /c/{slug}/ideas/{id} | mem | read limit |
| IDE-04 | PUT | /c/{slug}/ideas/{id}/vote | mem | write limit |
| IDE-05 | DELETE | /c/{slug}/ideas/{id} | mem | author, or moderator and admin (audit logged) |
| IDE-06 | POST | /c/{slug}/ideas/{id}/comments | mem | write limit, 40 an hour |
| IDE-07 | GET | /c/{slug}/ideas/{id}/comments | mem | read limit |
| IDE-08 | DELETE | /c/{slug}/ideas/{id}/comments/{commentId} | mem | author, or moderator and admin |
| IDE-09 | PUT | /c/{slug}/ideas/{id}/comments/{commentId}/vote | mem | write limit |
| MSG-01 | GET | /c/{slug}/messages | mem | read limit, my own conversations |
| MSG-02 | GET | /c/{slug}/messages/{userId} | mem | read limit, both people active members and not blocked |
| MSG-03 | POST | /c/{slug}/messages/{userId} | mem | write limit, 60 an hour, 20 unopened per person, not blocked |
| MSG-04 | POST | /c/{slug}/messages/{userId}/report | mem | write limit |
| FDB-01 | POST | /me/feedback | ses | write limit, 10 a day |
| PHO-01 | POST | /c/{slug}/photos/upload-url | mem | write limit, 1 MB at most |
| BRD-08 | PUT | /c/{slug}/board/{id}/photo | mem | the author only |
| COL-01 | POST | /colleges/setup | ses | needs a one-time setup code, 5 tries an hour |
| APP-01 | POST | /me/applications | ses | write limit, 200 per person |
| APP-02 | GET | /me/applications | ses | read limit |
| APP-03 | GET | /me/applications/{id} | ses | read limit |
| APP-03 | PATCH | /me/applications/{id} | ses | write limit |
| APP-03 | DELETE | /me/applications/{id} | ses | write limit |
| APP-04 | POST | /me/applications/{id}/status | ses | write limit |
| REM-01 | GET | /me/reminder-settings | ses | none |
| REM-01 | PUT | /me/reminder-settings | ses | write limit |
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
