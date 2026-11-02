// @vitest-environment jsdom
import { afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";

import { RoleChip, PostCard } from "@/features/team-finder";
import type { TeamRole, TeamPost } from "@/features/team-finder";

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

const sampleOpenPost: TeamPost = {
  id: "p1",
  kind: "hackathon",
  title: "AI Campus Assistant",
  description: "Building an assistive agent for campus questions.",
  deadline: "2026-12-15T18:00:00Z",
  status: "open",
  roles: [openRole, fullRole],
};

const sampleClosedPost: TeamPost = {
  ...sampleOpenPost,
  id: "p2",
  status: "closed",
};

const sampleExpiredPost: TeamPost = {
  ...sampleOpenPost,
  id: "p3",
  status: "expired",
};

const sampleFilledPost: TeamPost = {
  ...sampleOpenPost,
  id: "p4",
  status: "filled",
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

describe("PostCard", () => {
  it("renders post details and enables Request to join when open", () => {
    const onRequest = vi.fn();
    render(<PostCard post={sampleOpenPost} onRequestJoin={onRequest} />);

    expect(screen.getByText("AI Campus Assistant")).toBeTruthy();
    expect(screen.getByText("Hackathon")).toBeTruthy();
    expect(screen.getByText("Building an assistive agent for campus questions.")).toBeTruthy();
    expect(screen.getByText("1 open role available")).toBeTruthy();

    const requestBtn = screen.getByRole("button", { name: /Request to join AI Campus Assistant/i });
    expect(requestBtn.hasAttribute("disabled")).toBe(false);
    fireEvent.click(requestBtn);
    expect(onRequest).toHaveBeenCalledWith(sampleOpenPost);
  });

  it("disables request action with clear reason when post is closed", () => {
    const onRequest = vi.fn();
    render(<PostCard post={sampleClosedPost} onRequestJoin={onRequest} />);

    expect(screen.getByText("Post is closed")).toBeTruthy();
    const requestBtn = screen.getByRole("button", { name: /Cannot request to join/i });
    expect(requestBtn.hasAttribute("disabled")).toBe(true);
    fireEvent.click(requestBtn);
    expect(onRequest).not.toHaveBeenCalled();
  });

  it("disables request action with clear reason when post is expired", () => {
    const onRequest = vi.fn();
    render(<PostCard post={sampleExpiredPost} onRequestJoin={onRequest} />);

    expect(screen.getByText("Post has expired")).toBeTruthy();
    const requestBtn = screen.getByRole("button", { name: /Cannot request to join/i });
    expect(requestBtn.hasAttribute("disabled")).toBe(true);
    fireEvent.click(requestBtn);
    expect(onRequest).not.toHaveBeenCalled();
  });

  it("disables request action with clear reason when post is filled", () => {
    const onRequest = vi.fn();
    render(<PostCard post={sampleFilledPost} onRequestJoin={onRequest} />);

    expect(screen.getByText("All roles filled")).toBeTruthy();
    const requestBtn = screen.getByRole("button", { name: /Cannot request to join/i });
    expect(requestBtn.hasAttribute("disabled")).toBe(true);
    fireEvent.click(requestBtn);
    expect(onRequest).not.toHaveBeenCalled();
  });

  it("does not render any student contact details", () => {
    const { container } = render(<PostCard post={sampleOpenPost} />);
    const text = container.textContent || "";
    expect(text).not.toMatch(/@/);
    expect(text).not.toMatch(/\+91/);
    expect(text).not.toMatch(/email/i);
    expect(text).not.toMatch(/phone/i);
  });
});
