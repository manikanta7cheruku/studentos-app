// Rewrites docs/openapi.v1.json from the contracts (src/contracts/registry.ts). Run after changing a contract.
import { spawnSync } from "node:child_process";

const result = spawnSync(
  process.execPath,
  ["node_modules/vitest/vitest.mjs", "run", "src/contracts/registry.test.ts"],
  { stdio: "inherit", env: { ...process.env, UPDATE_OPENAPI: "1" } },
);
process.exit(result.status ?? 1);
