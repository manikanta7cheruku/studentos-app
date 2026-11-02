// @vitest-environment jsdom
import { afterEach, describe, expect, it } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";

import { NotificationBell, DesktopRail } from "@/features/notifications";

afterEach(() => {
  cleanup();
});

describe("NotificationBell", () => {
  it("includes 'no unread' in accessible name when unread count is 0", () => {
    render(<NotificationBell unreadCount={0} />);
    const link = screen.getByRole("link", { name: "Notifications (no unread)" });
    expect(link).toBeTruthy();
    expect(link.getAttribute("href")).toBe("/me/notifications");
    expect(screen.queryByTestId("notification-badge")).toBeNull();
  });

  it("includes the unread count in accessible name and displays visual badge", () => {
    render(<NotificationBell unreadCount={3} />);
    const link = screen.getByRole("link", { name: "Notifications (3 unread)" });
    expect(link).toBeTruthy();
    expect(screen.getByText("3")).toBeTruthy();
  });

  it("caps the badge display at 99+ when unread count exceeds 99", () => {
    render(<NotificationBell unreadCount={120} />);
    const link = screen.getByRole("link", { name: "Notifications (120 unread)" });
    expect(link).toBeTruthy();
    expect(screen.getByText("99+")).toBeTruthy();
  });

  it("has at least 44px tap target size class", () => {
    render(<NotificationBell unreadCount={1} />);
    const link = screen.getByRole("link", { name: "Notifications (1 unread)" });
    expect(link.className).toMatch(/min-h-11/);
    expect(link.className).toMatch(/min-w-11/);
  });
});

describe("DesktopRail", () => {
  it("renders standard student destinations and notification bell", () => {
    render(<DesktopRail currentPath="/campus" unreadCount={2} />);
    expect(screen.getByRole("navigation", { name: "Desktop primary" })).toBeTruthy();
    expect(screen.getByRole("link", { name: "Campus" })).toBeTruthy();
    expect(screen.getByRole("link", { name: "Collaborate" })).toBeTruthy();
    expect(screen.getByRole("link", { name: "Career" })).toBeTruthy();
    expect(screen.getByRole("link", { name: "Me" })).toBeTruthy();
    expect(screen.queryByRole("link", { name: "Admin" })).toBeNull();
    expect(screen.getByRole("link", { name: "Notifications (2 unread)" })).toBeTruthy();
  });

  it("shows Admin destination only when user is admin or moderator", () => {
    render(<DesktopRail currentPath="/admin" unreadCount={0} isAdminOrModerator={true} />);
    expect(screen.getByRole("link", { name: "Admin" })).toBeTruthy();
  });
});
