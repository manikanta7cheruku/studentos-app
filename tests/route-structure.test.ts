import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

// Structural rules for every API route (R2-D8-1). They read the source files, so a new route that forgets a rule fails here
// before any database is involved. Behaviour is tested by the integration tests and the permission matrix.
const apiRoot = join(__dirname, "..", "src", "app", "api");

function routeFiles(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const full = join(dir, name);
    if (statSync(full).isDirectory()) return routeFiles(full);
    return name === "route.ts" ? [full] : [];
  });
}

const files = routeFiles(apiRoot).map((file) => ({
  file,
  name: file.slice(apiRoot.length).replaceAll("\\", "/"),
  source: readFileSync(file, "utf8"),
}));

// Routes that do not follow the app rules on purpose, with the reason.
const NOT_WRAPPED = new Set(["/health/route.ts", "/ready/route.ts"]); // plain liveness checks, no secrets, no database writes
const NO_ORIGIN_CHECK = new Set(["/internal/maintenance/route.ts"]); // called by the scheduler with a secret, never from a browser

const writeMethods = /export const (POST|PUT|PATCH|DELETE)\b/;

describe("API route structure", () => {
  it("finds the routes", () => {
    expect(files.length).toBeGreaterThan(40);
  });

  it("every route handler goes through route() (one error mapper, no stack traces to the client)", () => {
    const loose = files
      .filter((f) => !NOT_WRAPPED.has(f.name))
      .filter((f) =>
        /export (?:const|async function|function) (GET|POST|PUT|PATCH|DELETE)\b/.test(f.source),
      )
      .filter(
        (f) =>
          !/export const (GET|POST|PUT|PATCH|DELETE) = route[<(]/.test(
            f.source.replace(/\s+/g, " "),
          ),
      )
      .map((f) => f.name);
    expect(loose).toEqual([]);
  });

  it("every route that changes data checks the Origin (CSRF) before doing anything", () => {
    const missing = files
      .filter((f) => writeMethods.test(f.source) && !NO_ORIGIN_CHECK.has(f.name))
      .filter((f) => !/assertSameOrigin\(|write: true/.test(f.source))
      .map((f) => f.name);
    expect(missing).toEqual([]);
  });

  it("no route reads a request body without a size cap (readJson / readBodyCapped only)", () => {
    const raw = files
      .filter((f) => /request\.(json|text|arrayBuffer|formData)\(\)/.test(f.source))
      .map((f) => f.name);
    expect(raw).toEqual([]);
  });

  it("no route uses the service role client directly (only the *.admin.ts modules do)", () => {
    const direct = files.filter((f) => /@\/server\/admin\//.test(f.source)).map((f) => f.name);
    expect(direct).toEqual([]);
  });
});
