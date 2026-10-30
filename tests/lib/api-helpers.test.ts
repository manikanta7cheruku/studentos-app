import { beforeEach, describe, expect, it } from "vitest";
import { z } from "zod";
import { errorEnvelope, errorCodes } from "@/contracts";
import {
  assertSameOrigin,
  bearerToken,
  clientIp,
  failure,
  ok,
  readJson,
  readQuery,
  route,
  toIso,
} from "@/lib/api";
import { resetServerEnvForTests } from "@/lib/env";
import { AppError, rateLimited, toAppError } from "@/lib/errors";
import { hashKey, safeEqual } from "@/lib/hash";

const env = {
  NEXT_PUBLIC_APP_URL: "http://localhost:3000",
  NEXT_PUBLIC_SUPABASE_URL: "http://127.0.0.1:54321",
  NEXT_PUBLIC_SUPABASE_ANON_KEY: "a".repeat(30),
  SUPABASE_SERVICE_ROLE_KEY: "b".repeat(30),
  APP_HASH_SECRET: "c".repeat(40),
};

beforeEach(() => {
  Object.assign(process.env, env);
  resetServerEnvForTests();
});

const post = (body: BodyInit | null, headers: Record<string, string> = {}) =>
  new Request("http://localhost:3000/x", {
    method: "POST",
    headers: { "content-type": "application/json", ...headers },
    body,
  });

describe("AppError", () => {
  it("has an HTTP status for every error code", () => {
    for (const code of errorCodes) {
      const error = new AppError(code);
      expect(error.status).toBeGreaterThanOrEqual(400);
      expect(error.message.length).toBeGreaterThan(0);
    }
  });

  it("turns unknown errors into INTERNAL with a safe message", () => {
    const error = toAppError(new Error("password=hunter2 in SQL"));
    expect(error.code).toBe("INTERNAL");
    expect(error.message).not.toContain("hunter2");
  });

  it("rateLimited gives a Retry-After header of at least 1 second", () => {
    const error = rateLimited(0.2);
    expect(error.headers["Retry-After"]).toBe("1");
    expect(error.status).toBe(429);
  });
});

describe("response helpers", () => {
  it("ok() wraps data in the envelope with a request id and no caching", async () => {
    const response = ok({ a: 1 }, "req_1", { status: 201 });
    expect(response.status).toBe(201);
    expect(response.headers.get("cache-control")).toBe("no-store");
    expect(response.headers.get("x-request-id")).toBe("req_1");
    expect(await response.json()).toEqual({ data: { a: 1 }, meta: { request_id: "req_1" } });
  });

  it("failure() matches the error envelope contract for every code", async () => {
    for (const code of errorCodes) {
      const details =
        code === "VALIDATION_FAILED" ? { fields: [{ path: "x", message: "bad" }] } : undefined;
      const response = failure(new AppError(code, { details }), "req_2");
      expect(errorEnvelope.safeParse(await response.json()).success, code).toBe(true);
    }
  });

  it("route() turns thrown errors into envelopes and never leaks the cause", async () => {
    const handler = route(async () => {
      throw new Error("secret stack detail");
    });
    const response = await handler(new Request("http://localhost:3000/x"));
    const text = await response.text();
    expect(response.status).toBe(500);
    expect(text).not.toContain("secret stack detail");
    expect(JSON.parse(text).error.code).toBe("INTERNAL");
    expect(response.headers.get("x-request-id")).toMatch(/^req_/);
  });

  it("toIso() makes a UTC time with Z", () => {
    expect(toIso("2026-10-31T09:00:00+00:00")).toBe("2026-10-31T09:00:00.000Z");
    expect(toIso(null)).toBeNull();
  });
});

