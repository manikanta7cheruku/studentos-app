// @vitest-environment jsdom
import { afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";

import { RoleChip, PostCard, RequestDialog } from "@/features/team-finder";
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

describe("RequestDialog", () => {
  it("requires a role and a message before submitting", () => {
    const handleSubmit = vi.fn();
    render(<RequestDialog post={sampleOpenPost} open onSubmit={handleSubmit} />);

    const sendBtn = screen.getByRole("button", { name: "Send request" });
    fireEvent.click(sendBtn);

    expect(handleSubmit).not.toHaveBeenCalled();
    expect(screen.getAllByText("Please choose a role to apply for.").length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText("Please write a short message explaining why you'd like to join.").length).toBeGreaterThanOrEqual(1);
    expect(screen.getByRole("alert")).toBeTruthy();
  });

  it("blocks selecting full roles", () => {
    render(<RequestDialog post={sampleOpenPost} open />);

    const backendBtn = screen.getByRole("button", { name: /Backend Developer/i });
    expect(backendBtn.hasAttribute("disabled")).toBe(true);
  });

  it("updates character counter as user types", () => {
    render(<RequestDialog post={sampleOpenPost} open maxMessageLength={100} />);

    expect(screen.getByText("0 of 100 characters")).toBeTruthy();

    const textarea = screen.getByLabelText(/Short note to the creator/i);
    fireEvent.change(textarea, { target: { value: "Hello world" } });

    expect(screen.getByText("11 of 100 characters")).toBeTruthy();
  });

  it("submits selected role and trimmed message", async () => {
    const handleSubmit = vi.fn();
    render(<RequestDialog post={sampleOpenPost} open onSubmit={handleSubmit} />);

    const frontendRoleBtn = screen.getByRole("button", { name: /Frontend Developer/i });
    fireEvent.click(frontendRoleBtn);

    const textarea = screen.getByLabelText(/Short note to the creator/i);
    fireEvent.change(textarea, { target: { value: "I would love to contribute to this hackathon project." } });

    const sendBtn = screen.getByRole("button", { name: "Send request" });
    fireEvent.click(sendBtn);

    expect(handleSubmit).toHaveBeenCalledWith({
      postId: "p1",
      roleId: "r1",
      message: "I would love to contribute to this hackathon project.",
    });
  });

  it("shows duplicate request error passed via errorCode", () => {
    render(<RequestDialog post={sampleOpenPost} open errorCode="DUPLICATE_REQUEST" />);

    expect(screen.getByRole("alert")).toBeTruthy();
    expect(screen.getAllByText("You have already sent a request to join this role.").length).toBeGreaterThanOrEqual(1);
  });

  it("shows role full (SLOTS_FULL) error passed via errorCode", () => {
    render(<RequestDialog post={sampleOpenPost} open errorCode="SLOTS_FULL" />);

    expect(screen.getByRole("alert")).toBeTruthy();
    expect(screen.getAllByText("That role was just filled. See other open roles.").length).toBeGreaterThanOrEqual(1);
  });

  it("shows sending state with spinner when isSending is true", () => {
    render(<RequestDialog post={sampleOpenPost} open isSending />);

    const sendingBtn = screen.getByRole("button", { name: "Sending..." });
    expect(sendingBtn.hasAttribute("disabled")).toBe(true);
  });

  it("returns focus to the trigger on close", async () => {
    render(
      <RequestDialog
        post={sampleOpenPost}
        trigger={<button type="button">Open Join Modal</button>}
      />,
    );

    const triggerBtn = screen.getByRole("button", { name: "Open Join Modal" });
    triggerBtn.focus();
    expect(document.activeElement).toBe(triggerBtn);

    fireEvent.click(triggerBtn);
    expect(screen.getByRole("dialog")).toBeTruthy();

    const cancelBtn = screen.getByRole("button", { name: "Cancel" });
    fireEvent.click(cancelBtn);

    await waitFor(() => {
      expect(document.activeElement).toBe(triggerBtn);
    });
  });
});
