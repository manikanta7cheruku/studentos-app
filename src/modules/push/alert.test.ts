import { describe, expect, it } from "vitest";
import { alertFor } from "./push.admin";

describe("what a phone alert says and where it leads", () => {
  it("uses the notification's own title and message and opens the right page", () => {
    expect(
      alertFor({
        type: "dm.received",
        payload: { title: "New message request", message: "Asha wants to chat", from: "u1" },
        college_slug: "alpha",
      }),
    ).toEqual({
      title: "New message request",
      body: "Asha wants to chat",
      url: "/c/alpha/messages/u1",
      tag: "dm.received",
    });
  });

  it("falls back to a plain title and the Updates page", () => {
    const alert = alertFor({ type: "something.new", payload: {}, college_slug: "alpha" });
    expect(alert.title).toBe("StudentOS");
    expect(alert.url).toBe("/c/alpha/notifications");
  });

  it("keeps long text short", () => {
    const alert = alertFor({
      type: "announcement.published",
      payload: { title: "t".repeat(300), message: "m".repeat(500) },
      college_slug: "alpha",
    });
    expect(alert.title.length).toBeLessThanOrEqual(80);
    expect(alert.body.length).toBeLessThanOrEqual(160);
  });
});
