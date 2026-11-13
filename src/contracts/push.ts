import { z } from "zod";
import { successEnvelope } from "./common";

// ---------------------------------------------------------------------------
// Phone and desktop alerts (PSH-01, PSH-02). Rules: docs/API_CONTRACT.md section 20.
// The browser gives a device address (endpoint) and two keys when a person allows alerts. The server stores them for that person.
// ---------------------------------------------------------------------------
const endpoint = z
  .string()
  .max(1000)
  .refine((value) => value.startsWith("https://"), "must be an https address");

// PSH-01 POST /api/v1/me/push: this device now gets alerts.
export const pushSubscribeBody = z.strictObject({
  endpoint,
  keys: z.strictObject({ p256dh: z.string().min(1).max(200), auth: z.string().min(1).max(100) }),
});
// PSH-02 DELETE /api/v1/me/push: this device stops getting alerts.
export const pushUnsubscribeBody = z.strictObject({ endpoint });
export const pushResponse = successEnvelope(z.object({ enabled: z.boolean() }));

// PSH-03 POST /api/v1/me/push/test: send a test alert to my devices. `sent` is how many devices took it (0 when none).
export const pushTestResponse = successEnvelope(z.object({ sent: z.number().int().min(0) }));
