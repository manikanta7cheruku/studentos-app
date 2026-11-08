import { readdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { buildOpenApi } from "./openapi";
import { endpoints } from "./registry";

// Keeps the docs honest (R2-D9-1): the registry, the route files, docs/PERMISSIONS.md, docs/API_CONTRACT.md
// and docs/openapi.v1.json must all say the same thing.
const root = join(__dirname, "..", "..");
const apiRoot = join(root, "src", "app", "api");
const read = (path: string) => readFileSync(join(root, path), "utf8");

function routeFiles(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const full = join(dir, name);
    if (statSync(full).isDirectory()) return routeFiles(full);
    return name === "route.ts" ? [full] : [];
  });
}

const routePath = (file: string) =>
  file
    .slice(apiRoot.length)
    .replaceAll("\\", "/")
    .replace(/\/route\.ts$/, "")
    .replace(/\[(\w+)\]/g, "{$1}");

const fromCode = routeFiles(apiRoot)
  .flatMap((file) => {
    const path = routePath(file);
    const source = readFileSync(file, "utf8");
    return [
      ...source.matchAll(/export (?:async )?(?:function|const) (GET|POST|PUT|PATCH|DELETE)\b/g),
    ].map((m) => `${m[1]} ${path.startsWith("/v1/") ? path.slice(3) : `/api${path}`}`);
  })
  .sort();

const permissionRows = [
  ...read("docs/PERMISSIONS.md").matchAll(
    /^\| ([A-Z]+-\d+) \| (GET|POST|PUT|PATCH|DELETE) \| (\S+) \| (\w+)/gm,
  ),
].map((m) => ({ id: m[1]!, method: m[2]!, path: m[3]!, who: m[4]! }));

describe("the endpoint registry matches the code and the docs", () => {
  it("lists exactly the route methods that exist", () => {
    expect(endpoints.map((x) => `${x.method} ${x.path}`).sort()).toEqual(fromCode);
  });

  it("agrees with docs/PERMISSIONS.md on id, method, path and who", () => {
    const registry = endpoints.map((x) => `${x.id} ${x.method} ${x.path} ${x.who}`).sort();
    const table = permissionRows.map((x) => `${x.id} ${x.method} ${x.path} ${x.who}`).sort();
    expect(registry).toEqual(table);
  });

  it("every endpoint id is described in docs/API_CONTRACT.md", () => {
    const contract = read("docs/API_CONTRACT.md");
    const missing = [...new Set(endpoints.map((x) => x.id))].filter((id) => !contract.includes(id));
    expect(missing).toEqual([]);
  });

  it("the endpoints that need an Idempotency-Key are marked in the registry", () => {
    const fromRoutes = routeFiles(apiRoot)
      .filter((file) => readFileSync(file, "utf8").includes("readIdempotencyKey("))
      .map((file) => routePath(file).replace(/^\/v1/, ""))
      .sort();
    const fromRegistry = [...new Set(endpoints.filter((x) => x.idem).map((x) => x.path))].sort();
    expect(fromRegistry).toEqual([...new Set(fromRoutes)].sort());
  });
});

describe("docs/openapi.v1.json is generated from the contracts", () => {
  const generated = `${JSON.stringify(buildOpenApi(), null, 2)}\n`;

  it("is up to date (run pnpm docs:openapi after a contract change)", () => {
    if (process.env.UPDATE_OPENAPI === "1") {
      writeFileSync(join(root, "docs", "openapi.v1.json"), generated);
    }
    expect(read("docs/openapi.v1.json")).toBe(generated);
  });

  it("has an operation for every endpoint", () => {
    const spec = buildOpenApi() as { paths: Record<string, Record<string, unknown>> };
    const operations = Object.values(spec.paths).flatMap((p) => Object.keys(p));
    expect(operations).toHaveLength(endpoints.length);
  });
});
