import { z } from "zod";
import { uuid, paginationQuery, successEnvelope } from "@/contracts";

// TODO(R2): contract missing — OPP-01 opportunity kinds
export const opportunityKind = z.enum([
  "internship",
  "job",
  "hackathon",
  "competition",
  "scholarship",
]);
export type OpportunityKind = z.infer<typeof opportunityKind>;

// TODO(R2): contract missing — OPP-01 work modes
export const opportunityMode = z.enum(["onsite", "remote", "hybrid"]);
export type OpportunityMode = z.infer<typeof opportunityMode>;

// TODO(R2): contract missing — OPP-01 deadline filter options
export const opportunityDeadlineFilter = z.enum(["any", "7d", "30d", "hide_closed"]);
export type OpportunityDeadlineFilter = z.infer<typeof opportunityDeadlineFilter>;

// TODO(R2): contract missing — OPP-01 core opportunity schema
export const opportunitySchema = z.object({
  id: uuid,
  title: z.string().min(1).max(120),
  org: z.string().min(1).max(120),
  kind: opportunityKind,
  location: z.string().min(1).max(120),
  mode: opportunityMode,
  stipend_min: z.number().int().nonnegative().nullable(),
  stipend_max: z.number().int().nonnegative().nullable(),
  eligibility: z.string().max(2000),
  skills: z.array(z.string()),
  deadline: z.string().nullable(),
  apply_url: z.string().max(500),
  posted_by: z.string().max(120),
  last_verified_at: z.string(),
  college_id: uuid.nullable().optional(),
  status: z.enum(["draft", "published", "expired", "removed"]).default("published"),
  saved: z.boolean().optional(),
  in_tracker: z.boolean().optional(),
});
export type Opportunity = z.infer<typeof opportunitySchema>;

// TODO(R2): contract missing — OPP-01 list query schema
export const opportunityListQuery = paginationQuery.extend({
  kind: z.string().optional(),
  skills: z.string().optional(),
  mode: opportunityMode.optional(),
  location: z.string().optional(),
  deadline: opportunityDeadlineFilter.optional(),
});
export type OpportunityListQuery = z.infer<typeof opportunityListQuery>;

// TODO(R2): contract missing — OPP-01 response envelope
export const opportunityListResponse = successEnvelope(z.array(opportunitySchema));
export type OpportunityListResponse = z.infer<typeof opportunityListResponse>;

// TODO(R2): contract missing — OPP-04 saved opportunity response
export const savedOpportunityResponse = successEnvelope(
  z.object({
    saved: z.boolean(),
    opportunity_id: uuid,
  }),
);
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
}
