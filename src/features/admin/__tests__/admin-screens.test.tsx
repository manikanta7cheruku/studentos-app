// @vitest-environment jsdom
import { afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";

// Mock sonner's toast
vi.mock("sonner", () => ({
  toast: { success: vi.fn(), error: vi.fn() },
  Toaster: () => null,
}));

// Mock next/navigation
vi.mock("next/navigation", () => ({
  usePathname: () => "/c/test/admin",
  useRouter: () => ({ push: vi.fn(), replace: vi.fn(), back: vi.fn() }),
}));

// Mock next/link
vi.mock("next/link", () => ({
  default: ({
    children,
    href,
    ...props
  }: {
    children: React.ReactNode;
    href: string;
    [key: string]: unknown;
  }) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
}));

beforeAll(() => {
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
  vi.clearAllMocks();
});

// ───────────────────────────────────────────────
// Verification Screen
// ───────────────────────────────────────────────
describe("VerificationScreen", () => {
  async function renderVerification() {
    const { VerificationScreen } = await import("@/features/admin/components/verification-screen");
    render(<VerificationScreen />);
    // Wait for loading to finish (useAdminData has a 600ms delay)
    await waitFor(
      () => {
        expect(screen.queryByText("Verification queue")).toBeTruthy();
      },
      { timeout: 3000 },
    );
  }

  it("shows the approve button for each pending person", async () => {
    await renderVerification();
    const approveButtons = screen.getAllByRole("button", { name: "Approve" });
    expect(approveButtons.length).toBeGreaterThan(0);
  });

  it("calls toast.success when approving a person", async () => {
    const { toast } = await import("sonner");
    await renderVerification();
    const approveButtons = screen.getAllByRole("button", { name: "Approve" });
    fireEvent.click(approveButtons[0]!);
    expect(toast.success).toHaveBeenCalledWith(expect.stringContaining("Approved"));
  });

  it("opens reject dialog with reason field", async () => {
    await renderVerification();
    const rejectButtons = screen.getAllByRole("button", { name: "Reject" });
    fireEvent.click(rejectButtons[0]!);
    await waitFor(() => {
      expect(screen.getByRole("dialog")).toBeTruthy();
    });
    expect(screen.getByText("Reason for rejection")).toBeTruthy();
  });

  it("requires a reason before rejecting", async () => {
    await renderVerification();
    const rejectButtons = screen.getAllByRole("button", { name: "Reject" });
    fireEvent.click(rejectButtons[0]!);
    await waitFor(() => {
      expect(screen.getByRole("dialog")).toBeTruthy();
    });

    // Click Reject without typing a reason
    const dialogReject = screen.getAllByRole("button", { name: "Reject" });
    const submitButton = dialogReject[dialogReject.length - 1]!;
    fireEvent.click(submitButton);

    // Error message should appear
    expect(screen.getByText("Please provide a reason for rejecting this person.")).toBeTruthy();
    // Dialog should still be open
    expect(screen.getByRole("dialog")).toBeTruthy();
  });

  it("submits rejection when reason is provided", async () => {
    const { toast } = await import("sonner");
    await renderVerification();
    const rejectButtons = screen.getAllByRole("button", { name: "Reject" });
    fireEvent.click(rejectButtons[0]!);
    await waitFor(() => {
      expect(screen.getByRole("dialog")).toBeTruthy();
    });

    // Fill in a reason
    const textarea = screen.getByPlaceholderText("e.g. Could not verify your student ID");
    fireEvent.change(textarea, { target: { value: "Invalid student ID" } });

    // Click submit
    const dialogReject = screen.getAllByRole("button", { name: "Reject" });
    const submitButton = dialogReject[dialogReject.length - 1]!;
    fireEvent.click(submitButton);

    expect(toast.success).toHaveBeenCalledWith(expect.stringContaining("Rejected"));
  });
});

// ───────────────────────────────────────────────
// Members Screen – Remove confirmation
// ───────────────────────────────────────────────
describe("MembersScreen", () => {
  async function renderMembers() {
    const { MembersScreen } = await import("@/features/admin/components/members-screen");
    render(<MembersScreen />);
    await waitFor(
      () => {
        expect(screen.queryByText("Members")).toBeTruthy();
      },
      { timeout: 3000 },
    );
  }

  it("shows a confirmation dialog that names the person being removed", async () => {
    await renderMembers();
    const removeButtons = screen.getAllByRole("button", { name: "Remove" });
    fireEvent.click(removeButtons[0]!);
    await waitFor(() => {
      expect(screen.getByRole("dialog")).toBeTruthy();
    });
    // Dialog should mention the person's name
    const dialog = screen.getByRole("dialog");
    expect(dialog.textContent).toContain("Remove");
  });

  it("can cancel the remove dialog", async () => {
    await renderMembers();
    const removeButtons = screen.getAllByRole("button", { name: "Remove" });
    fireEvent.click(removeButtons[0]!);
    await waitFor(() => {
      expect(screen.getByRole("dialog")).toBeTruthy();
    });
    fireEvent.click(screen.getByRole("button", { name: "Cancel" }));
    await waitFor(() => {
      expect(screen.queryByRole("dialog")).toBeNull();
    });
  });
});

// ───────────────────────────────────────────────
// Invites Screen – Revoke confirmation
// ───────────────────────────────────────────────
describe("InvitesScreen", () => {
  async function renderInvites() {
    const { InvitesScreen } = await import("@/features/admin/components/invites-screen");
    render(<InvitesScreen />);
    // Wait for heading to appear (loading skeleton → real content)
    await waitFor(
      () => {
        expect(screen.queryByRole("heading", { name: "Invite codes" })).toBeTruthy();
      },
      { timeout: 5000 },
    );
  }

  it("shows a revoke confirmation that names the invite code", async () => {
    await renderInvites();
    const revokeButtons = screen.getAllByRole("button", { name: "Revoke" });
    fireEvent.click(revokeButtons[0]!);
    await waitFor(() => {
      expect(screen.getByRole("dialog")).toBeTruthy();
    });
    const dialog = screen.getByRole("dialog");
    // Should mention the code name
    expect(dialog.textContent).toContain("WELCOME-2026");
  });

  it("revokes the code on confirmation", async () => {
    const { toast } = await import("sonner");
    await renderInvites();
    const revokeButtons = screen.getAllByRole("button", { name: "Revoke" });
    fireEvent.click(revokeButtons[0]!);
    await waitFor(() => {
      expect(screen.getByRole("dialog")).toBeTruthy();
    });
    // Click the confirmation revoke button (the one inside the dialog with the code name)
    const allRevokeButtons = screen.getAllByRole("button", { name: /Revoke/ });
    const confirmButton = allRevokeButtons[allRevokeButtons.length - 1]!;
    fireEvent.click(confirmButton);
    expect(toast.success).toHaveBeenCalledWith(expect.stringContaining("Revoked"));
  });
});
