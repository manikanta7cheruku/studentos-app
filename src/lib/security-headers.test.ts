import { describe, expect, it } from "vitest";
import nextConfig, { contentSecurityPolicy, securityHeaders } from "../../next.config";

// R2-D4-2: the headers every response carries. A change that drops one fails here.
describe("security headers (next.config.ts)", () => {
  const byKey = Object.fromEntries(securityHeaders.map((h) => [h.key, h.value]));

  it("are sent for every path", async () => {
    const rules = await nextConfig.headers!();
    expect(rules).toHaveLength(1);
    expect(rules[0]?.source).toBe("/:path*");
    expect(rules[0]?.headers).toEqual(securityHeaders);
  });

  it("set the basic protections", () => {
    expect(byKey["X-Content-Type-Options"]).toBe("nosniff");
    expect(byKey["X-Frame-Options"]).toBe("DENY");
    expect(byKey["Referrer-Policy"]).toBe("strict-origin-when-cross-origin");
    expect(byKey["Cross-Origin-Opener-Policy"]).toBe("same-origin");
    expect(byKey["Cross-Origin-Resource-Policy"]).toBe("same-origin");
    expect(byKey["Permissions-Policy"]).toContain("camera=()");
  });

  it("have a CSP that allows only our own origin, no plugins and no framing", () => {
    for (const part of [
      "default-src 'self'",
      "object-src 'none'",
      "base-uri 'self'",
      "form-action 'self'",
      "frame-ancestors 'none'",
    ]) {
      expect(contentSecurityPolicy).toContain(part);
    }
    expect(contentSecurityPolicy).not.toMatch(/\*|http:\/\/(?!localhost|127\.0\.0\.1)/);
    expect(byKey["Content-Security-Policy"]).toBe(contentSecurityPolicy);
  });

  it("hide the framework name", () => {
    expect(nextConfig.poweredByHeader).toBe(false);
  });
});
