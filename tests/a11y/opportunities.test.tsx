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
} from "@/features/opportunities";
import { makeOpportunity } from "../helpers/opportunity-fixtures";

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
    const opp1 = makeOpportunity({ id: "dddddddd-0000-4000-8000-0000000000b1" });
    const opp2 = makeOpportunity({
      id: "dddddddd-0000-4000-8000-0000000000b2",
      saved: true,
      changed_since_saved: true,
    });
    const opp3 = makeOpportunity({
      id: "dddddddd-0000-4000-8000-0000000000b3",
      stipend_min: null,
      stipend_max: null,
      location: "",
      deadline: null,
    });
    const opp4 = makeOpportunity({
      id: "dddddddd-0000-4000-8000-0000000000b4",
      status: "expired",
      deadline: "2026-10-01T00:00:00Z",
    });

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
