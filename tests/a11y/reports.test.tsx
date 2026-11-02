// @vitest-environment jsdom
import { afterEach, beforeAll, describe, expect, it } from "vitest";
import { cleanup, render } from "@testing-library/react";
import axe from "axe-core";

import { ReportDialog, ModeratorReportsQueue } from "@/features/reports";

beforeAll(() => {
  if (typeof window.ResizeObserver !== "function") {
    class MockResizeObserver {
      observe() {}
      unobserve() {}
      disconnect() {}
    }
    window.ResizeObserver = MockResizeObserver as unknown as typeof ResizeObserver;
    global.ResizeObserver = MockResizeObserver as unknown as typeof ResizeObserver;
  }
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

describe("accessibility of reports dialog and moderator queue (axe)", () => {
  it("has no serious or critical accessibility problems in open report dialog", async () => {
    const { container } = render(
      <main>
        <ReportDialog
          targetType="team_post"
          targetId="post-1"
          targetTitle="Sample Post"
          open={true}
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

  it("has no serious or critical accessibility problems in moderator queue view", async () => {
    const { container } = render(
      <main>
        <ModeratorReportsQueue
          initialData={[
            {
              id: "rpt-a11y-1",
              college_id: "c1",
              reporter_id: "u1",
              target_type: "team_post",
              target_id: "post-1",
              target_title: "Suspicious Link",
              reason: "spam",
              details: "Phishing attempt",
              status: "open",
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

  it("has no serious or critical accessibility problems in empty and error queue states", async () => {
    const { container: emptyContainer } = render(
      <main>
        <ModeratorReportsQueue forcedState="empty" />
      </main>,
    );
    const emptyResults = await axe.run(emptyContainer, {
      rules: { "color-contrast": { enabled: false } },
    });
    const emptySerious = emptyResults.violations.filter(
      (v) => v.impact === "serious" || v.impact === "critical",
    );
    expect(emptySerious).toEqual([]);

    const { container: errorContainer } = render(
      <main>
        <ModeratorReportsQueue forcedState="error" />
      </main>,
    );
    const errorResults = await axe.run(errorContainer, {
      rules: { "color-contrast": { enabled: false } },
    });
    const errorSerious = errorResults.violations.filter(
      (v) => v.impact === "serious" || v.impact === "critical",
    );
    expect(errorSerious).toEqual([]);
  });
});
