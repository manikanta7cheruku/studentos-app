import { z } from "zod";
import { successEnvelope, uuid } from "./common";

// ---------------------------------------------------------------------------
// Network (NET-01, NET-02). A connection is a chat the other person accepted, or two people who follow each other.
// Rules: docs/API_CONTRACT.md section 17.
// ---------------------------------------------------------------------------

// NET-01 GET /api/v1/c/{slug}/network/suggestions?limit=6: people to meet. Not yet connected, not asked, not blocked. The ones who
// share the most with me come first (interests, branch, college, mutual connections).
export const networkSuggestion = z.object({
  user_id: uuid,
  display_name: z.string(),
  headline: z.string().nullable(),
  avatar_url: z.string().nullable(),
  college_name: z.string().nullable(),
  branch: z.string().nullable(),
  grad_year: z.number().int().nullable(),
  shared_interests: z.array(z.string()),
  // People we are both connected to.
  mutual: z.number().int().min(0),
});
export const networkSuggestionsQuery = z.strictObject({
  limit: z.coerce.number().int().min(1).max(12).default(6),
});
export const networkSuggestionsResponse = successEnvelope(z.array(networkSuggestion));

// NET-02 GET /api/v1/me/network: how big my network is, across every space I am in.
export const networkStats = z.object({
  connections: z.number().int().min(0),
  requests_sent: z.number().int().min(0),
  requests_received: z.number().int().min(0),
});
export const networkStatsResponse = successEnvelope(networkStats);

// NET-03 GET /api/v1/c/{slug}/network/connections: the people I am connected to in this space (a chat they accepted, or two
// people who follow each other), by name. Active members only, never blocked people.
export const networkConnection = z.object({
  user_id: uuid,
  display_name: z.string(),
  headline: z.string().nullable(),
  avatar_url: z.string().nullable(),
  college_name: z.string().nullable(),
  branch: z.string().nullable(),
  grad_year: z.number().int().nullable(),
  place: z.string().nullable().default(null),
});
export const networkConnectionsResponse = successEnvelope(z.array(networkConnection));
