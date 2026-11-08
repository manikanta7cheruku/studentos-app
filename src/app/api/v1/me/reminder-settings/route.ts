import { reminderSettingsBody } from "@/contracts";
import { ok, readJson, route } from "@/lib/api";
import { meContext } from "@/modules/engagement/context";
import {
  getReminderSettings,
  setReminderSettings,
} from "@/modules/opportunities/opportunities.admin";

// REM-01 GET /api/v1/me/reminder-settings: { "enabled": true }. On by default.
export const GET = route(async ({ request, requestId }) => {
  const { jar, userId } = await meContext(request);
  return jar.applyTo(ok({ enabled: await getReminderSettings(userId) }, requestId));
});

// REM-01 PUT /api/v1/me/reminder-settings   { "enabled": false }
// Switches the deadline reminders (a notification less than 48 hours before the deadline of a saved listing) on or off.
export const PUT = route(async ({ request, requestId }) => {
  const { jar, userId } = await meContext(request, { write: true });
  const body = await readJson(request, reminderSettingsBody);
  return jar.applyTo(ok({ enabled: await setReminderSettings(userId, body.enabled) }, requestId));
});
