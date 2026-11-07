import { z } from "zod";
import { httpsUrl, isoDateTime, paginationQuery, successEnvelope, uuid } from "./common";

// ---------------------------------------------------------------------------
// Opportunities and reminders (OPP-01 to OPP-04, REM-01). Rules: docs/API_CONTRACT.md section 12.
// R4's screens used a stand-in for these shapes (TODO(R2) in src/features/opportunities): import from here instead.
// ---------------------------------------------------------------------------
export const opportunityKind = z.enum([
  "internship",
  "job",
  "hackathon",
  "competition",
  "scholarship",
]);
export const opportunityMode = z.enum(["onsite", "remote", "hybrid"]);
export const opportunityDeadlineFilter = z.enum(["any", "7d", "30d", "hide_closed"]);
// `expired` is worked out from the deadline, so it is right even before the clean up job runs.
export const opportunityStatus = z.enum(["draft", "published", "expired", "removed"]);

export const opportunity = z.object({
  id: uuid,
  title: z.string(),
  org: z.string(),
  kind: opportunityKind,
  // May be an empty string (not given).
  location: z.string(),
  mode: opportunityMode,
  // Paise a month (1500000 = 15,000.00 rupees). null = not given.
  stipend_min: z.number().int().nonnegative().nullable(),
  stipend_max: z.number().int().nonnegative().nullable(),
  eligibility: z.string(),
  skills: z.array(z.string()),
  deadline: isoDateTime.nullable(),
  apply_url: z.string(),
  // The display name of the moderator who posted it.
  posted_by: z.string(),
  last_verified_at: isoDateTime,
  status: opportunityStatus,
  created_at: isoDateTime,
  // For the signed-in person.
  saved: z.boolean(),
  // The listing was edited after this person saved it: show a "changed" badge.
  changed_since_saved: z.boolean(),
});

// OPP-01 GET /api/v1/c/{slug}/opportunities?kind=job,internship&skills=React,SQL&mode=remote&location=&deadline=7d&q=&saved=true
const commaList = (max: number, itemMax: number) =>
  z
    .string()
    .trim()
    .min(1)
    .max(max * (itemMax + 1))
    .transform((value) =>
      value
        .split(",")
        .map((part) => part.trim())
        .filter(Boolean),
    )
    .pipe(z.array(z.string().max(itemMax)).max(max));
export const opportunityListQuery = paginationQuery.extend({
  kind: commaList(5, 20).pipe(z.array(opportunityKind)).optional(),
  skills: commaList(10, 40).optional(),
  mode: opportunityMode.optional(),
  location: z.string().trim().min(1).max(120).optional(),
  deadline: opportunityDeadlineFilter.optional(),
  q: z.string().trim().min(1).max(80).optional(),
  saved: z.enum(["true", "false"]).optional(),
});
export const opportunityListResponse = successEnvelope(z.array(opportunity));
export const opportunityResponse = successEnvelope(opportunity);

// OPP-03 POST /api/v1/c/{slug}/admin/opportunities (IDEM), moderators and admins
const stipend = z.number().int().min(0).max(100_000_000).nullable();
export const opportunityCreateBody = z
  .strictObject({
    title: z.string().trim().min(3).max(120),
    org: z.string().trim().min(1).max(120),
    kind: opportunityKind,
    location: z.string().trim().max(120).default(""),
    mode: opportunityMode.default("onsite"),
    stipend_min: stipend.optional(),
    stipend_max: stipend.optional(),
    eligibility: z.string().trim().max(2000).default(""),
    skills: z.array(z.string().trim().min(1).max(40)).max(10).default([]),
    deadline: isoDateTime.nullable().optional(),
    apply_url: httpsUrl,
    // draft: only moderators see it. published: members see it now.
    status: z.enum(["draft", "published"]).default("published"),
  })
  .refine(
    (body) =>
      body.stipend_min == null || body.stipend_max == null || body.stipend_max >= body.stipend_min,
    { path: ["stipend_max"], message: "The maximum must not be below the minimum" },
  );

// OPP-03 PATCH /api/v1/c/{slug}/admin/opportunities/{id}. Only the keys you send change.
// `verified: true` moves last_verified_at to now ("I checked this listing today").
export const opportunityPatchBody = z
  .strictObject({
    title: z.string().trim().min(3).max(120).optional(),
    org: z.string().trim().min(1).max(120).optional(),
    kind: opportunityKind.optional(),
    location: z.string().trim().max(120).optional(),
    mode: opportunityMode.optional(),
    stipend_min: stipend.optional(),
    stipend_max: stipend.optional(),
    eligibility: z.string().trim().max(2000).optional(),
    skills: z.array(z.string().trim().min(1).max(40)).max(10).optional(),
    deadline: isoDateTime.nullable().optional(),
    apply_url: httpsUrl.optional(),
    status: z.enum(["draft", "published"]).optional(),
    verified: z.literal(true).optional(),
  })
  .refine((body) => Object.keys(body).length > 0, { message: "Send at least one field to change" });

// OPP-03 GET /api/v1/c/{slug}/admin/opportunities?status=draft: everything, drafts included
export const adminOpportunityListQuery = paginationQuery.extend({
  status: z.enum(["draft", "published", "expired", "removed"]).optional(),
});
export const adminOpportunity = opportunity.extend({
  // The stored status. `status` above can read expired from the deadline while this still says published.
  raw_status: opportunityStatus,
});
export const adminOpportunityListResponse = successEnvelope(z.array(adminOpportunity));
export const opportunityRemoveResponse = successEnvelope(
  z.object({ id: uuid, status: z.literal("removed") }),
);

// OPP-04 PUT or DELETE /api/v1/me/saved-opportunities/{id}. Safe to repeat.
export const savedOpportunityResponse = successEnvelope(
  z.object({ saved: z.boolean(), opportunity_id: uuid }),
);

// REM-01 GET or PUT /api/v1/me/reminder-settings. Deadline reminders (a notification 48 hours before a saved deadline).
export const reminderSettingsBody = z.strictObject({ enabled: z.boolean() });
export const reminderSettingsResponse = successEnvelope(z.object({ enabled: z.boolean() }));
