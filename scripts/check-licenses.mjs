// Licence check for every installed dependency. Rules: docs/LICENSING.md section 4.3.
//   node scripts/check-licenses.mjs            fails on a forbidden licence, lists pending exceptions as warnings
//   node scripts/check-licenses.mjs --strict   also fails while any exception is still pending (release gate)
// Options for tests and demos: --allow <file>, --exceptions <file>, --from <pnpm licenses json file>.
import { execSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { checkPackages, exceptionProblems, flattenPnpm } from "./licence-lib.mjs";

const root = fileURLToPath(new URL("..", import.meta.url));
const args = process.argv.slice(2);
const option = (name) => {
  const index = args.indexOf(name);
  return index >= 0 ? args[index + 1] : undefined;
};
const strict = args.includes("--strict");
const readJson = (file) => JSON.parse(readFileSync(file, "utf8"));
const pnpmList = (flag) =>
  JSON.parse(
    execSync(`pnpm licenses list ${flag} --json`, {
      cwd: root,
      encoding: "utf8",
      maxBuffer: 1 << 28,
      stdio: ["ignore", "pipe", "pipe"],
    }),
  );

const allowed = readJson(option("--allow") ?? join(root, "licenses.allow.json")).allowed;
const exceptions = readJson(
  option("--exceptions") ?? join(root, "licenses.exceptions.json"),
).exceptions;
const from = option("--from");
const packages = flattenPnpm(from ? readJson(from) : pnpmList(""));
const production = new Set(from ? [] : flattenPnpm(pnpmList("--prod")).map((pkg) => pkg.name));
const scope = (name) => (from ? "package" : production.has(name) ? "production" : "development");
const label = (pkg) => `${pkg.name}@${pkg.version} (${pkg.license}, ${scope(pkg.name)})`;

const problems = exceptionProblems(exceptions);
const result = checkPackages(packages, allowed, exceptions);
const licences = new Set(packages.map((pkg) => pkg.license));
console.log(
  `Licence check: ${packages.length} package versions, ${licences.size} different licences.`,
);
console.log(
  `Allowed by the list: ${packages.length - result.failed.length - result.pending.length - result.approved.length}`,
);
console.log(`Approved exceptions: ${result.approved.length}`);
console.log(`Pending exceptions (proposals, not approved): ${result.pending.length}`);
for (const { pkg } of result.pending) console.log(`  PENDING ${label(pkg)}`);
console.log(`Exception entries that match nothing on this machine: ${result.unused.length}`);
for (const problem of problems) console.log(`  PROBLEM ${problem}`);
for (const pkg of result.failed) console.log(`  FORBIDDEN ${label(pkg)}`);

let failed = false;
if (result.failed.length > 0) {
  console.log(
    `FAIL: ${result.failed.length} package(s) have a licence that is not allowed and has no exception.`,
  );
  failed = true;
}
if (problems.length > 0) {
  console.log("FAIL: licenses.exceptions.json has problems (see above).");
  failed = true;
}
if (strict && result.pending.length > 0) {
  console.log(
    "FAIL (strict): exceptions are still pending. R2 or the admin must approve or remove them.",
  );
  failed = true;
}
if (!failed) console.log("PASS");
process.exit(failed ? 1 : 0);
