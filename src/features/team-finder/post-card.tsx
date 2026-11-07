"use client";

import * as React from "react";
import { CalendarIcon, AlertCircleIcon } from "lucide-react";
import { cn } from "cn";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { TeamPost } from "./types";
import { RoleChip } from "./role-chip";

export interface PostCardProps {
  post: TeamPost;
  onRequestJoin?: (post: TeamPost) => void;
  className?: string;
}

const KIND_LABELS: Record<TeamPost["kind"], string> = {
  project: "Project",
  startup: "Startup",
  hackathon: "Hackathon",
  competition: "Competition",
};

function formatDeadline(deadline: string | null): string {
  if (!deadline) {
    return "No deadline";
  }
  try {
    const date = new Date(deadline);
    if (Number.isNaN(date.getTime())) {
      return "No deadline";
    }
    return new Intl.DateTimeFormat("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    }).format(date);
  } catch {
    return "No deadline";
  }
}

/**
 * PostCard represents a team finder listing as an accessible <article>.
 * Disables "Request to join" with a clear textual reason when closed, filled, or expired.
 * Never displays contact details.
 */
export function PostCard({ post, onRequestJoin, className }: PostCardProps) {
  const allRolesFull =
    post.roles.length > 0 && post.roles.every((role) => role.filled >= role.slots);

  let disabledReason: string | null = null;
  if (post.status === "closed") {
    disabledReason = "Post is closed";
  } else if (post.status === "expired") {
    disabledReason = "Post has expired";
  } else if (post.status === "filled" || allRolesFull) {
    disabledReason = "All roles filled";
  }

  const isRequestDisabled = Boolean(disabledReason);

  const statusBadgeVariant =
    post.status === "open" && !allRolesFull
      ? "outline"
      : post.status === "filled" || allRolesFull
        ? "secondary"
        : "destructive";

  const statusText =
    post.status === "open" && allRolesFull
      ? "Filled"
      : post.status.charAt(0).toUpperCase() + post.status.slice(1);

  return (
    <article
      data-slot="team-post-card"
      className={cn(
        "flex min-w-0 w-full flex-col gap-4 rounded-card border border-border bg-card p-6 text-base text-card-foreground",
        "focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-2",
        className,
      )}
    >
      {/* Header: Kind badge, Status, and Deadline */}
      <header className="flex flex-wrap items-center justify-between gap-2 border-b border-border pb-3">
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="outline">{KIND_LABELS[post.kind] || post.kind}</Badge>
          <Badge variant={statusBadgeVariant}>{statusText}</Badge>
        </div>

        <div className="flex items-center gap-1.5 text-base text-muted-foreground">
          <CalendarIcon className="size-5 shrink-0" aria-hidden="true" />
          <span>{formatDeadline(post.deadline)}</span>
        </div>
      </header>

      {/* Title & Description */}
      <div className="flex flex-col gap-2 min-w-0">
        <h3 className="font-heading text-xl font-semibold break-words">{post.title}</h3>
        <p className="text-base text-muted-foreground break-words leading-relaxed">
          {post.description}
        </p>
      </div>

      {/* Roles Needed */}
      <div className="flex flex-col gap-2">
        <h4 className="text-base font-semibold text-foreground">Roles needed</h4>
        <ul
          aria-label={`Roles for ${post.title}`}
          className="flex flex-col gap-2 m-0 p-0 list-none"
        >
          {post.roles.map((role) => (
            <li key={role.id}>
              <RoleChip role={role} postStatus={post.status} showSkills />
            </li>
          ))}
        </ul>
      </div>

      {/* Action footer */}
      <footer className="flex flex-wrap items-center justify-between gap-3 border-t border-border pt-3">
        {isRequestDisabled ? (
          <div role="status" className="flex items-center gap-2 text-base text-muted-foreground">
            <AlertCircleIcon className="size-5 shrink-0 text-muted-foreground" aria-hidden="true" />
            <span>{disabledReason}</span>
          </div>
        ) : (
          <div className="text-base text-muted-foreground">
            {post.roles.filter((r) => r.filled < r.slots).length} open role
            {post.roles.filter((r) => r.filled < r.slots).length === 1 ? "" : "s"} available
          </div>
        )}

        <Button
          type="button"
          disabled={isRequestDisabled}
          aria-disabled={isRequestDisabled}
          aria-label={
            isRequestDisabled
              ? `Cannot request to join ${post.title}: ${disabledReason}`
              : `Request to join ${post.title}`
          }
          onClick={() => {
            if (!isRequestDisabled && onRequestJoin) {
              onRequestJoin(post);
            }
          }}
          className="min-h-[44px]"
        >
          Request to join
        </Button>
      </footer>
    </article>
  );
}
