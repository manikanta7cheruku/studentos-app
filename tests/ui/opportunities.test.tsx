// @vitest-environment jsdom
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { http, HttpResponse } from "msw";
import { toast } from "sonner";

import { server } from "@/mocks/server";
import {
  OpportunityCard,
  FilterBar,
  OpportunitiesScreen,
  sampleOpportunities,
  opportunityListResponse,
} from "@/features/opportunities";
import type { Opportunity } from "@/features/opportunities";

// Mock sonner toast
vi.mock("sonner", () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
    info: vi.fn(),
  },
}));

let mockPathname = "/c/alpha/career/opportunities";
let mockSearchParams = new URLSearchParams();
const mockRouterPush = vi.fn((url: string) => {
  const [path, query] = url.split("?");
  if (path) mockPathname = path;
  mockSearchParams = new URLSearchParams(query || "");
});

vi.mock("next/navigation", () => ({
  usePathname: () => mockPathname,
  useSearchParams: () => mockSearchParams,
  useRouter: () => ({
    push: mockRouterPush,
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
  vi.clearAllMocks();
  mockSearchParams = new URLSearchParams();
});

afterAll(() => {
  server.close();
});

const sampleOpp: Opportunity = {
  id: "b2000000-0000-4000-8000-000000000001",
  title: "Frontend Engineering Intern",
  org: "Starlight Labs",
  kind: "internship",
  location: "Bangalore",
  mode: "hybrid",
  stipend_min: 4000000,
  stipend_max: 5000000,
  eligibility: "Pre-final CS students",
  skills: ["React", "TypeScript"],
  deadline: "2026-11-20T18:30:00Z",
  apply_url: "https://example.org/apply/starlight",
  posted_by: "Placement Cell",
  last_verified_at: "2026-11-01T10:00:00Z",
  status: "published",
  saved: false,
  in_tracker: false,
};

describe("OpportunityCard", () => {
  it("renders card with title, org, kind, mode, location, formatted stipend, deadline, verified date, and apply link", () => {
    render(
      <OpportunityCard
        opportunity={sampleOpp}
        slug="alpha"
        referenceDate={new Date("2026-11-05T00:00:00Z")}
      />,
    );

    expect(screen.getByText("Frontend Engineering Intern")).toBeTruthy();
    expect(screen.getByText("Starlight Labs")).toBeTruthy();
    expect(screen.getByText("Internship")).toBeTruthy();
    expect(screen.getByText("Hybrid")).toBeTruthy();
    expect(screen.getByText("Bangalore")).toBeTruthy();
    // 4,000,000 paise = ₹40,000; 5,000,000 paise = ₹50,000
    expect(screen.getByText(/₹40,000.*₹50,000.*month/)).toBeTruthy();
    // Closes in 16 days
    expect(screen.getByText("Closes in 16 days")).toBeTruthy();
    expect(screen.getByText("Verified Nov 1, 2026")).toBeTruthy();
    expect(screen.getByText("React")).toBeTruthy();
    expect(screen.getByText("TypeScript")).toBeTruthy();

    const applyLink = screen.getByRole("link", { name: /Apply/i });
    expect(applyLink.getAttribute("href")).toBe("https://example.org/apply/starlight");
    expect(applyLink.getAttribute("target")).toBe("_blank");
    expect(applyLink.getAttribute("rel")).toContain("noopener");
  });

  it("formats null stipend as 'Unpaid/Not listed'", () => {
    const oppWithNullStipend: Opportunity = {
      ...sampleOpp,
      id: "b2000000-0000-4000-8000-000000000002",
      stipend_min: null,
      stipend_max: null,
    };
    render(<OpportunityCard opportunity={oppWithNullStipend} slug="alpha" />);
    expect(screen.getByText("Unpaid/Not listed")).toBeTruthy();
  });

  it("formats past deadline as 'Closed'", () => {
    const closedOpp: Opportunity = {
      ...sampleOpp,
      id: "b2000000-0000-4000-8000-000000000003",
      deadline: "2026-10-01T00:00:00Z",
    };
    render(
      <OpportunityCard
        opportunity={closedOpp}
        slug="alpha"
        referenceDate={new Date("2026-11-05T00:00:00Z")}
      />,
    );
    expect(screen.getByText("Closed")).toBeTruthy();
  });

  it("does not render unsafe apply_url (javascript:) as a link", () => {
    const unsafeOpp: Opportunity = {
      ...sampleOpp,
      id: "b2000000-0000-4000-8000-000000000004",
      apply_url: "javascript:alert('xss')",
    };
    render(<OpportunityCard opportunity={unsafeOpp} slug="alpha" />);
    expect(screen.queryByRole("link", { name: /Apply/i })).toBeNull();
    expect(screen.getByTestId("unsafe-apply-url")).toBeTruthy();
  });

  it("renders http:// apply_url as a valid link", () => {
    const httpOpp: Opportunity = {
      ...sampleOpp,
      id: "b2000000-0000-4000-8000-000000000005",
      apply_url: "http://example.org/careers/http-opp",
    };
    render(<OpportunityCard opportunity={httpOpp} slug="alpha" />);
    const link = screen.getByRole("link", { name: /Apply/i });
    expect(link.getAttribute("href")).toBe("http://example.org/careers/http-opp");
  });

  it("shows filled bookmark icon and 'Saved' text when saved is true", () => {
    const savedOpp: Opportunity = {
      ...sampleOpp,
      saved: true,
    };
    render(<OpportunityCard opportunity={savedOpp} slug="alpha" />);
    const savedBtn = screen.getByRole("button", { name: /Unsave/i });
    expect(savedBtn.getAttribute("aria-pressed")).toBe("true");
    expect(savedBtn.textContent).toContain("Saved");
    const bookmarkSvg = savedBtn.querySelector("svg");
    expect(bookmarkSvg?.getAttribute("class")).toContain("fill-primary");
  });

  it("handles Save and Unsave with optimistic toggle and proper PUT / DELETE API calls", async () => {
    let putCalled = false;
    let deleteCalled = false;

    server.use(
      http.put("*/api/v1/me/saved-opportunities/:id", () => {
        putCalled = true;
        return HttpResponse.json({
          data: { saved: true, opportunity_id: sampleOpp.id },
          meta: { request_id: "req_save" },
        });
      }),
      http.delete("*/api/v1/me/saved-opportunities/:id", () => {
        deleteCalled = true;
        return HttpResponse.json({
          data: { saved: false, opportunity_id: sampleOpp.id },
          meta: { request_id: "req_unsave" },
        });
      }),
    );

    render(<OpportunityCard opportunity={sampleOpp} slug="alpha" />);
    const saveButton = screen.getByRole("button", {
      name: `Save ${sampleOpp.title}`,
    });
    expect(saveButton.getAttribute("aria-pressed")).toBe("false");

    // Click Save
    fireEvent.click(saveButton);
    expect(saveButton.getAttribute("aria-pressed")).toBe("true");

    await waitFor(() => {
      expect(putCalled).toBe(true);
      expect(toast.success).toHaveBeenCalledWith(expect.stringContaining("Saved"));
    });

    // Click Unsave
    const unsaveButton = screen.getByRole("button", {
      name: `Unsave ${sampleOpp.title}`,
    });
    fireEvent.click(unsaveButton);
    expect(unsaveButton.getAttribute("aria-pressed")).toBe("false");

    await waitFor(() => {
      expect(deleteCalled).toBe(true);
      expect(toast.success).toHaveBeenCalledWith(expect.stringContaining("Removed"));
    });
  });

  it("rolls back optimistic save state and displays toast error on failure", async () => {
    server.use(
      http.put("*/api/v1/me/saved-opportunities/:id", () => {
        return HttpResponse.json(
          {
            error: {
              code: "INTERNAL",
              message: "Database down",
              request_id: "req_fail",
            },
          },
          { status: 500 },
        );
      }),
    );

    render(<OpportunityCard opportunity={sampleOpp} slug="alpha" />);
    const saveButton = screen.getByRole("button", {
      name: `Save ${sampleOpp.title}`,
    });

    fireEvent.click(saveButton);
    expect(saveButton.getAttribute("aria-pressed")).toBe("true");

    await waitFor(() => {
      // Reverted to false
      expect(saveButton.getAttribute("aria-pressed")).toBe("false");
      expect(toast.error).toHaveBeenCalled();
    });
  });

  it("adds opportunity to tracker (APP-01) with mapped body and Idempotency-Key", async () => {
    let capturedBody: Record<string, unknown> | null = null;
    let capturedIdempotencyKey: string | null = null;

    server.use(
      http.post("*/api/v1/me/applications", async ({ request }) => {
        capturedIdempotencyKey = request.headers.get("Idempotency-Key");
        capturedBody = (await request.json()) as Record<string, unknown>;
        return HttpResponse.json(
          {
            data: {
              id: "app-created-1",
              ...capturedBody,
              version: 1,
            },
            meta: { request_id: "req_app_ok" },
          },
          { status: 201 },
        );
      }),
    );

    render(<OpportunityCard opportunity={sampleOpp} slug="alpha" />);
    const trackerButton = screen.getByRole("button", { name: /Add to tracker/i });

    fireEvent.click(trackerButton);

    await waitFor(() => {
      expect(capturedBody).toEqual({
        company: sampleOpp.org,
        role_title: sampleOpp.title,
        source_url: sampleOpp.apply_url,
        deadline: sampleOpp.deadline,
        opportunity_id: sampleOpp.id,
        status: "saved",
      });
      expect(capturedIdempotencyKey).toBeTruthy();
      expect(toast.success).toHaveBeenCalled();
    });

    // Button should now be disabled "In tracker"
    const inTrackerButton = screen.getByRole("button", { name: /In tracker/i });
    expect(inTrackerButton.hasAttribute("disabled")).toBe(true);
  });

  it("handles duplicate application (409 CONFLICT) gracefully by marking button 'In tracker'", async () => {
    server.use(
      http.post("*/api/v1/me/applications", () => {
        return HttpResponse.json(
          {
            error: {
              code: "CONFLICT",
              message: "Already in tracker",
              request_id: "req_dup",
            },
          },
          { status: 409 },
        );
      }),
    );

    render(<OpportunityCard opportunity={sampleOpp} slug="alpha" />);
    const trackerButton = screen.getByRole("button", { name: /Add to tracker/i });
    fireEvent.click(trackerButton);

    await waitFor(() => {
      expect(toast.info).toHaveBeenCalledWith(
        "Already in tracker",
        expect.objectContaining({
          action: expect.objectContaining({ label: "View tracker" }),
        }),
      );
    });

    const inTrackerButton = screen.getByRole("button", { name: /In tracker/i });
    expect(inTrackerButton.hasAttribute("disabled")).toBe(true);
  });
});

describe("OpportunitiesScreen Integration", () => {
  it("validates all sampleOpportunities against opportunitySchema", () => {
    const result = opportunityListResponse.safeParse({
      data: sampleOpportunities,
      meta: { request_id: "test" },
    });
    if (!result.success) {
      expect(result.error.issues).toEqual([]);
    }
    expect(result.success).toBe(true);
  });
  it("selected chip has aria-pressed=true and shows a check icon", () => {
    render(
      <FilterBar
        filters={{
          kinds: ["internship"],
          skills: [],
          mode: "all",
          location: "",
          deadline: "any",
        }}
      />,
    );

    const internshipButtons = screen.getAllByRole("button", { name: /Internship/i });
    const selectedChip = internshipButtons[0]!;
    expect(selectedChip.getAttribute("aria-pressed")).toBe("true");

    const checkIcon = selectedChip.querySelector("svg");
    expect(checkIcon).toBeTruthy();
    expect(checkIcon?.getAttribute("class")).toContain("text-primary");

    const jobButtons = screen.getAllByRole("button", { name: /Job/i });
    expect(jobButtons[0]!.getAttribute("aria-pressed")).toBe("false");
  });

  it("the Apex Cloud Labs Apply link has href https://example.org/careers/apex-cloud, target _blank and rel containing noopener noreferrer", async () => {
    render(<OpportunitiesScreen slug="alpha" />);

    await waitFor(() => {
      expect(screen.getByText("Cloud Infrastructure Graduate Role")).toBeTruthy();
    });

    const apexApplyLink = screen.getByRole("link", {
      name: /Apply to Cloud Infrastructure Graduate Role at Apex Cloud Labs/i,
    });
    expect(apexApplyLink.getAttribute("href")).toBe("https://example.org/careers/apex-cloud");
    expect(apexApplyLink.getAttribute("target")).toBe("_blank");
    expect(apexApplyLink.getAttribute("rel")).toContain("noopener");
    expect(apexApplyLink.getAttribute("rel")).toContain("noreferrer");
  });

  it("renders opportunity list and announces results in live region", async () => {
    render(<OpportunitiesScreen slug="alpha" />);

    await waitFor(() => {
      expect(screen.getByRole("heading", { name: "Curated Opportunities" })).toBeTruthy();
      expect(screen.getByText("Software Engineering Intern")).toBeTruthy();
    });

    // Live region check
    const liveRegion = document.querySelector('[aria-live="polite"]');
    expect(liveRegion?.textContent).toMatch(/opportunit/i);
  });

  it("narrows results when Kind filter is selected and writes URL params", async () => {
    render(<OpportunitiesScreen slug="alpha" />);

    await waitFor(() => {
      expect(screen.getByText("Software Engineering Intern")).toBeTruthy();
    });

    // Click Hackathon kind button
    const hackathonButtons = screen.getAllByRole("button", { name: "Hackathon" });
    fireEvent.click(hackathonButtons[0]!);

    await waitFor(() => {
      expect(mockRouterPush).toHaveBeenCalledWith(expect.stringContaining("kind=hackathon"));
    });
  });

  it("narrows results when Location is filtered", async () => {
    render(<OpportunitiesScreen slug="alpha" />);

    await waitFor(() => {
      expect(screen.getByText("Software Engineering Intern")).toBeTruthy();
    });

    const locationInput = screen.getByPlaceholderText("City or state...");
    fireEvent.change(locationInput, { target: { value: "Hyderabad" } });

    await waitFor(() => {
      expect(mockRouterPush).toHaveBeenCalledWith(expect.stringContaining("location=Hyderabad"));
    });
  });

  it("reads initial URL search parameters and applies filters", async () => {
    mockSearchParams = new URLSearchParams("kind=internship&mode=hybrid");
    render(<OpportunitiesScreen slug="alpha" />);

    await waitFor(() => {
      expect(screen.getByText("Software Engineering Intern")).toBeTruthy();
      // Apex Cloud Labs is onsite job, should not appear
      expect(screen.queryByText("Cloud Infrastructure Graduate Role")).toBeNull();
    });
  });

  it("Clear filters resets filters, restores results, and updates URL", async () => {
    mockSearchParams = new URLSearchParams("kind=internship");
    render(<OpportunitiesScreen slug="alpha" />);

    await waitFor(() => {
      expect(screen.getByText("Software Engineering Intern")).toBeTruthy();
    });

    const clearButtons = screen.getAllByRole("button", { name: /Clear/i });
    fireEvent.click(clearButtons[0]!);

    await waitFor(() => {
      expect(mockRouterPush).toHaveBeenCalledWith("/c/alpha/career/opportunities");
    });
  });

  it("supports Load more pagination", async () => {
    // Return 2 items with next_cursor
    server.use(
      http.get("*/api/v1/c/:slug/opportunities", ({ request }) => {
        const url = new URL(request.url);
        const cursor = url.searchParams.get("cursor");

        if (!cursor) {
          return HttpResponse.json({
            data: [sampleOpportunities[0]],
            meta: { request_id: "req_p1", next_cursor: "cursor-page-2" },
          });
        }

        return HttpResponse.json({
          data: [sampleOpportunities[1]],
          meta: { request_id: "req_p2", next_cursor: null },
        });
      }),
    );

    render(<OpportunitiesScreen slug="alpha" />);

    await waitFor(() => {
      expect(screen.getByText(sampleOpportunities[0]!.title)).toBeTruthy();
    });

    const loadMoreButton = screen.getByRole("button", { name: /Load more/i });
    fireEvent.click(loadMoreButton);

    await waitFor(() => {
      expect(screen.getByText(sampleOpportunities[1]!.title)).toBeTruthy();
      expect(screen.queryByRole("button", { name: /Load more/i })).toBeNull();
    });
  });

  it("displays loading skeleton during fetch", () => {
    server.use(
      http.get("*/api/v1/c/:slug/opportunities", () => {
        // Return a promise that does not resolve immediately
        return new Promise(() => {});
      }),
    );

    render(<OpportunitiesScreen slug="alpha" />);
    expect(screen.getByTestId("opportunities-skeleton")).toBeTruthy();
  });

  it("displays NoOpportunitiesEmptyState when college has 0 opportunities", async () => {
    server.use(
      http.get("*/api/v1/c/:slug/opportunities", () => {
        return HttpResponse.json({
          data: [],
          meta: { request_id: "req_empty", next_cursor: null },
        });
      }),
    );

    render(<OpportunitiesScreen slug="alpha" />);

    await waitFor(() => {
      expect(screen.getByText("No opportunities yet")).toBeTruthy();
    });
  });

  it("displays NoOpportunityResultsEmptyState with Clear filters button when filtered to 0 matches", async () => {
    mockSearchParams = new URLSearchParams("kind=internship&location=NonExistentCity");
    server.use(
      http.get("*/api/v1/c/:slug/opportunities", () => {
        return HttpResponse.json({
          data: [],
          meta: { request_id: "req_filtered_empty", next_cursor: null },
        });
      }),
    );

    render(<OpportunitiesScreen slug="alpha" />);

    await waitFor(() => {
      expect(screen.getByText("No matching opportunities")).toBeTruthy();
      expect(screen.getByRole("button", { name: /Clear filters/i })).toBeTruthy();
    });
  });

  it("displays friendly error message and Retry button when loading fails", async () => {
    let callCount = 0;
    server.use(
      http.get("*/api/v1/c/:slug/opportunities", () => {
        callCount++;
        if (callCount === 1) {
          return HttpResponse.json(
            {
              error: {
                code: "FEATURE_DISABLED",
                message: "Feature not available",
                request_id: "req_feat_disabled",
              },
            },
            { status: 404 },
          );
        }
        return HttpResponse.json({
          data: [sampleOpportunities[0]],
          meta: { request_id: "req_ok_retry" },
        });
      }),
    );

    render(<OpportunitiesScreen slug="alpha" />);

    await waitFor(() => {
      expect(
        screen.getByText("Curated opportunities are not enabled for your college."),
      ).toBeTruthy();
      expect(screen.getByText("Request ID: req_feat_disabled")).toBeTruthy();
    });

    // Click Retry
    const retryBtn = screen.getByRole("button", { name: /Retry/i });
    fireEvent.click(retryBtn);

    await waitFor(() => {
      expect(screen.getByText(sampleOpportunities[0]!.title)).toBeTruthy();
    });
  });
});
