import { beforeEach, describe, expect, it } from "vitest";
import { GET as health } from "@/app/api/health/route";
import { GET as ready } from "@/app/api/ready/route";
import { resetServerEnvForTests } from "@/lib/env";
import { checkEnvAtStartup, shouldCheckEnvAtStartup } from "@/lib/startup-check";

const complete = {
  NEXT_PUBLIC_APP_URL: "https://staging.example.test",
  NEXT_PUBLIC_SUPABASE_URL: "https://abcdefgh.supabase.co",
  NEXT_PUBLIC_SUPABASE_ANON_KEY: "a".repeat(30),
  SUPABASE_SERVICE_ROLE_KEY: "b".repeat(30),
  APP_HASH_SECRET: "c".repeat(40),
};

describe("startup check", () => {
  it("only runs in production mode, and not during next build", () => {
    expect(shouldCheckEnvAtStartup({ NODE_ENV: "production" })).toBe(true);
    expect(shouldCheckEnvAtStartup({ NODE_ENV: "development" })).toBe(false);
    expect(shouldCheckEnvAtStartup({ NODE_ENV: "test" })).toBe(false);
    expect(
      shouldCheckEnvAtStartup({ NODE_ENV: "production", NEXT_PHASE: "phase-production-build" }),
    ).toBe(false);
    expect(
      shouldCheckEnvAtStartup({ NODE_ENV: "production", NEXT_PHASE: "phase-production-server" }),
    ).toBe(true);
  });

  it("refuses to start in production when a variable is missing, and names it", () => {
    for (const name of Object.keys(complete)) {
      const env: Record<string, string | undefined> = { ...complete, NODE_ENV: "production" };
      delete env[name];
      expect(() => checkEnvAtStartup(env), name).toThrow(new RegExp(name));
    }
  });

  it("refuses a weak hash secret or a service key that is too short, without printing the value", () => {
    const weak = { ...complete, NODE_ENV: "production", APP_HASH_SECRET: "short-secret-value" };
    expect(() => checkEnvAtStartup(weak)).toThrow(/APP_HASH_SECRET/);
    try {
      checkEnvAtStartup(weak);
    } catch (error) {
      expect(String(error)).not.toContain("short-secret-value");
    }
  });

  it("starts when everything is set, and does not check in development", () => {
    expect(() => checkEnvAtStartup({ ...complete, NODE_ENV: "production" })).not.toThrow();
    expect(() => checkEnvAtStartup({ NODE_ENV: "development" })).not.toThrow();
  });
});

describe("health and ready", () => {
  beforeEach(() => {
    for (const name of Object.keys(complete)) delete process.env[name];
    resetServerEnvForTests();
  });

  it("/api/health answers without any setting or database", async () => {
    const response = health(new Request("http://localhost:3000/api/health"));
    expect(response.status).toBe(200);
    expect((await response.json()).status).toBe("ok");
    expect(response.headers.get("cache-control")).toBe("no-store");
    expect(response.headers.get("x-request-id")).toMatch(/^req_/);
  });

  it("/api/ready is 503 when the app cannot reach its database, and says nothing about why", async () => {
    const response = await ready(new Request("http://localhost:3000/api/ready"));
    expect(response.status).toBe(503);
    const text = JSON.stringify(await response.json());
    expect(text).toBe('{"status":"unavailable"}');
  });
});
