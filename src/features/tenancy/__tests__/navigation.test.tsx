// @vitest-environment jsdom
import { afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import {
  CollegeAppShell,
  sampleCollege,
  sampleCollegeCareerDisabled,
  type College,
} from "@/features/tenancy";

let mockPathname = "/c/alpha/campus";

vi.mock("next/navigation", () => ({
  usePathname: () => mockPathname,
  useRouter: () => ({ push: vi.fn(), replace: vi.fn(), back: vi.fn() }),
}));

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
  mockPathname = "/c/alpha/campus";
});

describe("College App Shell Navigation", () => {
  it("nav shows 4 tabs with all modules on", () => {
    mockPathname = "/c/alpha/campus";

    render(
      <CollegeAppShell slug="alpha" college={sampleCollege}>
        <div>Campus content</div>
      </CollegeAppShell>,
    );

    // Verify desktop rail
    const desktopNav = screen.getByRole("navigation", { name: "Desktop primary" });
    expect(desktopNav).toBeTruthy();

    // Verify mobile bottom nav
    const mobileNav = screen.getByRole("navigation", { name: "College navigation" });
    expect(mobileNav).toBeTruthy();

    // With all modules on: Campus, Collaborate, Career, Me are all present
    const campusLinks = screen.getAllByRole("link", { name: /Campus/i });
    expect(campusLinks.length).toBeGreaterThanOrEqual(1);

    const collaborateLinks = screen.getAllByRole("link", { name: /Collaborate/i });
    expect(collaborateLinks.length).toBeGreaterThanOrEqual(1);

    const careerLinks = screen.getAllByRole("link", { name: /Career/i });
    expect(careerLinks.length).toBeGreaterThanOrEqual(1);

    const meLinks = screen.getAllByRole("link", { name: /Me/i });
    expect(meLinks.length).toBeGreaterThanOrEqual(1);

    // Check active tab has aria-current="page"
    const activeCampusLink = campusLinks.find(
      (link) => link.getAttribute("aria-current") === "page",
    );
    expect(activeCampusLink).toBeDefined();
  });

  it("nav hides the tab of a turned-off module", () => {
    mockPathname = "/c/beta/campus";

    render(
      <CollegeAppShell slug="beta" college={sampleCollegeCareerDisabled}>
        <div>Beta campus content</div>
      </CollegeAppShell>,
    );

    // Career module is turned off in sampleCollegeCareerDisabled
    expect(screen.queryByRole("link", { name: /Career/i })).toBeNull();

    // Other enabled modules are still shown
    expect(screen.getAllByRole("link", { name: /Campus/i }).length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByRole("link", { name: /Collaborate/i }).length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByRole("link", { name: /Me/i }).length).toBeGreaterThanOrEqual(1);
  });

  it("Me stays visible even when all optional modules are disabled", () => {
    const minimalCollege: College = {
      slug: "gamma",
      name: "Gamma Tech",
      short_name: "Gamma",
      accent_hex: "#1D4ED8",
      logo_url: null,
      modules: {
        campus: false,
        collaborate: false,
        career: false,
      },
    };

    mockPathname = "/c/gamma/me";

    render(
      <CollegeAppShell slug="gamma" college={minimalCollege}>
        <div>Profile content</div>
      </CollegeAppShell>,
    );

    // All optional modules are disabled
    expect(screen.queryByRole("link", { name: /Campus/i })).toBeNull();
    expect(screen.queryByRole("link", { name: /Collaborate/i })).toBeNull();
    expect(screen.queryByRole("link", { name: /Career/i })).toBeNull();

    // Me tab remains visible and accessible
    const meLinks = screen.getAllByRole("link", { name: /Me/i });
    expect(meLinks.length).toBeGreaterThanOrEqual(1);

    const activeMeLink = meLinks.find((link) => link.getAttribute("aria-current") === "page");
    expect(activeMeLink).toBeDefined();
  });
});
