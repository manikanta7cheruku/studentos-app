// @vitest-environment jsdom
import { afterEach, beforeAll, describe, expect, it } from "vitest";
import { cleanup, render } from "@testing-library/react";
import axe from "axe-core";

import { NotificationsView } from "@/features/notifications";

beforeAll(() => {
  if (typeof window.matchMedia !== "function") {
    Object.defineProperty(window, "matchMedia", {
      writable: true,
      value: (query: string) => ({
        matches: false,
        media: query,
        onchange: null,
        addEventListener: () => {},
        removeEventListener: () => {},
        addListener: () => {},
        removeListener: () => {},
        dispatchEvent: () => false,
      }),
    });
  }
});

afterEach(() => {
  cleanup();
});

describe("accessibility of notifications page (axe)", () => {
  it("has no serious or critical accessibility problems in success state", async () => {
    const { container } = render(
      <main>
        <NotificationsView
          initialData={[
            {
              id: "ntf-a11y-1",
              user_id: "u1",
              college_id: "c1",
              type: "verification_decision",
              title: "Verification Approved",
              body: "Welcome to your college workspace.",
              read_at: null,
              created_at: "2026-10-30T10:00:00Z",
            },
          ]}
        />
      </main>,
    );
    const results = await axe.run(container, {
      rules: { "color-contrast": { enabled: false } },
    });
    const serious = results.violations.filter(
      (violation) => violation.impact === "serious" || violation.impact === "critical",
    );
    expect(serious).toEqual([]);
  });

  it("has no serious or critical accessibility problems in empty state", async () => {
    const { container } = render(
      <main>
        <NotificationsView forcedState="empty" />
      </main>,
    );
    const results = await axe.run(container, {
      rules: { "color-contrast": { enabled: false } },
    });
    const serious = results.violations.filter(
      (violation) => violation.impact === "serious" || violation.impact === "critical",
    );
    expect(serious).toEqual([]);
  });

  it("has no serious or critical accessibility problems in error state", async () => {
    const { container } = render(
      <main>
        <NotificationsView forcedState="error" />
      </main>,
    );
    const results = await axe.run(container, {
      rules: { "color-contrast": { enabled: false } },
    });
    const serious = results.violations.filter(
      (violation) => violation.impact === "serious" || violation.impact === "critical",
    );
    expect(serious).toEqual([]);
  });
});
