// @vitest-environment jsdom
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import { cleanup, render, waitFor } from "@testing-library/react";
import axe from "axe-core";

import { server } from "@/mocks/server";
import {
  OpportunityCard,
  FilterBar,
  NoOpportunitiesEmptyState,
  NoOpportunityResultsEmptyState,
  OpportunitiesErrorState,
  OpportunitiesScreen,
  sampleOpportunities,
} from "@/features/opportunities";

vi.mock("sonner", () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
    info: vi.fn(),
  },
}));

vi.mock("next/navigation", () => ({
  usePathname: () => "/c/alpha/career/opportunities",
  useSearchParams: () => new URLSearchParams(),
  useRouter: () => ({
    push: vi.fn(),
    replace: vi.fn(),
    back: vi.fn(),
  }),
}));

beforeAll(() => {
  server.listen();

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
  server.resetHandlers();
});

afterAll(() => {
  server.close();
});

describe("accessibility of opportunities parts (axe)", () => {
  it("has no serious or critical accessibility problems in opportunity cards across states", async () => {
    const opp1 = sampleOpportunities[0]!;
    const opp2 = sampleOpportunities[1]!;
    const opp3 = sampleOpportunities[3]!;
    const opp4 = sampleOpportunities[5]!;

    const { container } = render(
      <main>
        <OpportunityCard opportunity={opp1} slug="alpha" />
        <OpportunityCard opportunity={opp2} slug="alpha" />
        <OpportunityCard opportunity={opp3} slug="alpha" />
        <OpportunityCard opportunity={opp4} slug="alpha" />
      </main>,
    );

    const results = await axe.run(container);
    const serious = results.violations.filter(
      (violation) => violation.impact === "serious" || violation.impact === "critical",
    );
    expect(serious).toEqual([]);
  });

  it("has no serious or critical accessibility problems in filter bar (desktop and mobile dialog)", async () => {
    const { container } = render(
      <main>
        <FilterBar
          filters={{
            kinds: ["internship", "job"],
            skills: ["React"],
            mode: "hybrid",
            location: "Bangalore",
            deadline: "7d",
          }}
          availableSkills={["React", "TypeScript", "Python"]}
        />
      </main>,
    );

    const results = await axe.run(container);
    const serious = results.violations.filter(
      (violation) => violation.impact === "serious" || violation.impact === "critical",
    );
    expect(serious).toEqual([]);
  });

  it("has no serious or critical accessibility problems in empty and error states", async () => {
    const { container } = render(
      <main>
        <NoOpportunitiesEmptyState />
        <NoOpportunityResultsEmptyState onClearFilters={() => {}} />
        <OpportunitiesErrorState
          message="Unable to connect to the network"
          requestId="req_test_err_123"
          onRetry={() => {}}
        />
      </main>,
    );

    const results = await axe.run(container);
    const serious = results.violations.filter(
      (violation) => violation.impact === "serious" || violation.impact === "critical",
    );
    expect(serious).toEqual([]);
  });

  it("has no serious or critical accessibility problems in opportunities list screen", async () => {
    const { container } = render(<OpportunitiesScreen slug="alpha" />);

    await waitFor(() => {
      expect(document.querySelector('[data-slot="opportunity-card"]')).toBeTruthy();
    });

    const results = await axe.run(container);
    const serious = results.violations.filter(
      (violation) => violation.impact === "serious" || violation.impact === "critical",
    );
    expect(serious).toEqual([]);
  });
});
