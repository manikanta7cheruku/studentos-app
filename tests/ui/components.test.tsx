// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";

import { Badge } from "@/components/ui/badge";
import { Banner } from "@/components/ui/banner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";

afterEach(() => {
  cleanup();
});

describe("Button", () => {
  it("shows its text and handles a click", () => {
    const onClick = vi.fn();
    render(<Button onClick={onClick}>Save</Button>);
    fireEvent.click(screen.getByRole("button", { name: "Save" }));
    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it("does not fire when disabled", () => {
    const onClick = vi.fn();
    render(
      <Button disabled onClick={onClick}>
        Save
      </Button>,
    );
    const button = screen.getByRole("button", { name: "Save" });
    fireEvent.click(button);
    expect(button.hasAttribute("disabled")).toBe(true);
    expect(onClick).not.toHaveBeenCalled();
  });

  it("has a tap-friendly size class for every size (at least h-9, about 32px on a phone)", () => {
    const sizes = ["default", "xs", "sm", "lg", "icon", "icon-xs", "icon-sm", "icon-lg"] as const;
    for (const size of sizes) {
      render(<Button size={size}>{size}</Button>);
      const className = screen.getByRole("button", { name: size }).className;
      expect(className, `size ${size}`).toMatch(/\b(h|size)-(9|1[012])\b/);
      cleanup();
    }
  });
});

describe("Label, Input and Textarea", () => {
  it("links a visible label to its input", () => {
    render(
      <>
        <Label htmlFor="email">College email</Label>
        <Input id="email" type="email" />
      </>,
    );
    expect(screen.getByLabelText("College email").tagName).toBe("INPUT");
  });

  it("can be disabled or marked invalid", () => {
    render(
      <>
        <Input aria-label="Bad" aria-invalid="true" />
        <Input aria-label="Locked" disabled />
      </>,
    );
    expect(screen.getByLabelText("Bad").getAttribute("aria-invalid")).toBe("true");
    expect(screen.getByLabelText("Locked").hasAttribute("disabled")).toBe(true);
  });

  it("links a visible label to its textarea and can show an error", () => {
    render(
      <>
        <Label htmlFor="about">About your project</Label>
        <Textarea id="about" aria-invalid="true" />
      </>,
    );
    const field = screen.getByLabelText("About your project");
    expect(field.tagName).toBe("TEXTAREA");
    expect(field.getAttribute("aria-invalid")).toBe("true");
  });
});

describe("Card", () => {
  it("shows its title, description and content", () => {
    render(
      <Card>
        <CardHeader>
          <CardTitle>Hackathon team</CardTitle>
          <CardDescription>Needs 2 more people.</CardDescription>
        </CardHeader>
        <CardContent>Looking for a designer.</CardContent>
      </Card>,
    );
    expect(screen.getByText("Hackathon team")).toBeTruthy();
    expect(screen.getByText("Needs 2 more people.")).toBeTruthy();
    expect(screen.getByText("Looking for a designer.")).toBeTruthy();
  });
});

describe("Badge", () => {
  it("shows its text and variant", () => {
    render(<Badge variant="success">Approved</Badge>);
    expect(screen.getByText("Approved").getAttribute("data-variant")).toBe("success");
  });
});

describe("Skeleton", () => {
  it("is hidden from screen readers", () => {
    const { container } = render(<Skeleton className="h-5 w-32" />);
    const element = container.querySelector("[data-slot='skeleton']");
    expect(element?.getAttribute("aria-hidden")).toBe("true");
  });
});

describe("EmptyState", () => {
  it("tells the user what to do next", () => {
    render(
      <EmptyState
        title="No team posts yet"
        description="Be the first to post."
        action={<Button>Post a team request</Button>}
      />,
    );
    expect(screen.getByRole("heading", { name: "No team posts yet" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "Post a team request" })).toBeTruthy();
  });
});

describe("Banner", () => {
  it("announces errors as an alert", () => {
    render(
      <Banner variant="error" title="Could not load teams">
        Try again.
      </Banner>,
    );
    expect(screen.getByRole("alert").textContent).toContain("Could not load teams");
  });

  it("uses a polite status role for information", () => {
    render(
      <Banner variant="info" title="Waiting for approval">
        An admin will approve you.
      </Banner>,
    );
    expect(screen.getByRole("status").textContent).toContain("Waiting for approval");
  });
});