describe("readJson / readQuery", () => {
  const schema = z.strictObject({ name: z.string().min(1) });

  it("accepts good JSON", async () => {
    await expect(readJson(post(JSON.stringify({ name: "a" })), schema)).resolves.toEqual({
      name: "a",
    });
  });

  it("refuses wrong content type, bad JSON, big bodies and wrong shapes with the right codes", async () => {
    const code = async (promise: Promise<unknown>) =>
      ((await promise.catch((e) => e)) as AppError).code;
    expect(await code(readJson(post("{}", { "content-type": "text/plain" }), schema))).toBe(
      "UNSUPPORTED_MEDIA_TYPE",
    );
    expect(await code(readJson(post("{nope"), schema))).toBe("VALIDATION_FAILED");
    expect(await code(readJson(post("x".repeat(101 * 1024)), schema))).toBe("PAYLOAD_TOO_LARGE");
    expect(await code(readJson(post(JSON.stringify({ name: "a", extra: 1 })), schema))).toBe(
      "VALIDATION_FAILED",
    );
    expect(await code(readJson(post("{}", { "content-length": "999999" }), schema))).toBe(
      "PAYLOAD_TOO_LARGE",
    );
  });

  it("refuses unknown query parameters", () => {
    const query = z.strictObject({ all: z.string().optional() });
    expect(readQuery(new Request("http://localhost:3000/x?all=true"), query)).toEqual({
      all: "true",
    });
    expect(() => readQuery(new Request("http://localhost:3000/x?foo=1"), query)).toThrow(AppError);
  });
});

describe("request helpers", () => {
  it("clientIp takes the first forwarded address", () => {
    const request = new Request("http://localhost:3000/x", {
      headers: { "x-forwarded-for": "1.2.3.4, 5.6.7.8" },
    });
    expect(clientIp(request)).toBe("1.2.3.4");
    expect(clientIp(new Request("http://localhost:3000/x"))).toBe("unknown");
  });

  it("bearerToken reads only a Bearer header", () => {
    expect(
      bearerToken(
        new Request("http://localhost:3000/x", { headers: { authorization: "Bearer abc" } }),
      ),
    ).toBe("abc");
    expect(
      bearerToken(
        new Request("http://localhost:3000/x", { headers: { authorization: "Basic abc" } }),
      ),
    ).toBeNull();
  });

  it("assertSameOrigin allows our origin, refuses others, and skips Bearer requests", () => {
    const withOrigin = (origin: string) => post("{}", { origin });
    expect(() => assertSameOrigin(withOrigin("http://localhost:3000"))).not.toThrow();
    expect(() => assertSameOrigin(withOrigin("https://evil.example"))).toThrow(AppError);
    expect(() => assertSameOrigin(withOrigin("not a url"))).toThrow(AppError);
    expect(() => assertSameOrigin(post("{}", { "sec-fetch-site": "cross-site" }))).toThrow(
      AppError,
    );
    expect(() => assertSameOrigin(post("{}", { "sec-fetch-site": "same-origin" }))).not.toThrow();
    expect(() =>
      assertSameOrigin(post("{}", { origin: "https://evil.example", authorization: "Bearer t" })),
    ).not.toThrow();
    expect(() => assertSameOrigin(post("{}"))).not.toThrow();
  });
});

describe("hashKey", () => {
  it("is stable, depends on the kind, and never contains the input", () => {
    expect(hashKey("email", "a@b.test")).toBe(hashKey("email", "a@b.test"));
    expect(hashKey("email", "a@b.test")).not.toBe(hashKey("ip", "a@b.test"));
    expect(hashKey("email", "a@b.test")).not.toContain("a@b.test");
    expect(hashKey("email", "a@b.test")).toMatch(/^[0-9a-f]{64}$/);
  });

  it("changes with the secret and refuses to run without one", () => {
    const before = hashKey("email", "x");
    process.env.APP_HASH_SECRET = "d".repeat(40);
    resetServerEnvForTests();
    expect(hashKey("email", "x")).not.toBe(before);
    process.env.APP_HASH_SECRET = "short";
    resetServerEnvForTests();
    expect(() => hashKey("email", "x")).toThrow(/APP_HASH_SECRET/);
  });

  it("safeEqual compares strings", () => {
    expect(safeEqual("abc", "abc")).toBe(true);
    expect(safeEqual("abc", "abd")).toBe(false);
    expect(safeEqual("abc", "abcd")).toBe(false);
  });
});
