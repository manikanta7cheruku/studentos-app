import { describe, expect, it } from "vitest";
import { ApiError } from "@/lib/api-client";
import { notificationHref } from "@/features/notifications/notifications-screen";
import { requestErrorMessage } from "../request-dialog";

const error = (code: string) => new ApiError({ code, message: "raw server words", status: 409 });

describe("requestErrorMessage", () => {
  it("explains each refusal in plain words", () => {
    expect(requestErrorMessage(error("ALREADY_REQUESTED"))).toMatch(/already asked/i);
    expect(requestErrorMessage(error("SLOTS_FULL"))).toMatch(/just filled/i);
    expect(requestErrorMessage(error("CONFLICT"))).toMatch(/no longer taking requests/i);
    expect(requestErrorMessage(error("FORBIDDEN"))).toMatch(/your own post/i);
    expect(requestErrorMessage(error("RATE_LIMITED"))).toMatch(/10 requests waiting/i);
  });

  it("falls back to a general message for other errors", () => {
    expect(requestErrorMessage(new Error("boom"))).toMatch(/could not send your request/i);
  });
});

describe("notificationHref for team notifications", () => {
  const base = {
    id: "n",
    read_at: null,
    created_at: "2026-01-01T00:00:00.000Z",
  };
  it("opens the post when the notification names it", () => {
    const item = {
      ...base,
      type: "team.request_received",
      payload: { title: "t", message: "m", post_id: "11111111-1111-4111-8111-111111111111" },
    };
    expect(notificationHref(item as never, "alpha")).toBe(
      "/c/alpha/collaborate/11111111-1111-4111-8111-111111111111",
    );
  });

  it("opens the team finder when it does not", () => {
    const item = { ...base, type: "team.post_expired", payload: { title: "t", message: "m" } };
    expect(notificationHref(item as never, "alpha")).toBe("/c/alpha/collaborate");
  });
});
