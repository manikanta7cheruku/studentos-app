// @vitest-environment jsdom
import { afterEach, beforeAll, describe, expect, it } from "vitest";
import { act, cleanup, render, screen } from "@testing-library/react";
import { toast } from "sonner";

import { Toaster } from "@/components/ui/sonner";

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
});

describe("Toast", () => {
  it("shows a success message", async () => {
    render(<Toaster />);
    act(() => {
      toast.success("Your profile was saved.");
    });
    expect(await screen.findByText("Your profile was saved.")).toBeTruthy();
  });

  it("shows an error message", async () => {
    render(<Toaster />);
    act(() => {
      toast.error("We could not save your profile. Try again.");
    });
    expect(await screen.findByText("We could not save your profile. Try again.")).toBeTruthy();
  });
});
