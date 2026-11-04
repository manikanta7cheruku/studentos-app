import { afterEach, describe, expect, it, vi } from "vitest";
import { z } from "zod";
import { apiClient, apiFetchEnvelope, ApiError } from "@/lib/api-client";

describe("apiClient", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("success answer returns typed data", async () => {
    const mockCollege = {
      slug: "alpha",
      name: "Alpha College",
      short_name: "Alpha",
      accent_hex: "#1D4ED8",
      logo_url: null,
      modules: { campus: true, collaborate: true, career: true },
    };

    const mockResponse = {
      data: mockCollege,
      meta: { request_id: "req_test_123" },
    };

    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(
      new Response(JSON.stringify(mockResponse), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }),
    );

    const data = await apiClient<typeof mockCollege>("/colleges/public/alpha");
    expect(data).toEqual(mockCollege);
    expect(data.name).toBe("Alpha College");
    expect(data.modules.campus).toBe(true);

    // Also test with schema validation
    const schema = z.object({
      slug: z.string(),
      name: z.string(),
      modules: z.object({
        campus: z.boolean(),
        collaborate: z.boolean(),
        career: z.boolean(),
      }),
    });

    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(
      new Response(JSON.stringify(mockResponse), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }),
    );

    const validatedData = await apiClient("/colleges/public/alpha", { schema });
    expect(validatedData.slug).toBe("alpha");

    // Also test apiFetchEnvelope returns full envelope
    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(
      new Response(JSON.stringify(mockResponse), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }),
    );

    const envelope = await apiFetchEnvelope<typeof mockCollege>("/colleges/public/alpha");
    expect(envelope.data).toEqual(mockCollege);
    expect(envelope.meta.request_id).toBe("req_test_123");
  });

  it("error envelope becomes ApiError with the right code", async () => {
    const errorPayload = {
      error: {
        code: "FORBIDDEN",
        message: "You do not have permission to perform this action.",
        request_id: "req_err_456",
        details: { required_role: "college_admin" },
      },
    };

    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(
      new Response(JSON.stringify(errorPayload), {
        status: 403,
        headers: {
          "Content-Type": "application/json",
          "X-Request-Id": "req_err_456",
        },
      }),
    );

    let thrownError: unknown;
    try {
      await apiClient("/c/alpha/admin/settings");
    } catch (err) {
      thrownError = err;
    }

    expect(thrownError).toBeInstanceOf(ApiError);
    const apiError = thrownError as ApiError;
    expect(apiError.code).toBe("FORBIDDEN");
    expect(apiError.message).toBe("You do not have permission to perform this action.");
    expect(apiError.status).toBe(403);
    expect(apiError.requestId).toBe("req_err_456");
    expect(apiError.details).toEqual({ required_role: "college_admin" });

    // Test another error code: NOT_FOUND
    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(
      new Response(
        JSON.stringify({
          error: {
            code: "NOT_FOUND",
            message: "We could not find that item.",
            request_id: "req_not_found",
          },
        }),
        {
          status: 404,
          headers: { "Content-Type": "application/json" },
        },
      ),
    );

    await expect(apiClient("/colleges/public/unknown")).rejects.toMatchObject({
      code: "NOT_FOUND",
      status: 404,
      requestId: "req_not_found",
    });
  });

  it("non-JSON / network failure becomes ApiError", async () => {
    // 1. Non-JSON failure (e.g. 502 Bad Gateway HTML)
    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(
      new Response("<html><body>502 Bad Gateway</body></html>", {
        status: 502,
        statusText: "Bad Gateway",
        headers: {
          "Content-Type": "text/html",
          "X-Request-Id": "req_proxy_502",
        },
      }),
    );

    let htmlError: unknown;
    try {
      await apiClient("/colleges/public/alpha");
    } catch (err) {
      htmlError = err;
    }

    expect(htmlError).toBeInstanceOf(ApiError);
    const parsedHtmlError = htmlError as ApiError;
    expect(parsedHtmlError.code).toBe("INTERNAL");
    expect(parsedHtmlError.status).toBe(502);
    expect(parsedHtmlError.message).toContain("Failed to parse response JSON");
    expect(parsedHtmlError.requestId).toBe("req_proxy_502");

    // 2. Network failure (e.g. offline, connection refused, DNS error)
    vi.spyOn(globalThis, "fetch").mockRejectedValueOnce(
      new TypeError("Failed to fetch (connection refused)"),
    );

    let networkError: unknown;
    try {
      await apiClient("/colleges/public/alpha");
    } catch (err) {
      networkError = err;
    }

    expect(networkError).toBeInstanceOf(ApiError);
    const parsedNetError = networkError as ApiError;
    expect(parsedNetError.code).toBe("UPSTREAM_UNAVAILABLE");
    expect(parsedNetError.status).toBe(503);
    expect(parsedNetError.message).toBe("Failed to fetch (connection refused)");
  });
});
