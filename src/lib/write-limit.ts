import { hashKey } from "./hash";
import { consumeOrThrow } from "@/modules/rate-limit/rate-limit.admin";

// docs/API_CONTRACT.md section 1: writes are limited to 60 a minute per person (admin endpoints have their own 120).
export const WRITE_LIMIT = { limit: 60, windowSeconds: 60 } as const;

export async function limitWrites(userId: string): Promise<void> {
  await consumeOrThrow(
    "write_user",
    hashKey("user", userId),
    WRITE_LIMIT.limit,
    WRITE_LIMIT.windowSeconds,
  );
}
