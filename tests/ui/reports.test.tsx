// @vitest-environment jsdom
import { afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";

import { ReportDialog, ModeratorReportsQueue } from "@/features/reports";
import type { ReportItem } from "@/features/reports";

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

const mockReports: ReportItem[] = [
  {
    id: "rpt-t1",
    college_id: "c1",
    reporter_id: "u1",
    target_type: "team_post",
    target_id: "post-1",
    target_title: "Suspicious Commercial Offer",
    reason: "spam",
    details: "Selling paid term papers",
    status: "open",
    created_at: "2026-10-30T10:00:00Z",
  },
  {
    id: "rpt-t2",
    college_id: "c1",
    reporter_id: "u2",
    target_type: "profile",
    target_id: "u-bad",
    target_title: "Fake Professor Account",
    reason: "impersonation",
    details: "Pretending to be faculty",
    status: "dismissed",
    handled_by: "mod-1",
    handled_at: "2026-10-29T10:00:00Z",
    created_at: "2026-10-29T09:00:00Z",
  },
];

describe("ReportDialog (3 taps or fewer)", () => {
  it("completes report flow in 3 taps: open, choose reason, submit", async () => {
    const onSubmitted = vi.fn();
    render(
      <ReportDialog
        targetType="team_post"
        targetId="post-1"
        targetTitle="Dubious Post"
        onReportSubmitted={onSubmitted}
      />,
    );

    // Tap 1: Open dialog
    const openBtn = screen.getByRole("button", { name: "Report Dubious Post" });
    fireEvent.click(openBtn);

    expect(screen.getByRole("dialog")).toBeTruthy();
    expect(screen.getByText("Report content")).toBeTruthy();

    // Tap 2: Choose reason
    const harassmentRadio = screen.getByRole("radio", { name: /Harassment or bullying/i });
    fireEvent.click(harassmentRadio);
    expect(harassmentRadio.getAttribute("aria-checked")).toBe("true");

    // Tap 3: Send report
    const submitBtn = screen.getByRole("button", { name: "Submit report" });
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(onSubmitted).toHaveBeenCalledTimes(1);
    });

    const callArg = onSubmitted.mock.calls[0]?.[0] as ReportItem | undefined;
    expect(callArg?.reason).toBe("harassment");
    expect(screen.getByTestId("report-submitted-success")).toBeTruthy();
    expect(screen.getByText("Report received")).toBeTruthy();
  });

  it("closes dialog when Escape key is pressed", () => {
    render(<ReportDialog targetType="team_post" targetId="post-1" targetTitle="Dubious Post" />);

    // Open
    fireEvent.click(screen.getByRole("button", { name: "Report Dubious Post" }));
    expect(screen.getByRole("dialog")).toBeTruthy();

    // Press Escape
    fireEvent.keyDown(screen.getByRole("dialog"), { key: "Escape", code: "Escape" });
    expect(screen.queryByRole("dialog")).toBeNull();
  });
});

describe("ModeratorReportsQueue", () => {
  it("renders reports with reason badges and target information with plain words", () => {
    render(<ModeratorReportsQueue initialData={mockReports} />);
    expect(screen.getByText("Suspicious Commercial Offer")).toBeTruthy();
    expect(screen.getByText("Spam")).toBeTruthy();
    expect(screen.getByText("Selling paid term papers")).toBeTruthy();
    expect(screen.getByText("Team post")).toBeTruthy();
  });

  it("handles moderator action dismiss directly", async () => {
    const onAction = vi.fn();
    render(<ModeratorReportsQueue initialData={mockReports} onActionComplete={onAction} />);

    // Click Dismiss report
    const dismissBtn = screen.getByRole("button", { name: "Dismiss report" });
    fireEvent.click(dismissBtn);

    await waitFor(() => {
      expect(onAction).toHaveBeenCalledWith("rpt-t1", "dismiss");
    });
  });

  it("requires confirmation before suspending a member", async () => {
    const onAction = vi.fn();
    render(<ModeratorReportsQueue initialData={mockReports} onActionComplete={onAction} />);

    // Click Suspend member
    const suspendBtn = screen.getByRole("button", { name: "Suspend member" });
    fireEvent.click(suspendBtn);

    // Confirmation dialog should be open
    expect(screen.getByText("Confirm member suspension")).toBeTruthy();
    expect(
      screen.getByText(/Are you sure you want to suspend this member from your college/),
    ).toBeTruthy();

    // Click Cancel - should not suspend
    const cancelBtn = screen.getByRole("button", { name: "Cancel" });
    fireEvent.click(cancelBtn);
    expect(screen.queryByText("Confirm member suspension")).toBeNull();
    expect(onAction).not.toHaveBeenCalled();

    // Click Suspend member again and Confirm
    fireEvent.click(screen.getByRole("button", { name: "Suspend member" }));
    const confirmBtn = screen.getByRole("button", { name: "Confirm suspension" });
    fireEvent.click(confirmBtn);

    await waitFor(() => {
      expect(onAction).toHaveBeenCalledWith("rpt-t1", "suspend");
    });
  });

  it("filters reports between Open, All, and Resolved", () => {
    render(<ModeratorReportsQueue initialData={mockReports} />);

    // Default is open
    expect(screen.getByText("Suspicious Commercial Offer")).toBeTruthy();
    expect(screen.queryByText("Fake Professor Account")).toBeNull();

    // Switch to All
    const allTab = screen.getByRole("tab", { name: /All/ });
    fireEvent.click(allTab);
    expect(screen.getByText("Suspicious Commercial Offer")).toBeTruthy();
    expect(screen.getByText("Fake Professor Account")).toBeTruthy();

    // Switch to Resolved
    const resolvedTab = screen.getByRole("tab", { name: /Resolved/ });
    fireEvent.click(resolvedTab);
    expect(screen.queryByText("Suspicious Commercial Offer")).toBeNull();
    expect(screen.getByText("Fake Professor Account")).toBeTruthy();
  });

  it("renders the loading state properly", () => {
    render(<ModeratorReportsQueue forcedState="loading" />);
    expect(screen.getByTestId("reports-queue-loading")).toBeTruthy();
  });

  it("renders the empty state with encouraging notice", () => {
    render(<ModeratorReportsQueue forcedState="empty" />);
    expect(screen.getByText("No open reports")).toBeTruthy();
    expect(
      screen.getByText(/Your college community feed has no pending safety concerns/),
    ).toBeTruthy();
  });

  it("renders error state with retry button and request ID", () => {
    render(<ModeratorReportsQueue forcedState="error" />);
    expect(screen.getByTestId("reports-queue-error")).toBeTruthy();
    expect(screen.getByText("req-err-rpt-500")).toBeTruthy();
    expect(screen.getByRole("button", { name: "Try again" })).toBeTruthy();
  });
});
