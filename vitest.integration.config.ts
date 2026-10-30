import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

// Integration tests talk to the LOCAL Supabase stack (pnpm db:start). Run: pnpm test:integration
// They are not part of `pnpm verify` yet. R5 adds them to CI with a Supabase service.
export default defineConfig({
  resolve: {
    alias: { "@": fileURLToPath(new URL("./src", import.meta.url)) },
  },
  test: {
    environment: "node",
    include: ["tests/integration/**/*.test.ts"],
    setupFiles: ["tests/integration/setup.ts"],
    testTimeout: 30_000,
    hookTimeout: 30_000,
    fileParallelism: false,
  },
});
