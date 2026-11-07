// @vitest-environment jsdom
import * as React from "react";
import { afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { ProfileEditScreen } from "../components/profile-edit-screen";
import { ProfileViewScreen } from "../components/profile-view-screen";
import { sampleProfile } from "../sample-data";

// Mock next/navigation
const mockPush = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: mockPush,
    refresh: vi.fn(),
  }),
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

// Mock sonner
const mockToastSuccess = vi.fn();
const mockToastError = vi.fn();
vi.mock("sonner", () => ({
  toast: {
    success: (msg: string) => mockToastSuccess(msg),
    error: (msg: string) => mockToastError(msg),
  },
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

  if (typeof global.ResizeObserver === "undefined") {
    global.ResizeObserver = class {
      observe() {}
      unobserve() {}
      disconnect() {}
    };
  }
});

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe("Visibility Toggle (college vs hidden)", () => {
  it("renders 'college' as default and allows toggling to 'hidden'", () => {
    render(<ProfileEditScreen initialProfile={sampleProfile} />);

    const collegeRadio = screen.getByRole("radio", {
      name: /Visible to your college/i,
    }) as HTMLInputElement;
    const hiddenRadio = screen.getByRole("radio", {
      name: /Hidden from classmates/i,
    }) as HTMLInputElement;

    expect(collegeRadio.checked).toBe(true);
    expect(hiddenRadio.checked).toBe(false);

    // Toggle to hidden
    fireEvent.click(hiddenRadio);

    expect(collegeRadio.checked).toBe(false);
    expect(hiddenRadio.checked).toBe(true);
  });

  it("submits the chosen visibility state to the server", async () => {
    // Mock global fetch for PATCH /api/v1/me/profile
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      headers: new Headers({ "x-request-id": "req_test_123" }),
      json: async () => ({
        data: { ...sampleProfile, visibility: "hidden" },
        meta: { request_id: "req_test_123" },
      }),
    });
    global.fetch = mockFetch;

    render(<ProfileEditScreen initialProfile={sampleProfile} />);

    const hiddenRadio = screen.getByRole("radio", { name: /Hidden from classmates/i });
    fireEvent.click(hiddenRadio);

    const saveButton = screen.getByText("Save Changes");
    fireEvent.click(saveButton);

    // Verify fetch was called with visibility: "hidden"
    expect(mockFetch).toHaveBeenCalledWith(
      "/api/v1/me/profile",
      expect.objectContaining({
        method: "PATCH",
        body: expect.stringContaining('"visibility":"hidden"'),
      }),
    );
  });

  it("displays corresponding badge in ProfileViewScreen based on visibility setting", () => {
    // 1. College visible
    const { unmount } = render(<ProfileViewScreen initialProfile={sampleProfile} />);
    expect(screen.getByText("Visible to your college")).toBeDefined();
    unmount();

    // 2. Hidden
    const hiddenProfile = { ...sampleProfile, visibility: "hidden" as const };
    render(<ProfileViewScreen initialProfile={hiddenProfile} />);
    expect(screen.getByText("Hidden from classmates")).toBeDefined();
  });
});
