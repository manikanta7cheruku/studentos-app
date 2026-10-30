// @vitest-environment jsdom
import { afterEach, beforeAll, describe, expect, it } from "vitest";
import { cleanup, render } from "@testing-library/react";
import axe from "axe-core";

import { AnnouncementsView, AnnouncementForm } from "@/features/announcements";

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

describe("accessibility of announcements page and form (axe)", () => {
  it("has no serious or critical accessibility problems in announcements view", async () => {
    const { container } = render(
      <main>
        <AnnouncementsView
          initialData={[
            {
              id: "ann-a11y-1",
              college_id: "c1",
              author_id: "a1",
              author_name: "Library Desk",
              author_role: "Staff",
              title: "Library Timings",
              body: "The library is open from 8am to 8pm daily.",
              pinned: true,
              publish_at: "2026-10-30T10:00:00Z",
              status: "published",
            },
          ]}
          userRole="student"
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

  it("has no serious or critical accessibility problems in moderator announcement form", async () => {
    const { container } = render(
      <main>
        <AnnouncementForm userRole="moderator" />
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

  it("has no serious or critical accessibility problems in empty and error states", async () => {
    const { container: emptyContainer } = render(
      <main>
        <AnnouncementsView forcedState="empty" />
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
        <AnnouncementsView forcedState="error" />
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
