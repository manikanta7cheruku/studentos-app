import { http, HttpResponse } from "msw";
import ten01Fixture from "@/contracts/fixtures/ten-01.success.json";
import { sampleColleges } from "@/features/tenancy";
import { sampleOpportunities } from "@/features/opportunities/sample-data";

const ALLOWED_OPPORTUNITY_PARAMS = new Set([
  "kind",
  "skills",
  "mode",
  "location",
  "deadline",
  "limit",
  "cursor",
]);

export const mockSavedOpportunities = new Set<string>(
  sampleOpportunities.filter((o) => o.saved).map((o) => o.id),
);
export const mockTrackedApplications = new Set<string>();

export const handlers = [
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

  // OPP-01: GET /api/v1/c/:slug/opportunities
  http.get("*/api/v1/c/:slug/opportunities", ({ request }) => {
    const url = new URL(request.url);

    // UNKNOWN QUERY PARAMS RETURN 400 VALIDATION_FAILED
    for (const key of url.searchParams.keys()) {
      if (!ALLOWED_OPPORTUNITY_PARAMS.has(key)) {
        return HttpResponse.json(
          {
            error: {
              code: "VALIDATION_FAILED",
              message: `Unknown query parameter: ${key}`,
              request_id: "req_mock_validation_failed",
            },
          },
          { status: 400 },
        );
      }
    }

    let filtered = [...sampleOpportunities];

    // Filter by kind (comma-separated or single)
    const kindParam = url.searchParams.get("kind");
    if (kindParam) {
      const kinds = kindParam.split(",").map((k) => k.trim());
      filtered = filtered.filter((opp) => kinds.includes(opp.kind));
    }

    // Filter by skills (comma-separated, match any)
    const skillsParam = url.searchParams.get("skills");
    if (skillsParam) {
      const requestedSkills = skillsParam
        .split(",")
        .map((s) => s.trim().toLowerCase())
        .filter(Boolean);
      if (requestedSkills.length > 0) {
        filtered = filtered.filter((opp) =>
          opp.skills?.some((s) => requestedSkills.includes(s.toLowerCase())),
        );
      }
    }

    // Filter by mode
    const modeParam = url.searchParams.get("mode");
    if (modeParam && modeParam !== "all") {
      filtered = filtered.filter((opp) => opp.mode === modeParam);
    }

    // Filter by location
    const locationParam = url.searchParams.get("location");
    if (locationParam && locationParam.trim()) {
      const term = locationParam.trim().toLowerCase();
      filtered = filtered.filter((opp) => opp.location.toLowerCase().includes(term));
    }

    // Filter by deadline
    const deadlineParam = url.searchParams.get("deadline");
    if (deadlineParam && deadlineParam !== "any") {
      const now = new Date();
      filtered = filtered.filter((opp) => {
        // Deadline-less items stay visible unless "hide closed" excludes them
        // Items without a deadline remain visible across all filter options
        if (!opp.deadline) {
          return true;
        }
        const deadlineDate = new Date(opp.deadline);
        const diffDays = Math.ceil(
          (deadlineDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24),
        );

        if (deadlineParam === "7d") {
          return diffDays >= 0 && diffDays <= 7;
        }
        if (deadlineParam === "30d") {
          return diffDays >= 0 && diffDays <= 30;
        }
        if (deadlineParam === "hide_closed") {
          return diffDays >= 0;
        }
        return true;
      });
    }

    // Pagination limit & cursor
    const limitParam = url.searchParams.get("limit");
    const limit = Math.min(Math.max(parseInt(limitParam || "20", 10), 1), 50);
    const cursorParam = url.searchParams.get("cursor");

    let startIndex = 0;
    if (cursorParam) {
      const idx = filtered.findIndex((opp) => opp.id === cursorParam);
      if (idx !== -1) {
        startIndex = idx + 1;
      }
    }

    const sliced = filtered.slice(startIndex, startIndex + limit);
    const hasMore = startIndex + limit < filtered.length;
    const nextCursor = hasMore && sliced.length > 0 ? sliced[sliced.length - 1]!.id : null;

    const data = sliced.map((opp) => ({
      ...opp,
      saved: mockSavedOpportunities.has(opp.id),
      in_tracker: mockTrackedApplications.has(opp.id),
    }));

    return HttpResponse.json({
      data,
      meta: {
        request_id: "req_mock_opp_list",
        next_cursor: nextCursor,
      },
    });
  }),

  // OPP-04: PUT /api/v1/me/saved-opportunities/:id
  http.put("*/api/v1/me/saved-opportunities/:id", ({ params }) => {
    const rawId = params.id;
    const id = Array.isArray(rawId) ? rawId[0] : rawId;
    mockSavedOpportunities.add(id);
    return HttpResponse.json({
      data: { saved: true, opportunity_id: id },
      meta: { request_id: `req_mock_saved_${id}` },
    });
  }),

  // OPP-04: DELETE /api/v1/me/saved-opportunities/:id
  http.delete("*/api/v1/me/saved-opportunities/:id", ({ params }) => {
    const rawId = params.id;
    const id = Array.isArray(rawId) ? rawId[0] : rawId;
    mockSavedOpportunities.delete(id);
    return HttpResponse.json({
      data: { saved: false, opportunity_id: id },
      meta: { request_id: `req_mock_unsaved_${id}` },
    });
  }),

  // APP-01: POST /api/v1/me/applications
  http.post("*/api/v1/me/applications", async ({ request }) => {
    const body = (await request.json()) as {
      company: string;
      role_title: string;
      source_url: string;
      deadline?: string | null;
      opportunity_id?: string | null;
      status?: string;
      notes?: string;
    };

    if (body.opportunity_id) {
      if (
        mockTrackedApplications.has(body.opportunity_id) ||
        body.opportunity_id === "opp-duplicate"
      ) {
        return HttpResponse.json(
          {
            error: {
              code: "CONFLICT",
              message: "An application already exists for this opportunity",
              request_id: "req_mock_app_conflict",
            },
          },
          { status: 409 },
        );
      }
      mockTrackedApplications.add(body.opportunity_id);
    }

    return HttpResponse.json(
      {
        data: {
          id: `app_${Math.random().toString(36).substring(2, 9)}`,
          company: body.company,
          role_title: body.role_title,
          source_url: body.source_url,
          deadline: body.deadline ?? null,
          opportunity_id: body.opportunity_id ?? null,
          status: body.status ?? "saved",
          version: 1,
          created_at: new Date().toISOString(),
        },
        meta: { request_id: "req_mock_app_created" },
      },
      { status: 201 },
    );
  }),
];
