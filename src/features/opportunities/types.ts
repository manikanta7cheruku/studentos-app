import { z } from "zod";
import {
  opportunity,
  opportunityDeadlineFilter,
  opportunityKind,
  opportunityListQuery,
  opportunityListResponse,
  opportunityMode,
  savedOpportunityResponse,
  successEnvelope,
  uuid,
} from "@/contracts";

// Shapes come from R2's contracts (src/contracts/opportunities.ts). Do not redefine them here.
export {
  opportunityDeadlineFilter,
  opportunityKind,
  opportunityListQuery,
  opportunityListResponse,
  opportunityMode,
  savedOpportunityResponse,
};
export const opportunitySchema = opportunity;

export type OpportunityKind = z.infer<typeof opportunityKind>;
export type OpportunityMode = z.infer<typeof opportunityMode>;
export type OpportunityDeadlineFilter = z.infer<typeof opportunityDeadlineFilter>;
// in_tracker is NOT in the API (the tracker is R3's). It is a UI-only flag set after "Add to tracker".
export type Opportunity = z.infer<typeof opportunity> & { in_tracker?: boolean };
export type OpportunityListQuery = z.infer<typeof opportunityListQuery>;
export type OpportunityListResponse = z.infer<typeof opportunityListResponse>;
export type SavedOpportunityResponse = z.infer<typeof savedOpportunityResponse>;

// TODO(R2): contract missing — APP-01 application create schemas
export const applicationStatus = z.enum([
  "saved",
  "applied",
  "assessment",
  "interview",
  "offer",
  "rejected",
  "withdrawn",
]);
export type ApplicationStatus = z.infer<typeof applicationStatus>;

// TODO(R2): contract missing — APP-01 application request body
export const applicationCreateBody = z.strictObject({
  company: z.string().min(1).max(120),
  role_title: z.string().min(1).max(120),
  source_url: z.string().url().max(500),
  deadline: z.string().nullable().optional(),
  opportunity_id: uuid.nullable().optional(),
  status: applicationStatus.default("saved"),
  notes: z.string().max(4000).optional(),
});
export type ApplicationCreateBody = z.infer<typeof applicationCreateBody>;

// TODO(R2): contract missing — APP-01 application create response
export const applicationCreateResponse = successEnvelope(
  z.object({
    id: uuid,
    company: z.string(),
    role_title: z.string(),
    source_url: z.string(),
    deadline: z.string().nullable(),
    opportunity_id: uuid.nullable(),
    status: applicationStatus,
    created_at: z.string().optional(),
    version: z.number().int().optional(),
  }),
);
export type ApplicationCreateResponse = z.infer<typeof applicationCreateResponse>;

export interface OpportunityFilters {
  kinds: OpportunityKind[];
  skills: string[];
  mode?: OpportunityMode | "all";
  location?: string;
  deadline?: OpportunityDeadlineFilter;
  q?: string;
  saved?: boolean;
}
