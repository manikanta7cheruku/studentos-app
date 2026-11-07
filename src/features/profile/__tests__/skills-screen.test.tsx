// @vitest-environment jsdom
import * as React from "react";
import { afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { SkillsScreen } from "../components/skills-screen";
import { sampleUserSkills } from "../sample-data";

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

describe("SkillsScreen", () => {
  it("renders current skills and proficiency levels", () => {
    render(<SkillsScreen initialSkills={sampleUserSkills} />);

    expect(screen.getByText("TypeScript")).toBeDefined();
    expect(screen.getByText("React")).toBeDefined();
    expect(screen.getByText("Next.js")).toBeDefined();
    expect(screen.getByText("Save Skills")).toBeDefined();
  });

  it("updates skill level when level button is clicked", () => {
    render(<SkillsScreen initialSkills={sampleUserSkills} />);

    // Click Level 5 for TypeScript
    const level5Btns = screen.getAllByRole("button", { name: "5 - Expert" });
    fireEvent.click(level5Btns[0]!);

    expect(screen.getByText("Level 5: Expert")).toBeDefined();
  });

  it("shows error when evidence url does not start with https://", () => {
    render(<SkillsScreen initialSkills={sampleUserSkills} />);

    const inputs = screen.getAllByPlaceholderText(/Proof of work/i);
    fireEvent.change(inputs[0]!, { target: { value: "http://insecure.com" } });

    expect(screen.getByText("Links must start with https://")).toBeDefined();
  });

  it("renders empty state when simulateEmpty is true", () => {
    render(<SkillsScreen initialSkills={[]} simulateEmpty={true} />);

    expect(screen.getByText("No skills added yet")).toBeDefined();
  });

  it("searches catalog and displays matching results", async () => {
    render(<SkillsScreen initialSkills={sampleUserSkills} />);

    const searchInput = screen.getByPlaceholderText(/Search skills/i);
    fireEvent.change(searchInput, { target: { value: "Python" } });

    await waitFor(() => {
      expect(screen.getByText("Python")).toBeDefined();
    });
  });
});
