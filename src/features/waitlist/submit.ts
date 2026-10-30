import { type z } from "zod";
import { waitlistBody, type waitlistResponse } from "@/contracts/engagement";

export type WaitlistInput = z.infer<typeof waitlistBody>;
export type WaitlistSuccess = z.infer<typeof waitlistResponse>;

// In-memory set for simulating idempotent lead storage across email + college
const submittedLeads = new Set<string>();

/**
 * Reset helper for testing idempotency and duplicate submissions.
 */
export function resetWaitlistStore(): void {
  submittedLeads.clear();
}

/**
 * Stand-in submission function for waitlist leads (WL-01).
 *
 * Validates against the strict API contract schema and deduplicates
 * by (contact_email + college_name) in memory without calling real endpoints.
 *
 * TODO: WL-01 POST /api/v1/waitlist - swap this stand-in for the real API client when R2 merges the route.
 */
export async function submitWaitlist(input: WaitlistInput): Promise<WaitlistSuccess> {
  // 1. Validate payload against the strict Zod schema from src/contracts
  const validated = waitlistBody.parse(input);

  // 2. Simulate brief network latency
  await new Promise((resolve) => setTimeout(resolve, 50));

  // 3. Deduplication key: case-insensitive email + college name
  const dedupeKey = `${validated.contact_email.toLowerCase()}::${validated.college_name.toLowerCase()}`;

  if (submittedLeads.has(dedupeKey)) {
    // Idempotent return without duplicate storage
    return {
      data: { joined: true },
      meta: { request_id: "req_mock_idempotent" },
    };
  }

  submittedLeads.add(dedupeKey);

  return {
    data: { joined: true },
    meta: { request_id: `req_mock_${Date.now().toString(36)}` },
  };
}
