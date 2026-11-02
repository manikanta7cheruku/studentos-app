// @vitest-environment jsdom
import { afterEach, beforeAll, describe, expect, it } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import axe from "axe-core";

import Home from "@/app/page";

beforeAll(() => {
  if (typeof window !== "undefined" && typeof window.ResizeObserver !== "function") {
    class ResizeObserverMock {
      observe() {}
      unobserve() {}
      disconnect() {}
    }
    window.ResizeObserver = ResizeObserverMock;
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

describe("accessibility of landing page / (axe and landmarks)", () => {
  it("has exactly one h1", () => {
    render(<Home />);
    const headings = screen.getAllByRole("heading", { level: 1 });
    expect(headings).toHaveLength(1);
    expect(headings[0]?.textContent).toBe("One place for your college.");
  });

  it("has no serious or critical accessibility problems", async () => {
    const { container } = render(<Home />);
    // jsdom cannot measure real colors, so contrast is checked in Chrome / Lighthouse
    const results = await axe.run(container, {
      rules: { "color-contrast": { enabled: false } },
    });
    const serious = results.violations.filter(
      (violation) => violation.impact === "serious" || violation.impact === "critical",
    );
    expect(
      serious.map((violation) => `${violation.id}: ${violation.help} (${violation.nodes.length})`),
    ).toEqual([]);
  });

  it("includes a skip to content link targeting #main-content", () => {
    render(<Home />);
    const skipLink = screen.getByRole("link", { name: /skip to (main )?content/i });
    expect(skipLink).toBeDefined();
    expect(skipLink.getAttribute("href")).toBe("#main-content");
  });
});
