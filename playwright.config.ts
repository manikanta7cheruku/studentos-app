import { existsSync } from "node:fs";
import { defineConfig, devices } from "@playwright/test";

// Browser and API journey tests. Run: pnpm test:e2e
// Needs the local stack (pnpm db:start, pnpm db:reset) and .env.local (pnpm env:local).
// Locally it starts `pnpm dev` (or reuses a server that is already running). In CI it serves the production build.
if (existsSync(".env.local")) process.loadEnvFile(".env.local");

const port = Number(process.env.E2E_PORT ?? 3000);
const baseURL = process.env.E2E_BASE_URL ?? `http://localhost:${port}`;
const useExistingSite = Boolean(process.env.E2E_BASE_URL);

export default defineConfig({
  testDir: "e2e",
  // Tests share one database and one mailbox, so they run one after the other.
  fullyParallel: false,
  workers: 1,
  retries: process.env.CI ? 1 : 0,
  timeout: 60_000,
  expect: { timeout: 10_000 },
  reporter: process.env.CI ? [["list"], ["html", { open: "never" }]] : [["list"]],
  use: {
    baseURL,
    // The first-open product tour would sit over every page: tests start as people who have seen it.
    storageState: {
      cookies: [],
      origins: [{ origin: baseURL, localStorage: [{ name: "studentos.tour.v1", value: "done" }] }],
    },
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
  },
  projects: [
    { name: "api", testMatch: /.*\.api\.spec\.ts/ },
    { name: "chromium", testMatch: /.*\.ui\.spec\.ts/, use: { ...devices["Desktop Chrome"] } },
    { name: "phone", testMatch: /.*\.ui\.spec\.ts/, use: { ...devices["Pixel 7"] } },
  ],
  webServer: useExistingSite
    ? undefined
    : {
        command: process.env.CI ? `pnpm start -p ${port}` : `pnpm dev -p ${port}`,
        url: baseURL,
        reuseExistingServer: !process.env.CI,
        timeout: 120_000,
      },
});
