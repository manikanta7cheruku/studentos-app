import { z } from "zod";
import { httpsUrl, isoDateTime, successEnvelope, uuid } from "./common";

// ---------------------------------------------------------------------------
// Application tracker (APP-01 to APP-04). Private to the person: no college, never shared.
// Rules: docs/API_CONTRACT.md section 16.
// ---------------------------------------------------------------------------
export const applicationStatus = z.enum([
  "saved",
  "applied",
  "assessment",
  "interview",
  "offer",
  "rejected",
  "withdrawn",
]);

const dateOnly = z.iso.date();

export const applicationEvent = z.object({
  id: uuid,
  from_status: applicationStatus.nullable(),
  to_status: applicationStatus,
  note: z.string(),
  at: isoDateTime,
});

export const application = z.object({
  id: uuid,
  company: z.string(),
  role_title: z.string(),
  source_url: z.string().nullable(),
  status: applicationStatus,
  deadline: dateOnly.nullable(),
  applied_on: dateOnly.nullable(),
  notes: z.string(),
  opportunity_id: uuid.nullable(),
  // Raised by 1 on every change. Send it back in If-Match to refuse an edit made on an old copy.
  version: z.number().int().min(1),
  created_at: isoDateTime,
  updated_at: isoDateTime,
});
export const applicationDetail = application.extend({
  // Newest first. The first event has from_status null.
  events: z.array(applicationEvent),
});

// APP-01 POST /api/v1/me/applications (IDEM)
export const applicationCreateBody = z.strictObject({
  company: z.string().trim().min(1).max(120),
  role_title: z.string().trim().min(1).max(120),
  source_url: httpsUrl.optional(),
  status: applicationStatus.default("saved"),
  deadline: dateOnly.nullable().optional(),
  applied_on: dateOnly.nullable().optional(),
  notes: z.string().trim().max(4000).default(""),
  // The listing this came from (OPP-01), so the Career screen can show "in your tracker".
  opportunity_id: uuid.optional(),
});
export const applicationResponse = successEnvelope(applicationDetail);

// APP-02 GET /api/v1/me/applications?status=&sort=deadline&q=
// At most 200 per person, so the answer is one page with no cursor. `sort=deadline` puts the nearest deadline first
// and applications without a deadline last. The default is the most recently changed first.
export const applicationListQuery = z.strictObject({
  status: applicationStatus.optional(),
  sort: z.enum(["updated", "deadline"]).default("updated"),
  q: z.string().trim().min(1).max(80).optional(),
});
export const applicationListResponse = successEnvelope(z.array(application));

// APP-03 PATCH /api/v1/me/applications/{id} with If-Match: <version>. Only the keys you send change.
// null clears a link or a date. The status is changed with APP-04 so that every change leaves an event.
export const applicationPatchBody = z
  .strictObject({
    company: z.string().trim().min(1).max(120).optional(),
    role_title: z.string().trim().min(1).max(120).optional(),
    source_url: httpsUrl.nullable().optional(),
    deadline: dateOnly.nullable().optional(),
    applied_on: dateOnly.nullable().optional(),
    notes: z.string().trim().max(4000).optional(),
  })
  .refine((body) => Object.keys(body).length > 0, { message: "Send at least one field to change" });

// APP-03 DELETE /api/v1/me/applications/{id}
export const applicationDeleteResponse = successEnvelope(z.object({ deleted: z.literal(true) }));

// APP-04 POST /api/v1/me/applications/{id}/status
export const applicationStatusBody = z.strictObject({
  status: applicationStatus,
  note: z.string().trim().max(500).optional(),
});
