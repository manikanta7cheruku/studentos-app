import { existsSync } from "node:fs";

// Load .env.local (written from `pnpm supabase status -o env`, see docs/DEV_SETUP.md).
if (existsSync(".env.local")) process.loadEnvFile(".env.local");

const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
let host = "";
try {
  host = new URL(url).hostname;
} catch {
  host = "";
}
// These tests delete rows and use the service role. Never let them near a real project.
if (!["127.0.0.1", "localhost", "[::1]"].includes(host)) {
  throw new Error(
    "Integration tests only run against the local Supabase stack. Start it with `pnpm db:start` and set NEXT_PUBLIC_SUPABASE_URL to http://127.0.0.1:54321 in .env.local.",
  );
}
