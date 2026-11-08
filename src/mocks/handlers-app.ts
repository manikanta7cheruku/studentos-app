import { http, HttpResponse } from "msw";
import prf01 from "@/contracts/fixtures/prf-01-get.success.json";
import prf02 from "@/contracts/fixtures/prf-02.request.json";
import prf03 from "@/contracts/fixtures/prf-03.success.json";
import ten02 from "@/contracts/fixtures/ten-02.success.json";
import ten08 from "@/contracts/fixtures/ten-08.success.json";

// Sample answers for the screens of R3 Days 1 to 3 (sign in, join, profile). With NEXT_PUBLIC_API_MOCKING=enabled the
// app behaves like a signed-in student of Alpha College and every answer comes from a contract fixture, so a screen
// built on them keeps working against the real API. Real behaviour is tested against the real backend
// (e2e/*.ui.spec.ts and tests/integration).
const META = { request_id: "req_mock_app" };
let profile = { ...prf01.data };
let skills = (prf02 as unknown as { skills: { skill_id: string; level: number }[] }).skills;

export const appHandlers = [
  http.post("*/api/v1/auth/otp/request", () =>
    HttpResponse.json({ data: { sent: true, retry_after_seconds: 60 }, meta: META }),
  ),
  http.post("*/api/v1/auth/otp/verify", () =>
    HttpResponse.json({
      data: {
        user: { id: "aaaaaaaa-1000-4000-8000-000000000003", email: "student1@alpha.test" },
        is_new: false,
      },
      meta: META,
    }),
  ),
  http.post("*/api/v1/auth/logout", () =>
    HttpResponse.json({ data: { signed_out: true }, meta: META }),
  ),
  http.get("*/api/v1/me/memberships", () => HttpResponse.json(ten08)),
  http.get("*/api/v1/c/:slug/me/membership", () => HttpResponse.json(ten02)),
  http.post("*/api/v1/c/:slug/join/invite", () =>
    HttpResponse.json({ data: { membership: ten08.data[0]!.membership }, meta: META }),
  ),

  http.get("*/api/v1/me/profile", () => HttpResponse.json({ data: profile, meta: META })),
  http.patch("*/api/v1/me/profile", async ({ request }) => {
    profile = { ...profile, ...((await request.json()) as object) };
    return HttpResponse.json({ data: profile, meta: META });
  }),
  http.get("*/api/v1/me/skills", () =>
    HttpResponse.json({
      data: { skills: skills.map((s) => ({ ...s, name: "Skill", evidence_url: null })) },
      meta: META,
    }),
  ),
  http.put("*/api/v1/me/skills", async ({ request }) => {
    skills = ((await request.json()) as { skills: typeof skills }).skills;
    return HttpResponse.json({
      data: { skills: skills.map((s) => ({ ...s, name: "Skill", evidence_url: null })) },
      meta: META,
    });
  }),
  http.get("*/api/v1/skills", () => HttpResponse.json(prf03)),
  http.post("*/api/v1/me/avatar", () =>
    HttpResponse.json({ data: { avatar_url: null }, meta: META }),
  ),
];
