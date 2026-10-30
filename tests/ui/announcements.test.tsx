// @vitest-environment jsdom
import { afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";

import { AnnouncementsView, AnnouncementForm } from "@/features/announcements";
import type { AnnouncementItem } from "@/features/announcements";

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
});

afterEach(() => {
  cleanup();
});

const mockAnnouncements: AnnouncementItem[] = [
  {
    id: "ann-regular",
    college_id: "c1",
    author_id: "a1",
    author_name: "Sports Club",
    author_role: "Moderator",
    title: "Football tournament registrations",
    body: "Sign up today in the gym.",
    pinned: false,
    publish_at: "2026-10-30T10:00:00Z",
    status: "published",
  },
  {
    id: "ann-pinned",
    college_id: "c1",
    author_id: "a2",
    author_name: "Dean Office",
    author_role: "Administrator",
    title: "Final Exam Dates",
    body: "Exams start on November 15.",
    pinned: true,
    publish_at: "2026-10-25T10:00:00Z",
    status: "published",
  },
];

describe("AnnouncementsView", () => {
  it("renders pinned announcements first even if published earlier", () => {
    render(<AnnouncementsView initialData={mockAnnouncements} userRole="student" />);

    const titles = screen.getAllByRole("heading", { level: 2 }).map((h) => h.textContent);
    // Pinned should be first
    expect(titles[0]).toBe("Final Exam Dates");
    expect(titles[1]).toBe("Football tournament registrations");
    expect(screen.getByText("Pinned")).toBeTruthy();
  });

  it("does not show post form or post button for students", () => {
    render(<AnnouncementsView initialData={mockAnnouncements} userRole="student" />);
    expect(screen.queryByRole("button", { name: /Post an announcement/i })).toBeNull();
  });

  it("shows post button for admins and moderators", () => {
    render(<AnnouncementsView initialData={mockAnnouncements} userRole="moderator" />);
    expect(screen.getByRole("button", { name: /Post an announcement/i })).toBeTruthy();
  });

  it("renders the loading state properly", () => {
    render(<AnnouncementsView forcedState="loading" />);
    expect(screen.getByTestId("announcements-loading")).toBeTruthy();
  });

  it("renders the empty state with clear explanation", () => {
    render(<AnnouncementsView forcedState="empty" />);
    expect(screen.getByText("No announcements yet")).toBeTruthy();
    expect(
      screen.getByText(/There are currently no official announcements posted for your college/),
    ).toBeTruthy();
  });

  it("renders error state with request id and retry button", () => {
    render(<AnnouncementsView forcedState="error" />);
    expect(screen.getByTestId("announcements-error")).toBeTruthy();
    expect(screen.getByText("req-err-ann-500")).toBeTruthy();
    expect(screen.getByRole("button", { name: "Try again" })).toBeTruthy();
  });
});

describe("AnnouncementForm", () => {
  it("does not render anything for student role", () => {
    const { container } = render(<AnnouncementForm userRole="student" />);
    expect(container.firstChild).toBeNull();
  });

  it("validates required fields with plain-word errors", async () => {
    render(<AnnouncementForm userRole="moderator" />);

    // Click open form
    fireEvent.click(screen.getByRole("button", { name: /Post an announcement/i }));

    // Try submit empty
    fireEvent.click(screen.getByRole("button", { name: /Publish announcement/i }));

    expect(
      screen.getAllByText("Please enter an announcement title.").length,
    ).toBeGreaterThanOrEqual(1);
    expect(
      screen.getAllByText("Please enter the announcement details.").length,
    ).toBeGreaterThanOrEqual(1);
  });

  it("validates minimum length requirements", async () => {
    render(<AnnouncementForm userRole="moderator" />);

    fireEvent.click(screen.getByRole("button", { name: /Post an announcement/i }));

    const titleInput = screen.getByLabelText(/Announcement title/);
    const bodyInput = screen.getByLabelText(/Announcement details/);

    fireEvent.change(titleInput, { target: { value: "abc" } });
    fireEvent.change(bodyInput, { target: { value: "short" } });

    fireEvent.click(screen.getByRole("button", { name: /Publish announcement/i }));

    expect(
      screen.getAllByText("Title must be at least 5 characters long.").length,
    ).toBeGreaterThanOrEqual(1);
    expect(
      screen.getAllByText("Announcement details must be at least 10 characters long.").length,
    ).toBeGreaterThanOrEqual(1);
  });

  it("submits a valid announcement and invokes callback", async () => {
    const onCreated = vi.fn();
    render(<AnnouncementForm userRole="admin" onAnnouncementCreated={onCreated} />);

    fireEvent.click(screen.getByRole("button", { name: /Post an announcement/i }));

    const titleInput = screen.getByLabelText(/Announcement title/);
    const bodyInput = screen.getByLabelText(/Announcement details/);

    fireEvent.change(titleInput, { target: { value: "Winter Break Schedule" } });
    fireEvent.change(bodyInput, {
      target: { value: "Campus offices will close on Dec 20 and reopen Jan 5." },
    });

    fireEvent.click(screen.getByRole("button", { name: /Publish announcement/i }));

    await waitFor(() => {
      expect(onCreated).toHaveBeenCalledTimes(1);
    });

    const callArg = onCreated.mock.calls[0]?.[0] as AnnouncementItem | undefined;
    expect(callArg?.title).toBe("Winter Break Schedule");
  });
});
