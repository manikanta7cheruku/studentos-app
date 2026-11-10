// @vitest-environment jsdom
import * as React from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";

vi.mock("next/navigation", () => ({
  useSearchParams: () => new URLSearchParams(),
  useRouter: () => ({ push: vi.fn(), replace: vi.fn() }),
}));
vi.mock("next/link", () => ({
  default: ({ children, href }: { children: React.ReactNode; href: string }) => (
    <a href={href}>{children}</a>
  ),
}));

// The switches are read when the file loads, so each test sets them first and loads the screen fresh.
async function load(env: Record<string, string>) {
  vi.resetModules();
  for (const [name, value] of Object.entries(env)) vi.stubEnv(name, value);
  return (await import("../signin-screen")).SigninScreen;
}

beforeEach(() => vi.unstubAllEnvs());
afterEach(() => {
  cleanup();
  vi.unstubAllEnvs();
});

describe("SigninScreen", () => {
  it("shows the email code form when email sign in is on (the default)", async () => {
    const SigninScreen = await load({});
    render(<SigninScreen />);
    const button = screen.getByRole("button", { name: /email me a code/i }) as HTMLButtonElement;
    expect(button.disabled).toBe(false);
    expect(screen.queryByText(/coming soon/i)).toBeNull();
  });

  it("shows Continue with Google only when Google sign in is switched on", async () => {
    const SigninScreen = await load({ NEXT_PUBLIC_GOOGLE_SIGNIN: "enabled" });
    render(<SigninScreen />);
    const link = screen.getByRole("link", { name: /continue with google/i });
    expect(link.getAttribute("href")).toBe("/api/v1/auth/google");
  });

  it("with email sign in disabled, shows the email form disabled with Coming soon", async () => {
    const SigninScreen = await load({
      NEXT_PUBLIC_EMAIL_SIGNIN: "disabled",
      NEXT_PUBLIC_GOOGLE_SIGNIN: "enabled",
    });
    render(<SigninScreen />);
    expect(screen.getByText(/coming soon/i)).toBeTruthy();
    expect(
      (screen.getByRole("button", { name: /email me a code/i }) as HTMLButtonElement).disabled,
    ).toBe(true);
    expect((screen.getByPlaceholderText("name@college.edu") as HTMLInputElement).disabled).toBe(
      true,
    );
    expect(screen.getByRole("link", { name: /continue with google/i })).toBeTruthy();
  });
});
