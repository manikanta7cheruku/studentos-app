// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";

import { NotificationsView } from "@/features/notifications";
import type { NotificationItem } from "@/features/notifications";

afterEach(() => {
  cleanup();
});

const mockNotifications: NotificationItem[] = [
  {
    id: "ntf-test-1",
    user_id: "user-1",
    college_id: "col-1",
    type: "join_request_received",
    title: "Join request for Hackathon",
    body: "Student A wants to join as Frontend Developer.",
    read_at: null,
    created_at: "2026-10-30T10:00:00Z",
  },
  {
    id: "ntf-test-2",
    user_id: "user-1",
    college_id: "col-1",
    type: "reminder",
    title: "Application due soon",
    body: "Submission deadline is in 24 hours.",
    read_at: "2026-10-29T10:00:00Z",
    created_at: "2026-10-29T10:00:00Z",
  },
];

describe("NotificationsView", () => {
  it("renders notifications list and displays unread indicator", () => {
    render(<NotificationsView initialData={mockNotifications} />);
    expect(screen.getByText("Join request for Hackathon")).toBeTruthy();
    expect(screen.getByText("Student A wants to join as Frontend Developer.")).toBeTruthy();
    expect(screen.getByText("Application due soon")).toBeTruthy();
    expect(screen.getByText("Unread")).toBeTruthy();
  });

  it("marks a single notification as read when button is clicked", async () => {
    const onRead = vi.fn();
    render(<NotificationsView initialData={mockNotifications} onNotificationRead={onRead} />);

    const markReadBtn = screen.getByRole("button", {
      name: 'Mark "Join request for Hackathon" as read',
    });
    fireEvent.click(markReadBtn);

    await waitFor(() => {
      expect(onRead).toHaveBeenCalledWith("ntf-test-1");
    });
  });

  it("marks all notifications as read when 'Mark all as read' is clicked", async () => {
    render(<NotificationsView initialData={mockNotifications} />);

    const markAllBtn = screen.getByRole("button", { name: "Mark all as read" });
    fireEvent.click(markAllBtn);

    await waitFor(() => {
      expect(screen.queryByRole("button", { name: "Mark all as read" })).toBeNull();
    });
  });

  it("filters unread notifications when Unread tab is clicked", () => {
    render(<NotificationsView initialData={mockNotifications} />);

    const unreadTab = screen.getByRole("tab", { name: /Unread/ });
    fireEvent.click(unreadTab);

    expect(screen.getByText("Join request for Hackathon")).toBeTruthy();
    expect(screen.queryByText("Application due soon")).toBeNull();
  });

  it("renders the loading state properly", () => {
    render(<NotificationsView forcedState="loading" />);
    expect(screen.getByTestId("notifications-loading")).toBeTruthy();
  });

  it("renders the empty state with helpful explanation", () => {
    render(<NotificationsView forcedState="empty" />);
    expect(screen.getByText("No notifications yet")).toBeTruthy();
    expect(
      screen.getByText(/When you receive team requests, reminders, or verification decisions/),
    ).toBeTruthy();
  });

  it("renders error state with retry button and request ID", () => {
    render(<NotificationsView forcedState="error" />);
    expect(screen.getByTestId("notifications-error")).toBeTruthy();
    expect(screen.getByText("Could not load notifications")).toBeTruthy();
    expect(screen.getByText("req-err-ntf-500")).toBeTruthy();
    expect(screen.getByRole("button", { name: "Try again" })).toBeTruthy();
  });
});
