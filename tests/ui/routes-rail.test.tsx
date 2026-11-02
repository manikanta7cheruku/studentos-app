// @vitest-environment jsdom
import { afterEach, beforeAll, describe, expect, it } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";

import NotificationsPage from "@/app/me/notifications/page";
import AnnouncementsPage from "@/app/campus/announcements/page";
import ReportsAdminPage from "@/app/admin/reports/page";
import Home from "@/app/page";

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

describe("DesktopRail route mounting", () => {
  it("mounts DesktopRail and NotificationBell on /me/notifications", () => {
    render(<NotificationsPage />);
    const rail = screen.getByRole("navigation", { name: "Desktop primary" });
    expect(rail).toBeTruthy();
    expect(screen.getByRole("link", { name: /Notifications/i })).toBeTruthy();
  });

  it("mounts DesktopRail and NotificationBell on /campus/announcements", () => {
    render(<AnnouncementsPage />);
    const rail = screen.getByRole("navigation", { name: "Desktop primary" });
    expect(rail).toBeTruthy();
    expect(screen.getByRole("link", { name: /Notifications/i })).toBeTruthy();
  });

  it("mounts DesktopRail and NotificationBell on /admin/reports", () => {
    render(<ReportsAdminPage />);
    const rail = screen.getByRole("navigation", { name: "Desktop primary" });
    expect(rail).toBeTruthy();
    expect(screen.getByRole("link", { name: /Notifications/i })).toBeTruthy();
  });

  it("does NOT mount DesktopRail on landing page /", () => {
    render(<Home />);
    expect(screen.queryByRole("navigation", { name: "Desktop primary" })).toBeNull();
  });
});
