import { parseServerEnv } from "./env";

// The app must refuse to start when a needed setting is missing (docs/CI_CD_AND_ENVIRONMENTS.md section 4).
// It only does so when the server really runs in production mode (staging and production).
// Not in `next build` (CI builds without secrets) and not in `pnpm dev` (R3 and R4 work with sample data).
export function shouldCheckEnvAtStartup(env: Record<string, string | undefined>): boolean {
  return env.NODE_ENV === "production" && env.NEXT_PHASE !== "phase-production-build";
}

// Throws an error that names the missing variables (never their values).
export function checkEnvAtStartup(env: Record<string, string | undefined> = process.env): void {
  if (shouldCheckEnvAtStartup(env)) parseServerEnv(env);
}
