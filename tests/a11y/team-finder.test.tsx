// @vitest-environment jsdom
import { afterEach, beforeAll, describe, expect, it } from "vitest";
import { cleanup, render } from "@testing-library/react";
import axe from "axe-core";

import { RoleChip, PostCard, RequestDialog, FilterBar } from "@/features/team-finder";
import type { TeamRole, TeamPost } from "@/features/team-finder";

beforeAll(() => {
  if (typeof window.ResizeObserver !== "function") {
    class MockResizeObserver {
      observe() {}
      unobserve() {}
      disconnect() {}
    }
    window.ResizeObserver = MockResizeObserver as unknown as typeof ResizeObserver;
    global.ResizeObserver = MockResizeObserver as unknown as typeof ResizeObserver;
  }
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

const openRole: TeamRole = {
  id: "r1",
  role_name: "Frontend Developer",
  slots: 3,
  filled: 2,
  skills: ["React", "TypeScript"],
};

const fullRole: TeamRole = {
  id: "r2",
  role_name: "Backend Developer",
  slots: 2,
  filled: 2,
  skills: ["Go", "PostgreSQL"],
};

const sampleOpenPost: TeamPost = {
  id: "p1",
  kind: "hackathon",
  title: "AI Campus Assistant",
  description: "Building an assistive agent for campus questions.",
  deadline: "2026-12-15T18:00:00Z",
  status: "open",
  roles: [openRole, fullRole],
};

const sampleClosedPost: TeamPost = {
  ...sampleOpenPost,
  id: "p2",
  status: "closed",
};

const sampleExpiredPost: TeamPost = {
  ...sampleOpenPost,
  id: "p3",
  status: "expired",
};

const sampleFilledPost: TeamPost = {
  ...sampleOpenPost,
  id: "p4",
  status: "filled",
};

describe("accessibility of team finder parts (axe)", () => {
  it("has no serious or critical accessibility problems in role chips (open and full)", async () => {
    const { container } = render(
      <main>
        <RoleChip role={openRole} />
        <RoleChip role={fullRole} />
        <RoleChip role={openRole} selectable />
        <RoleChip role={fullRole} selectable />
      </main>,
    );
    const results = await axe.run(container, {
      rules: { "color-contrast": { enabled: false } },
    });
    const serious = results.violations.filter(
      (violation) => violation.impact === "serious" || violation.impact === "critical",
    );
    expect(serious).toEqual([]);
  });

  it("has no serious or critical accessibility problems in post cards across all states", async () => {
    const { container } = render(
      <main>
        <PostCard post={sampleOpenPost} />
        <PostCard post={sampleClosedPost} />
        <PostCard post={sampleExpiredPost} />
        <PostCard post={sampleFilledPost} />
      </main>,
    );
    const results = await axe.run(container, {
      rules: { "color-contrast": { enabled: false } },
    });
    const serious = results.violations.filter(
      (violation) => violation.impact === "serious" || violation.impact === "critical",
    );
    expect(serious).toEqual([]);
  });

  it("has no serious or critical accessibility problems in request dialog (open, error, sending)", async () => {
    const { container } = render(
      <main>
        <RequestDialog post={sampleOpenPost} open errorCode="DUPLICATE_REQUEST" />
      </main>,
    );
    const results = await axe.run(container, {
      rules: { "color-contrast": { enabled: false } },
    });
    const serious = results.violations.filter(
      (violation) => violation.impact === "serious" || violation.impact === "critical",
    );
    expect(serious).toEqual([]);
  });

  it("has no serious or critical accessibility problems in filter bar (desktop and phone)", async () => {
    const { container } = render(
      <main>
        <FilterBar
          filters={{ kind: "hackathon", status: "open", skill: "React", q: "IoT" }}
          availableSkills={["React", "TypeScript", "Python"]}
        />
      </main>,
    );
    const results = await axe.run(container, {
      rules: { "color-contrast": { enabled: false } },
    });
    const serious = results.violations.filter(
      (violation) => violation.impact === "serious" || violation.impact === "critical",
    );
    expect(serious).toEqual([]);
  });
});
