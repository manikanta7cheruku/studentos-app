import { http, HttpResponse } from "msw";
import ann01 from "@/contracts/fixtures/ann-01.success.json";
import ann02Create from "@/contracts/fixtures/ann-02-create.success.json";
import ntf01 from "@/contracts/fixtures/ntf-01.success.json";
import ntf02 from "@/contracts/fixtures/ntf-02.success.json";
import rpt01 from "@/contracts/fixtures/rpt-01.success.json";
import rpt02 from "@/contracts/fixtures/rpt-02.success.json";
import rpt03 from "@/contracts/fixtures/rpt-03.success.json";
import tmf01 from "@/contracts/fixtures/tmf-01.success.json";
import tmf02 from "@/contracts/fixtures/tmf-02.success.json";
import tmf03 from "@/contracts/fixtures/tmf-03.success.json";
import tmf05 from "@/contracts/fixtures/tmf-05.success.json";
import tmf06 from "@/contracts/fixtures/tmf-06.success.json";
import tmf07 from "@/contracts/fixtures/tmf-07.success.json";
import tmf08 from "@/contracts/fixtures/tmf-08-accept.success.json";
import tmf09 from "@/contracts/fixtures/tmf-09.success.json";
import tmf10 from "@/contracts/fixtures/tmf-10.success.json";
import wl01 from "@/contracts/fixtures/wl-01.success.json";

// Sample answers for the Day 4 and Day 5 endpoints (notifications, announcements, reports, waitlist, Team Finder).
// They return the contract fixtures, so a screen built on them keeps working when the real API is switched on.
// Same URLs and methods as the real routes (docs/API_CONTRACT.md sections 9 and 10, docs/PERMISSIONS.md).
// tests: src/mocks/handlers-day4-5.test.ts runs every one of them through the contract schema.
export const day4And5Handlers = [
  // A few of every kind, so the filters and the day groups can be tried in sample mode.
  http.get("*/api/v1/me/notifications", () => {
    const ago = (minutes: number) => new Date(Date.now() - minutes * 60_000).toISOString();
    const item = (
      n: number,
      type: string,
      title: string,
      message: string,
      minutes: number,
      read = false,
    ) => ({
      id: `99999999-9999-4999-8999-${String(n).padStart(12, "0")}`,
      type,
      payload: { title, message, college_slug: "alpha" },
      read_at: read ? ago(minutes - 1) : null,
      created_at: ago(minutes),
    });
    return HttpResponse.json({
      ...ntf01,
      data: [
        item(1, "dm.received", "New request", "Priya Sharma wants to connect with you.", 4),
        item(
          2,
          "debate.invited",
          "You are invited to a debate",
          "Arjun Reddy invited you: Is a 9 AM class fair?",
          35,
        ),
        item(
          3,
          "team.request_received",
          "New join request",
          "Sana Ali asked to join Robotics club build.",
          180,
        ),
        item(
          4,
          "venue.booking_confirmed",
          "Booking confirmed",
          "Your turf slot on Saturday 6 PM is confirmed.",
          60 * 26,
          true,
        ),
        item(
          5,
          "announcement.published",
          "Exam timetable",
          "The mid-semester timetable is out.",
          60 * 28,
          true,
        ),
        { ...ntf01.data[0]!, created_at: ago(60 * 24 * 9) },
      ],
      meta: { ...ntf01.meta, unread_count: 3 },
    });
  }),
  http.post("*/api/v1/me/notifications/read", () => HttpResponse.json(ntf02)),
  http.get("*/api/v1/c/:slug/announcements", () => HttpResponse.json(ann01)),
  http.post("*/api/v1/c/:slug/admin/announcements", () =>
    HttpResponse.json(ann02Create, { status: 201 }),
  ),
  http.post("*/api/v1/c/:slug/reports", () => HttpResponse.json(rpt01, { status: 201 })),
  http.get("*/api/v1/c/:slug/admin/reports", () => HttpResponse.json(rpt02)),
  http.post("*/api/v1/c/:slug/admin/reports/:id/action", () => HttpResponse.json(rpt03)),
  http.post("*/api/v1/waitlist", () => HttpResponse.json(wl01)),

  http.get("*/api/v1/c/:slug/team-posts", () => HttpResponse.json(tmf02)),
  http.post("*/api/v1/c/:slug/team-posts", () => HttpResponse.json(tmf01, { status: 201 })),
  http.get("*/api/v1/c/:slug/team-posts/:id", () => HttpResponse.json(tmf03)),
  http.post("*/api/v1/c/:slug/team-posts/:id/close", () => HttpResponse.json(tmf05)),
  http.get("*/api/v1/c/:slug/team-posts/:id/requests", () => HttpResponse.json(tmf07)),
  http.post("*/api/v1/c/:slug/team-posts/:id/roles/:roleId/requests", () =>
    HttpResponse.json(tmf06, { status: 201 }),
  ),
  http.post("*/api/v1/c/:slug/join-requests/:id/decision", () => HttpResponse.json(tmf08)),
  http.delete("*/api/v1/c/:slug/join-requests/:id", () => HttpResponse.json(tmf09)),
  http.get("*/api/v1/c/:slug/me/join-requests", () => HttpResponse.json(tmf10)),
];
