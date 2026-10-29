// @vitest-environment jsdom
import { afterEach, describe, expect, it } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import axe from "axe-core";

import { FormField } from "@/components/ui/form-field";
import { Input } from "@/components/ui/input";

afterEach(() => {
  cleanup();
});

describe("FormField", () => {
  it("links the visible label to the input", () => {
    render(
      <FormField label="College email">
        <Input type="email" />
      </FormField>,
    );
    expect(screen.getByLabelText("College email").tagName).toBe("INPUT");
  });

  it("links help text to the input with aria-describedby", () => {
    render(
      <FormField label="College email" help="Use the email your college gave you">
        <Input type="email" />
      </FormField>,
    );
    const helpId = screen.getByLabelText("College email").getAttribute("aria-describedby");
    expect(helpId).toBeTruthy();
    expect(document.getElementById(helpId as string)?.textContent).toBe(
      "Use the email your college gave you",
    );
  });

  it("links the error to the input and marks it invalid", () => {
    render(
      <FormField label="College email" error="Enter a valid college email">
        <Input type="email" />
      </FormField>,
    );
    const input = screen.getByLabelText("College email");
    expect(input.getAttribute("aria-invalid")).toBe("true");
    const errorId = input.getAttribute("aria-describedby");
    expect(errorId).toBeTruthy();
    expect(document.getElementById(errorId as string)?.textContent).toBe(
      "Enter a valid college email",
    );
  });

  it("links both help and error when both are shown", () => {
    render(
      <FormField label="Invite code" help="Ask your college" error="That code is not valid">
        <Input />
      </FormField>,
    );
    const ids = (screen.getByLabelText("Invite code").getAttribute("aria-describedby") ?? "").split(
      " ",
    );
    expect(ids).toHaveLength(2);
    for (const id of ids) {
      expect(document.getElementById(id)).not.toBeNull();
    }
  });

  it("is not marked invalid when there is no error", () => {
    render(
      <FormField label="Name">
        <Input />
      </FormField>,
    );
    const input = screen.getByLabelText("Name");
    expect(input.getAttribute("aria-invalid")).toBeNull();
    expect(input.getAttribute("aria-describedby")).toBeNull();
  });

  it("says required in words", () => {
    render(
      <FormField label="Email" required>
        <Input />
      </FormField>,
    );
    expect(screen.getByText("(required)")).toBeTruthy();
    expect(screen.getByLabelText(/Email/).getAttribute("aria-required")).toBe("true");
  });

  it("has no serious axe problems in every state", async () => {
    const { container } = render(
      <>
        <FormField label="Name">
          <Input />
        </FormField>
        <FormField label="Email" help="Use your college email" required>
          <Input type="email" />
        </FormField>
        <FormField label="Invite code" error="That code is not valid">
          <Input />
        </FormField>
      </>,
    );
    const results = await axe.run(container, { rules: { "color-contrast": { enabled: false } } });
    const serious = results.violations.filter(
      (v) => v.impact === "serious" || v.impact === "critical",
    );
    expect(serious.map((v) => `${v.id}: ${v.help}`)).toEqual([]);
  });
});
