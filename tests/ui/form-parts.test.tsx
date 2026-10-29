// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import axe from "axe-core";
import { HomeIcon, UsersIcon } from "lucide-react";

import { BottomNav } from "@/components/ui/bottom-nav";
import { CheckboxField } from "@/components/ui/checkbox";
import { ErrorSummary } from "@/components/ui/error-summary";
import { FormField } from "@/components/ui/form-field";
import { Input } from "@/components/ui/input";
import { ResponsiveList } from "@/components/ui/responsive-list";
import { Select } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

afterEach(() => {
  cleanup();
});

async function seriousProblems(container: HTMLElement) {
  const results = await axe.run(container, { rules: { "color-contrast": { enabled: false } } });
  return results.violations
    .filter((v) => v.impact === "serious" || v.impact === "critical")
    .map((v) => `${v.id}: ${v.help}`);
}

describe("ErrorSummary", () => {
  it("shows nothing when there are no errors", () => {
    const { container } = render(<ErrorSummary errors={[]} />);
    expect(container.firstChild).toBeNull();
  });

  it("is an alert that takes focus and lists each message as a link", () => {
    render(
      <ErrorSummary
        errors={[
          { fieldId: "email", message: "Enter a valid college email" },
          { fieldId: "code", message: "Enter your invite code" },
        ]}
      />,
    );
    const alert = screen.getByRole("alert");
    expect(document.activeElement).toBe(alert);
    expect(screen.getByRole("heading", { name: "There is a problem" })).toBeTruthy();
    expect(screen.getAllByRole("link")).toHaveLength(2);
  });

  it("moves focus to the field when a message is clicked", () => {
    render(
      <>
        <ErrorSummary errors={[{ fieldId: "email", message: "Enter a valid college email" }]} />
        <FormField label="College email" id="email" error="Enter a valid college email">
          <Input />
        </FormField>
      </>,
    );
    fireEvent.click(screen.getByRole("link", { name: "Enter a valid college email" }));
    expect(document.activeElement).toBe(screen.getByLabelText("College email"));
  });

  it("has no serious axe problems", async () => {
    const { container } = render(
      <ErrorSummary errors={[{ fieldId: "email", message: "Enter a valid college email" }]} />,
    );
    expect(await seriousProblems(container)).toEqual([]);
  });
});

describe("Select", () => {
  it("works inside FormField and keeps the chosen value", () => {
    render(
      <FormField label="Year" help="Pick your current year">
        <Select defaultValue="2">
          <option value="1">First year</option>
          <option value="2">Second year</option>
        </Select>
      </FormField>,
    );
    const select = screen.getByLabelText("Year") as HTMLSelectElement;
    expect(select.tagName).toBe("SELECT");
    expect(select.value).toBe("2");
    fireEvent.change(select, { target: { value: "1" } });
    expect(select.value).toBe("1");
  });

  it("shows the error state and is not clickable when disabled", () => {
    render(
      <>
        <FormField label="Role" error="Choose a role">
          <Select>
            <option value="">Choose</option>
          </Select>
        </FormField>
        <FormField label="Locked">
          <Select disabled>
            <option>One</option>
          </Select>
        </FormField>
      </>,
    );
    expect(screen.getByLabelText("Role").getAttribute("aria-invalid")).toBe("true");
    expect((screen.getByLabelText("Locked") as HTMLSelectElement).disabled).toBe(true);
  });
});

describe("CheckboxField", () => {
  it("toggles when the label is clicked", () => {
    const onCheckedChange = vi.fn();
    render(
      <CheckboxField label="I agree to the Privacy Notice" onCheckedChange={onCheckedChange} />,
    );
    fireEvent.click(screen.getByText("I agree to the Privacy Notice"));
    expect(onCheckedChange).toHaveBeenCalledWith(true);
  });

  it("is not checked by default", () => {
    render(<CheckboxField label="Consent" />);
    expect(screen.getByRole("checkbox", { name: "Consent" }).getAttribute("aria-checked")).toBe(
      "false",
    );
  });

  it("links the error and marks the box invalid", () => {
    render(<CheckboxField label="Consent" error="You must agree to continue" />);
    const box = screen.getByRole("checkbox", { name: "Consent" });
    expect(box.getAttribute("aria-invalid")).toBe("true");
    const id = box.getAttribute("aria-describedby") as string;
    expect(document.getElementById(id)?.textContent).toContain("You must agree to continue");
  });

  it("cannot be changed when disabled", () => {
    const onCheckedChange = vi.fn();
    render(<CheckboxField label="Locked" disabled onCheckedChange={onCheckedChange} />);
    fireEvent.click(screen.getByRole("checkbox", { name: "Locked" }));
    expect(onCheckedChange).not.toHaveBeenCalled();
  });

  it("has no serious axe problems", async () => {
    const { container } = render(
      <>
        <CheckboxField label="Normal" />
        <CheckboxField label="With error" error="You must agree to continue" />
        <CheckboxField label="Disabled" disabled />
      </>,
    );
    expect(await seriousProblems(container)).toEqual([]);
  });
});

