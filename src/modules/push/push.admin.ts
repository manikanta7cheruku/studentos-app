import { sendNotification, setVapidDetails } from "web-push";
import { adminClient } from "@/server/admin/supabase-admin";
import { AppError } from "@/lib/errors";
import { notificationHref } from "@/lib/notification-link";

// Phone and desktop alerts. Needs NEXT_PUBLIC_VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY and (optional) VAPID_SUBJECT.
// Without them nothing is sent and nothing breaks.

export function pushConfigured(): boolean {
  return Boolean(process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY);
}

export async function savePushSubscription(
  userId: string,
  input: { endpoint: string; keys: { p256dh: string; auth: string } },
  userAgent: string | null,
) {
  const { error } = await adminClient().rpc("push_subscribe", {
    p_user: userId,
    p_endpoint: input.endpoint,
    p_p256dh: input.keys.p256dh,
    p_auth: input.keys.auth,
    p_agent: userAgent,
  });
  if (error) throw new AppError("UPSTREAM_UNAVAILABLE", { cause: error });
}

export async function removePushSubscription(userId: string, endpoint: string) {
  const { error } = await adminClient().rpc("push_unsubscribe", {
    p_user: userId,
    p_endpoint: endpoint,
  });
  if (error) throw new AppError("UPSTREAM_UNAVAILABLE", { cause: error });
}

/** "Sign out everywhere": every device of this person stops getting alerts. */
export async function removeAllPushSubscriptions(userId: string) {
  const { error } = await adminClient().from("push_subscriptions").delete().eq("user_id", userId);
  if (error) throw new AppError("UPSTREAM_UNAVAILABLE", { cause: error });
}

type Claimed = {
  notification_id: string;
  user_id: string;
  type: string;
  payload: Record<string, unknown>;
  college_slug: string | null;
  sub_id: string;
  endpoint: string;
  p256dh: string;
  auth: string;
};

/** What the alert says and where it leads. The wording comes from the notification itself, never from what someone wrote. */
export function alertFor(row: Pick<Claimed, "type" | "payload" | "college_slug">) {
  const title =
    typeof row.payload.title === "string" && row.payload.title ? row.payload.title : "StudentOS";
  const body = typeof row.payload.message === "string" ? row.payload.message.slice(0, 160) : "";
  const url = row.college_slug
    ? (notificationHref(row, row.college_slug) ?? `/c/${row.college_slug}/notifications`)
    : "/";
  return { title: title.slice(0, 80), body, url, tag: row.type };
}

// Who the alerts come from. Push services need an https: or mailto: address; a local http address is replaced.
function vapidSubject(): string {
  const wanted = process.env.VAPID_SUBJECT || process.env.NEXT_PUBLIC_APP_URL || "";
  return /^(https:|mailto:)/.test(wanted) ? wanted : "mailto:alerts@localhost.test";
}

function configureVapid() {
  setVapidDetails(
    vapidSubject(),
    process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY as string,
    process.env.VAPID_PRIVATE_KEY as string,
  );
}

/** Sends one test alert to every device of this person. Answers how many devices took it. */
export async function sendTestAlert(userId: string): Promise<number> {
  if (!pushConfigured()) return 0;
  configureVapid();
  const { data, error } = await adminClient()
    .from("push_subscriptions")
    .select("id, endpoint, p256dh, auth")
    .eq("user_id", userId);
  if (error) throw new AppError("UPSTREAM_UNAVAILABLE", { cause: error });
  const gone: string[] = [];
  let sent = 0;
  await Promise.all(
    (data ?? []).map(async (row) => {
      try {
        await sendNotification(
          { endpoint: row.endpoint, keys: { p256dh: row.p256dh, auth: row.auth } },
          JSON.stringify({
            title: "Test alert",
            body: "Alerts are working on this device.",
            url: "/",
            tag: "test",
          }),
          { TTL: 600, urgency: "high" },
        );
        sent += 1;
      } catch (failure) {
        const status = (failure as { statusCode?: number }).statusCode;
        if (status === 404 || status === 410) gone.push(row.id);
      }
    }),
  );
  if (gone.length > 0) await adminClient().rpc("push_drop", { p_ids: gone });
  return sent;
}

let running = false;
let lastRun = 0;

/**
 * Sends the alerts that are waiting. Called after a change is saved (at most once a second) and by the scheduler.
 * Safe to call at any time and from several places: each notification is taken once.
 */
export async function dispatchPending(
  options: { force?: boolean } = {},
): Promise<{ sent: number; dropped: number }> {
  if (!pushConfigured() || running) return { sent: 0, dropped: 0 };
  if (!options.force && Date.now() - lastRun < 1000) return { sent: 0, dropped: 0 };
  running = true;
  lastRun = Date.now();
  try {
    configureVapid();
    const { data, error } = await adminClient().rpc("push_claim", { p_limit: 50 });
    if (error) throw new AppError("UPSTREAM_UNAVAILABLE", { cause: error });
    const rows = (data ?? []) as Claimed[];
    const gone: string[] = [];
    let sent = 0;
    await Promise.all(
      rows.map(async (row) => {
        try {
          await sendNotification(
            { endpoint: row.endpoint, keys: { p256dh: row.p256dh, auth: row.auth } },
            JSON.stringify(alertFor(row)),
            { TTL: 3600, urgency: "normal" },
          );
          sent += 1;
        } catch (failure) {
          const status = (failure as { statusCode?: number }).statusCode;
          if (status === 404 || status === 410) gone.push(row.sub_id);
        }
      }),
    );
    if (gone.length > 0) await adminClient().rpc("push_drop", { p_ids: [...new Set(gone)] });
    return { sent, dropped: gone.length };
  } finally {
    running = false;
  }
}
