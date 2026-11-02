// @vitest-environment jsdom
import { afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { VerificationScreen } from "../components/verification-screen";

vi.mock("sonner", () => ({
  toast: { success: vi.fn(), error: vi.fn() },
  Toaster: () => null,
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

describe("VerificationScreen: people leave the queue", () => {
  it("removes a person from the queue after Approve", async () => {
    render(<VerificationScreen />);
    const approveButtons = await screen.findAllByRole(
      "button",
      { name: "Approve" },
      { timeout: 3000 },
    );
    expect(screen.queryAllByText("Priya Sharma").length).toBeGreaterThan(0);

    const firstApprove = approveButtons[0];
    if (!firstApprove) throw new Error("No Approve button found");
    fireEvent.click(firstApprove);

    await waitFor(() => {
      expect(screen.queryAllByText("Priya Sharma")).toHaveLength(0);
    });
    expect(screen.queryAllByText("Arjun Patel").length).toBeGreaterThan(0);
  });

  it("removes a person from the queue after Reject with a reason", async () => {
    render(<VerificationScreen />);
    const rejectButtons = await screen.findAllByRole(
      "button",
      { name: "Reject" },
      { timeout: 3000 },
    );
    expect(screen.queryAllByText("Priya Sharma").length).toBeGreaterThan(0);

    const firstReject = rejectButtons[0];
    if (!firstReject) throw new Error("No Reject button found");
    fireEvent.click(firstReject);
    const dialog = await screen.findByRole("dialog");
    fireEvent.change(within(dialog).getByRole("textbox"), {
      target: { value: "Email not verified" },
    });
    fireEvent.click(within(dialog).getByRole("button", { name: "Reject" }));

    await waitFor(() => {
      expect(screen.queryAllByText("Priya Sharma")).toHaveLength(0);
    });
    expect(screen.queryAllByText("Arjun Patel").length).toBeGreaterThan(0);
  });
});