describe("Tabs", () => {
  function Example() {
    return (
      <Tabs defaultValue="open">
        <TabsList aria-label="Team posts">
          <TabsTrigger value="open">Open</TabsTrigger>
          <TabsTrigger value="mine">Mine</TabsTrigger>
        </TabsList>
        <TabsContent value="open">Open posts</TabsContent>
        <TabsContent value="mine">My posts</TabsContent>
      </Tabs>
    );
  }

  it("shows the first panel and has tab roles", () => {
    render(<Example />);
    expect(screen.getAllByRole("tab")).toHaveLength(2);
    expect(screen.getByRole("tab", { name: "Open" }).getAttribute("aria-selected")).toBe("true");
    expect(screen.getByRole("tabpanel").textContent).toBe("Open posts");
  });

  it("moves between tabs with the arrow keys", async () => {
    render(<Example />);
    const first = screen.getByRole("tab", { name: "Open" });
    first.focus();
    fireEvent.keyDown(first, { key: "ArrowRight" });
    await waitFor(() =>
      expect(document.activeElement).toBe(screen.getByRole("tab", { name: "Mine" })),
    );
  });

  it("has a 44px or taller tab", () => {
    render(<Example />);
    expect(screen.getByRole("tab", { name: "Open" }).className).toMatch(/\bmin-h-11\b/);
  });

  it("has no serious axe problems", async () => {
    const { container } = render(<Example />);
    expect(await seriousProblems(container)).toEqual([]);
  });
});

describe("BottomNav", () => {
  const items = [
    { href: "/", label: "Home", icon: <HomeIcon /> },
    { href: "/team-finder", label: "Teams", icon: <UsersIcon /> },
  ];

  it("is a labelled navigation with a link for each item", () => {
    render(<BottomNav items={items} currentPath="/" />);
    expect(screen.getByRole("navigation", { name: "Main" })).toBeTruthy();
    expect(screen.getAllByRole("link")).toHaveLength(2);
  });

  it("marks only the current page", () => {
    render(<BottomNav items={items} currentPath="/team-finder/posts" />);
    expect(screen.getByRole("link", { name: "Teams" }).getAttribute("aria-current")).toBe("page");
    expect(screen.getByRole("link", { name: "Home" }).getAttribute("aria-current")).toBeNull();
  });

  it("is hidden from 768px up and each link is 44px or taller", () => {
    render(<BottomNav items={items} currentPath="/" />);
    expect(screen.getByRole("navigation").className).toMatch(/\bmd:hidden\b/);
    expect(screen.getByRole("link", { name: "Home" }).className).toMatch(/\bmin-h-14\b/);
  });

  it("has no serious axe problems", async () => {
    const { container } = render(<BottomNav items={items} currentPath="/" />);
    expect(await seriousProblems(container)).toEqual([]);
  });
});

describe("ResponsiveList", () => {
  const rows = [
    { id: "1", name: "Asha", status: "Pending" },
    { id: "2", name: "Ravi", status: "Approved" },
  ];
  const columns = [
    { key: "name", header: "Name" },
    { key: "status", header: "Status" },
  ];

  it("renders a real table with headers and a caption", () => {
    render(
      <ResponsiveList
        caption="Join requests"
        columns={columns}
        rows={rows}
        getRowKey={(r) => r.id}
      />,
    );
    expect(screen.getByRole("table", { name: "Join requests" })).toBeTruthy();
    expect(screen.getAllByRole("columnheader")).toHaveLength(2);
  });

  it("renders the same rows as a phone list", () => {
    render(
      <ResponsiveList
        caption="Join requests"
        columns={columns}
        rows={rows}
        getRowKey={(r) => r.id}
      />,
    );
    expect(screen.getByRole("list", { name: "Join requests" }).children).toHaveLength(2);
  });

  it("switches between table and list with breakpoint classes", () => {
    render(
      <ResponsiveList
        caption="Join requests"
        columns={columns}
        rows={rows}
        getRowKey={(r) => r.id}
      />,
    );
    expect(screen.getByRole("table").className).toMatch(/\bhidden\b.*\bmd:table\b/);
    expect(screen.getByRole("list").className).toMatch(/\bmd:hidden\b/);
  });

  it("uses a custom cell when given", () => {
    render(
      <ResponsiveList
        caption="Join requests"
        columns={[{ key: "name", header: "Name", cell: (r) => <strong>{String(r.name)}!</strong> }]}
        rows={rows}
        getRowKey={(r) => r.id}
      />,
    );
    expect(screen.getAllByText("Asha!").length).toBeGreaterThan(0);
  });

  it("has no serious axe problems", async () => {
    const { container } = render(
      <ResponsiveList
        caption="Join requests"
        columns={columns}
        rows={rows}
        getRowKey={(r) => r.id}
      />,
    );
    expect(await seriousProblems(container)).toEqual([]);
  });
});
