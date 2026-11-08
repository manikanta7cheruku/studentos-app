import { afterEach, describe, expect, it, vi } from "vitest";
import { ApiError, apiClient, friendlyMessage, newIdempotencyKey } from "@/lib/api-client";

const failure = (status: number, code: string, headers: Record<string, string> = {}) =>
  new Response(JSON.stringify({ error: { code, message: "server words", request_id: "req_1" } }), {
    status,
    headers: { "Content-Type": "application/json", ...headers },
  });

afterEach(() => vi.restoreAllMocks());

describe("ApiError helpers", () => {
  it("knows a signed out answer", () => {
    expect(new ApiError({ code: "UNAUTHENTICATED", message: "x", status: 401 }).isSignedOut).toBe(
      true,
    );
    expect(new ApiError({ code: "FORBIDDEN", message: "x", status: 403 }).isSignedOut).toBe(false);
  });

  it("knows when the server could not be reached", () => {
    expect(
      new ApiError({ code: "UPSTREAM_UNAVAILABLE", message: "x", status: 503 }).isOffline,
    ).toBe(true);
  });

  it("turns field details into a map by field name", () => {
    const error = new ApiError({
      code: "VALIDATION_FAILED",
      message: "x",
      status: 400,
      details: { fields: [{ path: "handle", message: "Too short" }] },
    });
    expect(error.fieldErrors).toEqual({ handle: "Too short" });
  });
});

describe("request details", () => {
  it("keeps the wait time of a rate limited answer", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(
      failure(429, "RATE_LIMITED", { "Retry-After": "12" }),
    );
    const error = await apiClient("/me/profile").catch((caught: unknown) => caught);
    expect(error).toBeInstanceOf(ApiError);
    expect((error as ApiError).retryAfter).toBe(12);
    expect(friendlyMessage(error)).toContain("12 seconds");
  });

  it("sends a fresh Idempotency-Key on calls that need one, and the given key on a retry", async () => {
    const spy = vi.spyOn(globalThis, "fetch").mockImplementation(
      async () =>
        new Response(JSON.stringify({ data: {}, meta: { request_id: "r" } }), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        }),
    );
    await apiClient("/c/alpha/join/invite", {
      method: "POST",
      body: { code: "A" },
      idempotent: true,
    });
    await apiClient("/c/alpha/join/invite", {
      method: "POST",
      body: { code: "A" },
      idempotent: "my-key",
    });
    const keyOf = (index: number) =>
      new Headers((spy.mock.calls[index]![1] as RequestInit).headers).get("Idempotency-Key");
    expect(keyOf(0)).toMatch(/^[0-9a-f-]{36}$/);
    expect(keyOf(1)).toBe("my-key");
  });
});

describe("friendlyMessage", () => {
  it("explains invite problems in plain words", () => {
    const make = (code: string) => new ApiError({ code, message: "raw", status: 400 });
    expect(friendlyMessage(make("INVITE_EXPIRED"))).toMatch(/expired/i);
    expect(friendlyMessage(make("INVITE_EXHAUSTED"))).toMatch(/used up/i);
    expect(friendlyMessage(make("INVITE_INVALID"))).toMatch(/not right/i);
  });

  it("uses the fallback for errors that are not API errors", () => {
    expect(friendlyMessage(new Error("x"), "Try again")).toBe("Try again");
  });
});

describe("newIdempotencyKey", () => {
  it("gives a different key every time", () => {
    expect(newIdempotencyKey()).not.toBe(newIdempotencyKey());
  });
});
