"use client";

import * as React from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  RoleChip,
  PostCard,
  RequestDialog,
  FilterBar,
  NoPostsEmptyState,
  NoFilterResultsEmptyState,
  NoRequestsEmptyState,
  sampleTeamPosts,
  type TeamRole,
  type TeamPostFilters,
} from "@/features/team-finder";

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="flex flex-col gap-4">
      <h2 className="text-2xl font-semibold">{title}</h2>
      {children}
    </section>
  );
}

function StateCell({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col items-start gap-2 w-full">
      <span className="text-base text-muted-foreground">{label}</span>
      {children}
    </div>
  );
}

const sandboxRoleOpen: TeamRole = {
  id: "sb-role-1",
  role_name: "Frontend Developer",
  slots: 3,
  filled: 1,
  skills: ["React", "TypeScript", "Tailwind CSS"],
};

const sandboxRoleFull: TeamRole = {
  id: "sb-role-2",
  role_name: "Hardware Engineer",
  slots: 2,
  filled: 2,
  skills: ["Arduino", "Circuit Design"],
};

export function TeamFinderSections() {
  const [selectedRole, setSelectedRole] = React.useState<TeamRole | null>(null);
  const [desktopFilters, setDesktopFilters] = React.useState<TeamPostFilters>({
    kind: "hackathon",
    skill: "React",
    status: "open",
    q: "Campus",
  });
  const [phoneFilters, setPhoneFilters] = React.useState<TeamPostFilters>({
    kind: "all",
    skill: "",
    status: "all",
    q: "",
  });

  const openPost = sampleTeamPosts[0]!;
  const closedPost = sampleTeamPosts[1]!;
  const expiredPost = sampleTeamPosts[2]!;
  const filledPost = sampleTeamPosts[4]!;

  return (
    <>
      <Section title="Team Finder — RoleChip">
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          <StateCell label="Display: Open (1 of 3 filled)">
            <RoleChip role={sandboxRoleOpen} showSkills className="w-full" />
          </StateCell>
          <StateCell label="Display: Full (2 of 2 filled)">
            <RoleChip role={sandboxRoleFull} showSkills className="w-full" />
          </StateCell>
          <StateCell label="Selectable: Click to choose">
            <RoleChip
              role={sandboxRoleOpen}
              selectable
              selected={selectedRole?.id === sandboxRoleOpen.id}
              onSelect={setSelectedRole}
              showSkills
              className="w-full"
            />
          </StateCell>
          <StateCell label="Selectable: Full (Disabled)">
            <RoleChip
              role={sandboxRoleFull}
              selectable
              disabled
              showSkills
              className="w-full"
            />
          </StateCell>
        </div>
      </Section>

      <Section title="Team Finder — PostCard">
        <div className="grid gap-6 lg:grid-cols-2">
          <StateCell label="Open post (Request enabled)">
            <PostCard
              post={openPost}
              onRequestJoin={(post) => toast.info(`Requesting to join "${post.title}"`)}
            />
          </StateCell>

          <StateCell label="Closed post (Disabled: 'Post is closed')">
            <PostCard post={closedPost} />
          </StateCell>

          <StateCell label="Filled post (Disabled: 'All roles filled')">
            <PostCard post={filledPost} />
          </StateCell>

          <StateCell label="Expired post (Disabled: 'Post has expired')">
            <PostCard post={expiredPost} />
          </StateCell>
        </div>
      </Section>

      <Section title="Team Finder — RequestDialog">
        <div className="flex flex-wrap gap-4">
          <StateCell label="Normal state">
            <RequestDialog
              post={openPost}
              trigger={<Button>Open normal request dialog</Button>}
              onSubmit={(req) => {
                toast.success(`Request sent for role ${req.roleId}`);
              }}
            />
          </StateCell>

          <StateCell label="Duplicate error state (409)">
            <RequestDialog
              post={openPost}
              errorCode="DUPLICATE_REQUEST"
              trigger={<Button variant="outline">Duplicate request error</Button>}
            />
          </StateCell>

          <StateCell label="Role full error state (SLOTS_FULL)">
            <RequestDialog
              post={openPost}
              errorCode="SLOTS_FULL"
              trigger={<Button variant="outline">Slots full error</Button>}
            />
          </StateCell>

          <StateCell label="Sending state">
            <RequestDialog
              post={openPost}
              isSending
              trigger={<Button variant="secondary">Sending in progress</Button>}
            />
          </StateCell>
        </div>
      </Section>

      <Section title="Team Finder — FilterBar">
        <div className="flex flex-col gap-6 w-full">
          <StateCell label="Desktop inline bar (with 4 active filters)">
            <FilterBar
              filters={desktopFilters}
              onChange={setDesktopFilters}
              onClear={() =>
                setDesktopFilters({ kind: "all", skill: "", status: "all", q: "" })
              }
              availableSkills={["React", "TypeScript", "Python", "Node.js", "Figma"]}
            />
          </StateCell>

          <StateCell label="Phone bottom sheet (resize below 640px or click button)">
            <FilterBar
              filters={phoneFilters}
              onChange={setPhoneFilters}
              onClear={() => setPhoneFilters({ kind: "all", skill: "", status: "all", q: "" })}
              availableSkills={["React", "TypeScript", "Python", "Node.js", "Figma"]}
            />
          </StateCell>
        </div>
      </Section>

      <Section title="Team Finder — EmptyStates">
        <div className="flex flex-col gap-6">
          <StateCell label="No team posts yet">
            <NoPostsEmptyState
              onCreatePost={() => toast.info("Create post modal opened")}
              className="w-full"
            />
          </StateCell>

          <StateCell label="No results for these filters">
            <NoFilterResultsEmptyState
              onClearFilters={() => toast.success("Filters cleared")}
              className="w-full"
            />
          </StateCell>

          <StateCell label="No requests yet">
            <NoRequestsEmptyState className="w-full" />
          </StateCell>
        </div>
      </Section>
    </>
  );
}
