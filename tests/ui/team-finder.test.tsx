// @vitest-environment jsdom
import { afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";

import {
  RoleChip,
  PostCard,
  RequestDialog,
  FilterBar,
  getActiveFilterCount,
  NoPostsEmptyState,
  NoFilterResultsEmptyState,
  NoRequestsEmptyState,
  TeamFinderEmptyState,
  sampleTeamPosts,
} from "@/features/team-finder";
import type { TeamRole, TeamPost, TeamPostFilters } from "@/features/team-finder";

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

  it("renders Closed or Expired text when postStatus is not open for unfilled roles", () => {
    const { unmount: unmount1 } = render(<RoleChip role={openRole} postStatus="closed" />);
    expect(screen.getByText("Closed")).toBeTruthy();
    unmount1();

    const { unmount: unmount2 } = render(<RoleChip role={openRole} postStatus="expired" />);
    expect(screen.getByText("Expired")).toBeTruthy();
    unmount2();

    const { unmount: unmount3 } = render(<RoleChip role={openRole} postStatus="filled" />);
    expect(screen.getByText("Filled")).toBeTruthy();
    unmount3();

    // Full role still says Full even if post is closed
    const { unmount: unmount4 } = render(<RoleChip role={fullRole} postStatus="closed" />);
    expect(screen.getByText("Full")).toBeTruthy();
    unmount4();
  });

  it("renders Filled state text on unfilled role chip when postStatus is filled", () => {
    render(<RoleChip role={openRole} postStatus="filled" selectable />);
    expect(screen.getByText("Filled")).toBeTruthy();
    expect(screen.getByText("(Filled)")).toBeTruthy();
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

  it("reflects post status in role chips for closed, expired, filled, and open posts", () => {
    // Open post: open roles still say "Open" and full roles still say "Full"
    const openPost = sampleTeamPosts.find((p) => p.status === "open")!;
    const { unmount: unmountOpen } = render(<PostCard post={openPost} />);
    const openRoleChips = screen.getByRole("list", { name: `Roles for ${openPost.title}` });
    expect(within(openRoleChips).getAllByText("Open").length).toBeGreaterThan(0);
    expect(within(openRoleChips).getAllByText("Full").length).toBeGreaterThan(0);
    unmountOpen();

    // Closed post: no role chip in a closed post says "Open"; chips show "Closed"
    const closedPost = sampleTeamPosts.find((p) => p.status === "closed")!;
    const { unmount: unmountClosed } = render(<PostCard post={closedPost} />);
    const closedRoleChips = screen.getByRole("list", { name: `Roles for ${closedPost.title}` });
    expect(within(closedRoleChips).queryByText("Open")).toBeNull();
    expect(within(closedRoleChips).getAllByText("Closed").length).toBeGreaterThan(0);
    unmountClosed();

    // Expired post: no role chip in an expired post says "Open"; chips show "Expired"
    const expiredPost = sampleTeamPosts.find((p) => p.status === "expired")!;
    const { unmount: unmountExpired } = render(<PostCard post={expiredPost} />);
    const expiredRoleChips = screen.getByRole("list", { name: `Roles for ${expiredPost.title}` });
    expect(within(expiredRoleChips).queryByText("Open")).toBeNull();
    expect(within(expiredRoleChips).getAllByText("Expired").length).toBeGreaterThan(0);
    unmountExpired();

    // Filled post: full roles say "Full"; any chip that is not full shows "Filled"
    const filledPostWithOpenRole: TeamPost = {
      ...sampleOpenPost,
      id: "p-filled-with-unfilled-role",
      status: "filled",
      roles: [openRole, fullRole],
    };
    const { unmount: unmountFilled } = render(<PostCard post={filledPostWithOpenRole} />);
    const filledRoleChips = screen.getByRole("list", {
      name: `Roles for ${filledPostWithOpenRole.title}`,
    });
    expect(within(filledRoleChips).queryByText("Open")).toBeNull();
    expect(within(filledRoleChips).getAllByText("Full").length).toBeGreaterThan(0);
    expect(within(filledRoleChips).getAllByText("Filled").length).toBeGreaterThan(0);
    unmountFilled();
  });
});

describe("RequestDialog", () => {
  it("requires a role and a message before submitting", () => {
    const handleSubmit = vi.fn();
    render(<RequestDialog post={sampleOpenPost} open onSubmit={handleSubmit} />);

    const sendBtn = screen.getByRole("button", { name: "Send request" });
    fireEvent.click(sendBtn);

    expect(handleSubmit).not.toHaveBeenCalled();
    expect(screen.getAllByText("Please choose a role to apply for.").length).toBeGreaterThanOrEqual(
      1,
    );
    expect(
      screen.getAllByText("Please write a short message explaining why you'd like to join.").length,
    ).toBeGreaterThanOrEqual(1);
    expect(screen.getByRole("alert")).toBeTruthy();
  });

  it("uses group role for role picker named 'Role to join' and focuses #request-role via error link", () => {
    render(<RequestDialog post={sampleOpenPost} open />);

    const roleGroup = screen.getByRole("group", { name: /Role to join/i });
    expect(roleGroup).toBeTruthy();
    expect(roleGroup.getAttribute("id")).toBe("request-role");
    expect(screen.queryByRole("radiogroup")).toBeNull();

    const sendBtn = screen.getByRole("button", { name: "Send request" });
    fireEvent.click(sendBtn);

    const errorLink = screen.getByRole("link", { name: "Please choose a role to apply for." });
    fireEvent.click(errorLink);
    expect(document.activeElement).toBe(roleGroup);
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
    fireEvent.change(textarea, {
      target: { value: "I would love to contribute to this hackathon project." },
    });

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
    expect(
      screen.getAllByText("You have already sent a request to join this role.").length,
    ).toBeGreaterThanOrEqual(1);
  });

  it("shows role full (SLOTS_FULL) error passed via errorCode", () => {
    render(<RequestDialog post={sampleOpenPost} open errorCode="SLOTS_FULL" />);

    expect(screen.getByRole("alert")).toBeTruthy();
    expect(
      screen.getAllByText("That role was just filled. See other open roles.").length,
    ).toBeGreaterThanOrEqual(1);
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

describe("FilterBar", () => {
  it("accurately calculates active filter count", () => {
    expect(getActiveFilterCount({})).toBe(0);
    expect(getActiveFilterCount({ kind: "all", status: "all", skill: "", q: "" })).toBe(0);
    expect(getActiveFilterCount({ kind: "hackathon" })).toBe(1);
    expect(
      getActiveFilterCount({ kind: "project", status: "open", skill: "React", q: "IoT" }),
    ).toBe(4);
  });

  it("calls onChange and onApply when desktop filters change", () => {
    const handleChange = vi.fn();
    const handleApply = vi.fn();
    const initialFilters: TeamPostFilters = { kind: "all", status: "all", skill: "", q: "" };

    render(<FilterBar filters={initialFilters} onChange={handleChange} onApply={handleApply} />);

    const searchInput = screen.getByPlaceholderText("Search posts...");
    fireEvent.change(searchInput, { target: { value: "robotics" } });

    expect(handleChange).toHaveBeenCalledWith(expect.objectContaining({ q: "robotics" }));
    expect(handleApply).toHaveBeenCalledWith(expect.objectContaining({ q: "robotics" }));
  });

  it("enforces max length 80 on search keyword input", () => {
    render(<FilterBar filters={{ q: "" }} />);
    const searchInput = screen.getByPlaceholderText("Search posts...");
    expect(searchInput.getAttribute("maxLength")).toBe("80");
  });

  it("calls onClear and resets filters when Clear is clicked", () => {
    const handleClear = vi.fn();
    const handleChange = vi.fn();
    const initialFilters: TeamPostFilters = {
      kind: "hackathon",
      status: "open",
      skill: "Python",
      q: "AI",
    };

    render(<FilterBar filters={initialFilters} onClear={handleClear} onChange={handleChange} />);

    // Active count shows Clear (4)
    const clearBtn = screen.getByRole("button", { name: /Clear \(4\)/i });
    fireEvent.click(clearBtn);

    expect(handleClear).toHaveBeenCalledTimes(1);
    expect(handleChange).toHaveBeenCalledWith({
      kind: "all",
      skill: "",
      status: "all",
      q: "",
    });
  });

  it("opens phone bottom sheet, modifies filters and applies them", async () => {
    const handleApply = vi.fn();
    render(<FilterBar filters={{ kind: "all", status: "all" }} onApply={handleApply} />);

    const openSheetBtn = screen.getByRole("button", { name: /Open filters/i });
    fireEvent.click(openSheetBtn);

    expect(screen.getByRole("dialog")).toBeTruthy();
    expect(screen.getByText("Narrow team posts by kind, skill, status, or keyword.")).toBeTruthy();

    const kindSelect = screen.getByLabelText("Type of post");
    fireEvent.change(kindSelect, { target: { value: "hackathon" } });

    const applyBtn = screen.getByRole("button", { name: "Apply filters" });
    fireEvent.click(applyBtn);

    expect(handleApply).toHaveBeenCalledWith(expect.objectContaining({ kind: "hackathon" }));
    await waitFor(() => {
      expect(screen.queryByRole("dialog")).toBeNull();
    });
  });

  it("does not call onChange or onApply while editing phone sheet until Apply filters is clicked", () => {
    const handleChange = vi.fn();
    const handleApply = vi.fn();
    render(
      <FilterBar
        filters={{ kind: "all", status: "all", skill: "", q: "" }}
        onChange={handleChange}
        onApply={handleApply}
      />,
    );

    const openSheetBtn = screen.getByRole("button", { name: /Open filters/i });
    fireEvent.click(openSheetBtn);

    const keywordInput = screen.getByLabelText("Search by keyword");
    fireEvent.change(keywordInput, { target: { value: "robotics" } });

    expect(handleChange).not.toHaveBeenCalled();
    expect(handleApply).not.toHaveBeenCalled();

    const applyBtn = screen.getByRole("button", { name: "Apply filters" });
    fireEvent.click(applyBtn);

    expect(handleChange).toHaveBeenCalledWith(expect.objectContaining({ q: "robotics" }));
    expect(handleApply).toHaveBeenCalledWith(expect.objectContaining({ q: "robotics" }));
  });

  it("discards unapplied edits when phone sheet is closed without applying and reopened", async () => {
    const handleChange = vi.fn();
    const handleApply = vi.fn();
    render(
      <FilterBar
        filters={{ kind: "all", status: "all", skill: "", q: "" }}
        onChange={handleChange}
        onApply={handleApply}
      />,
    );

    const openSheetBtn = screen.getByRole("button", { name: /Open filters/i });
    fireEvent.click(openSheetBtn);

    const keywordInput = screen.getByLabelText("Search by keyword") as HTMLInputElement;
    fireEvent.change(keywordInput, { target: { value: "robotics" } });
    expect(keywordInput.value).toBe("robotics");

    const dialog = screen.getByRole("dialog");
    fireEvent.keyDown(dialog, { key: "Escape" });

    await waitFor(() => {
      expect(screen.queryByRole("dialog")).toBeNull();
    });

    fireEvent.click(openSheetBtn);
    const reopenedInput = screen.getByLabelText("Search by keyword") as HTMLInputElement;
    expect(reopenedInput.value).toBe("");
    expect(handleChange).not.toHaveBeenCalled();
    expect(handleApply).not.toHaveBeenCalled();
  });
});

describe("Empty states", () => {
  it("renders NoPostsEmptyState with create post action", () => {
    const handleCreate = vi.fn();
    render(<NoPostsEmptyState onCreatePost={handleCreate} />);

    expect(screen.getByText("No team posts yet")).toBeTruthy();
    expect(screen.getByText(/Be the first in your college to post a team request/)).toBeTruthy();

    const createBtn = screen.getByRole("button", { name: "Post a team request" });
    fireEvent.click(createBtn);
    expect(handleCreate).toHaveBeenCalledTimes(1);
  });

  it("renders NoFilterResultsEmptyState with clear filters action", () => {
    const handleClear = vi.fn();
    render(<NoFilterResultsEmptyState onClearFilters={handleClear} />);

    expect(screen.getByText("No results for these filters")).toBeTruthy();
    expect(screen.getByText(/No team posts matched your search criteria/)).toBeTruthy();

    const clearBtn = screen.getByRole("button", { name: "Clear filters" });
    fireEvent.click(clearBtn);
    expect(handleClear).toHaveBeenCalledTimes(1);
  });

  it("renders NoRequestsEmptyState with descriptive guidance", () => {
    render(<NoRequestsEmptyState />);

    expect(screen.getByText("No requests yet")).toBeTruthy();
    expect(screen.getByText(/When students request to join your open roles/)).toBeTruthy();
  });

  it("renders all states through TeamFinderEmptyState helper", () => {
    const handleClear = vi.fn();
    render(<TeamFinderEmptyState variant="no-results" onClearFilters={handleClear} />);

    expect(screen.getByText("No results for these filters")).toBeTruthy();
    const clearBtn = screen.getByRole("button", { name: "Clear filters" });
    fireEvent.click(clearBtn);
    expect(handleClear).toHaveBeenCalledTimes(1);
  });
});
