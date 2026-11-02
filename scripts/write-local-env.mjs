// Writes .env.local from the running LOCAL Supabase stack (pnpm db:start), so nobody copies keys by hand.
// Usage: pnpm env:local            (refuses to overwrite an existing .env.local)
//        pnpm env:local -- --force (overwrites it)
// The keys are the well known demo keys of the local stack. APP_HASH_SECRET is random and stays on this PC.
import { spawnSync } from "node:child_process";
import { randomBytes } from "node:crypto";
import { existsSync, writeFileSync } from "node:fs";

const force = process.argv.includes("--force");
if (existsSync(".env.local") && !force) {
  console.error(".env.local already exists. Use `pnpm env:local -- --force` to replace it.");
  process.exit(1);
}

const status = spawnSync("pnpm supabase status -o env", { encoding: "utf8", shell: true });
if (status.status !== 0) {
  console.error(
    "Could not read the local Supabase status. Is Docker running and `pnpm db:start` done?",
  );
  process.exit(1);
}

const values = {};
for (const line of status.stdout.split(/\r?\n/)) {
  const index = line.indexOf("=");
  if (index > 0) values[line.slice(0, index)] = line.slice(index + 1).replace(/^"|"$/g, "");
}

const pick = (...names) => names.map((name) => values[name]).find(Boolean);
const url = values.API_URL;
const anon = pick("ANON_KEY", "PUBLISHABLE_KEY");
const service = pick("SERVICE_ROLE_KEY", "SECRET_KEY");
if (!url || !anon || !service) {
  console.error(
    "The status output has no API_URL or keys. Update the Supabase CLI (pnpm install).",
  );
  process.exit(1);
}

const lines = [
  "NEXT_PUBLIC_APP_URL=http://localhost:3000",
  `NEXT_PUBLIC_SUPABASE_URL=${url}`,
  `NEXT_PUBLIC_SUPABASE_ANON_KEY=${anon}`,
  `SUPABASE_SERVICE_ROLE_KEY=${service}`,
  `APP_HASH_SECRET=${randomBytes(32).toString("hex")}`,
  `MAILPIT_URL=${values.MAILPIT_URL ?? values.INBUCKET_URL ?? "http://127.0.0.1:54324"}`,
];
writeFileSync(".env.local", `${lines.join("\n")}\n`);
console.log("Wrote .env.local with:", lines.map((line) => line.split("=")[0]).join(", "));
