// @vitest-environment jsdom
import { afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";

import { RoleChip } from "@/features/team-finder";
import type { TeamRole } from "@/features/team-finder";

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

const openRole: TeamRole = {
  id: "r1",
  role_name: "Frontend Developer",
  slots: 3,
  filled: 2,
  skills: ["React", "TypeScript"],
};

const fullRole: TeamRole = {
  id: "r2",
  role_name: "Backend Developer",
  slots: 2,
  filled: 2,
  skills: ["Go", "PostgreSQL"],
};

describe("RoleChip", () => {
  it("renders role name, '2 of 3 filled', and explicit Open state in text", () => {
    render(<RoleChip role={openRole} />);
    expect(screen.getByText("Frontend Developer")).toBeTruthy();
    expect(screen.getByText("2 of 3 filled")).toBeTruthy();
    expect(screen.getByText("Open")).toBeTruthy();
  });

  it("renders explicit Full state in text when role is filled", () => {
    render(<RoleChip role={fullRole} />);
    expect(screen.getByText("Backend Developer")).toBeTruthy();
    expect(screen.getByText("2 of 2 filled")).toBeTruthy();
    expect(screen.getByText("Full")).toBeTruthy();
  });

  it("is selectable and triggers onSelect when open", () => {
    const handleSelect = vi.fn();
    render(<RoleChip role={openRole} selectable onSelect={handleSelect} />);
    const btn = screen.getByRole("button", { name: /Frontend Developer/i });
    expect(btn.hasAttribute("disabled")).toBe(false);
    fireEvent.click(btn);
    expect(handleSelect).toHaveBeenCalledWith(openRole);
  });

  it("blocks selection and disables button when role is full", () => {
    const handleSelect = vi.fn();
    render(<RoleChip role={fullRole} selectable onSelect={handleSelect} />);
    const btn = screen.getByRole("button", { name: /Backend Developer/i });
    expect(btn.hasAttribute("disabled")).toBe(true);
    fireEvent.click(btn);
    expect(handleSelect).not.toHaveBeenCalled();
    expect(screen.getByText("(Role full)")).toBeTruthy();
  });
});
