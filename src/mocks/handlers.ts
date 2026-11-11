import { http, HttpResponse } from "msw";
import ten01Fixture from "@/contracts/fixtures/ten-01.success.json";
import { sampleColleges } from "@/features/tenancy";
import { day4And5Handlers } from "./handlers-day4-5";
import { day7Handlers } from "./handlers-day7";
import { appHandlers } from "./handlers-app";
import { communityHandlers } from "./handlers-community";
import { ideaHandlers } from "./handlers-ideas";

export const handlers = [
  ...day4And5Handlers,
  ...day7Handlers,
  ...appHandlers,
  ...ideaHandlers,
  ...communityHandlers,
  // TEN-01: GET /api/v1/colleges/public/:slug
  http.get("*/api/v1/colleges/public/:slug", ({ params }) => {
    const rawSlug = params.slug;
    const slug = Array.isArray(rawSlug) ? rawSlug[0] : rawSlug;

    if (!slug) {
      return HttpResponse.json(
        {
          error: {
            code: "VALIDATION_FAILED",
            message: "Slug parameter is required",
            request_id: "req_mock_missing_slug",
          },
        },
        { status: 400 },
      );
    }

    const matchedSample = sampleColleges[slug];
    if (matchedSample) {
      return HttpResponse.json({
        data: matchedSample,
        meta: {
          request_id: `req_mock_${slug}`,
        },
      });
    }

    if (slug === "alpha") {
      return HttpResponse.json({
        data: {
          ...ten01Fixture.data,
          modules: { campus: true, collaborate: true, career: true },
        },
        meta: ten01Fixture.meta,
      });
    }

    return HttpResponse.json(
      {
        error: {
          code: "NOT_FOUND",
          message: `College with slug '${slug}' was not found.`,
          request_id: `req_mock_not_found_${slug}`,
        },
      },
      { status: 404 },
    );
  }),
];
