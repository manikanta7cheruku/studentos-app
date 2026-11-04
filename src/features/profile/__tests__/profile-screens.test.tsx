// @vitest-environment jsdom
import * as React from "react";
import { afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { ProfileViewScreen } from "../components/profile-view-screen";
import { ProfileEditScreen } from "../components/profile-edit-screen";
import { sampleProfile } from "../sample-data";

// Mock next/navigation
vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: vi.fn(),
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
vi.mock("sonner", () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
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

describe("ProfileViewScreen", () => {
  it("renders profile details and visible badge", () => {
    render(<ProfileViewScreen initialProfile={sampleProfile} />);

    expect(screen.getByText("Riya Sharma")).toBeDefined();
    expect(screen.getByText("@riya_alpha")).toBeDefined();
    expect(
      screen.getByText("Second year CSE, passionate about web development and UI systems"),
    ).toBeDefined();
    expect(screen.getByText("Visible to your college")).toBeDefined();
    expect(screen.getByText("Edit Profile")).toBeDefined();
  });

  it("renders hidden badge when visibility is set to hidden", () => {
    const hiddenProfile = { ...sampleProfile, visibility: "hidden" as const };
    render(<ProfileViewScreen initialProfile={hiddenProfile} />);

    expect(screen.getByText("Hidden from classmates")).toBeDefined();
  });

  it("renders loading skeleton when loading", () => {
    render(<ProfileViewScreen initialProfile={undefined} />);
    expect(screen.getByTestId("profile-skeleton")).toBeDefined();
  });

  it("renders empty state when simulateEmpty is true", () => {
    render(<ProfileViewScreen initialProfile={sampleProfile} simulateEmpty={true} />);
    expect(screen.getByText("No profile details found")).toBeDefined();
    expect(screen.getByText("Create Profile")).toBeDefined();
  });
});

describe("ProfileEditScreen", () => {
  it("renders form fields populated with initial profile data", () => {
    render(<ProfileEditScreen initialProfile={sampleProfile} />);

    const nameInput = screen.getByLabelText(/Display Name/i) as HTMLInputElement;
    expect(nameInput.value).toBe("Riya Sharma");

    const handleInput = screen.getByLabelText(/Handle/i) as HTMLInputElement;
    expect(handleInput.value).toBe("riya_alpha");

    expect(screen.getByText("Save Changes")).toBeDefined();
  });

  it("rejects non-image file uploads in the file picker", () => {
    render(<ProfileEditScreen initialProfile={sampleProfile} />);

    const input = document.getElementById("avatar-file-input") as HTMLInputElement;
    const fakePdf = new File(["dummy content"], "resume.pdf", { type: "application/pdf" });

    fireEvent.change(input, { target: { files: [fakePdf] } });

    expect(
      screen.getByText("Please select a valid image file (PNG, JPG, WebP, GIF, SVG)."),
    ).toBeDefined();
  });

  it("rejects files larger than 2 MB in the file picker", () => {
    render(<ProfileEditScreen initialProfile={sampleProfile} />);

    const input = document.getElementById("avatar-file-input") as HTMLInputElement;
    const oversizedBlob = new Blob(["x".repeat(2 * 1024 * 1024 + 10)], { type: "image/png" });
    const fakeBigImg = new File([oversizedBlob], "huge.png", { type: "image/png" });

    fireEvent.change(input, { target: { files: [fakeBigImg] } });

    expect(screen.getByText("Image file size must be 2 MB or smaller.")).toBeDefined();
  });

  it("shows validation error when display name is cleared and submitted", () => {
    render(<ProfileEditScreen initialProfile={sampleProfile} />);

    const nameInput = screen.getByLabelText(/Display Name/i);
    fireEvent.change(nameInput, { target: { value: "" } });

    const submitBtn = screen.getByText("Save Changes");
    fireEvent.click(submitBtn);

    expect(screen.getByText("Display name is required.")).toBeDefined();
  });
});
