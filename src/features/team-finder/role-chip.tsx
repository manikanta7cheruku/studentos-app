"use client";

import * as React from "react";
import { cn } from "cn";
import type { TeamRole } from "./types";

export interface RoleChipProps {
  role: TeamRole;
  selected?: boolean;
  onSelect?: (role: TeamRole) => void;
  selectable?: boolean;
  disabled?: boolean;
  showSkills?: boolean;
  className?: string;
}

/**
 * RoleChip displays a role name, its filled/slots ratio ("2 of 3 filled"),
 * and an explicit textual state ("Open" or "Full", not color alone).
 * Full roles are disabled and cannot be selected.
 */
export function RoleChip({
  role,
  selected = false,
  onSelect,
  selectable = false,
  disabled = false,
  showSkills = false,
  className,
}: RoleChipProps) {
  const isFull = role.filled >= role.slots;
  const isInteractive = selectable || typeof onSelect === "function";
  const isDisabled = disabled || (isInteractive && isFull);

  const statusText = isFull ? "Full" : "Open";
  const ratioText = `${role.filled} of ${role.slots} filled`;

  const content = (
    <>
      <div className="flex flex-wrap items-center gap-2">
        <span className="font-semibold text-foreground">{role.role_name}</span>
        <span
          className={cn(
            "rounded-input border px-2 py-0.5 text-base font-medium",
            isFull
              ? "border-border-strong bg-muted/60 text-muted-foreground"
              : "border-primary/30 bg-primary/10 text-primary",
          )}
        >
          {statusText}
        </span>
      </div>

      <div className="flex flex-wrap items-center gap-2 text-base text-muted-foreground">
        <span>{ratioText}</span>
        {isFull && isInteractive && (
          <span className="text-destructive font-medium">(Role full)</span>
        )}
      </div>

      {showSkills && role.skills && role.skills.length > 0 && (
        <div className="flex flex-wrap gap-1.5 pt-1">
          {role.skills.map((skill) => (
            <span
              key={skill}
              className="rounded-input border border-border bg-surface px-2 py-0.5 text-base text-muted-foreground"
            >
              {skill}
            </span>
          ))}
        </div>
      )}
    </>
  );

  if (isInteractive) {
    return (
      <button
        type="button"
        disabled={isDisabled}
        aria-pressed={selected}
        aria-disabled={isDisabled}
        onClick={() => {
          if (!isDisabled && onSelect) {
            onSelect(role);
          }
        }}
        className={cn(
          "flex min-h-[44px] w-full flex-col items-start justify-center gap-1 rounded-card border p-3 text-left transition-colors",
          "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring",
          selected
            ? "border-primary bg-primary/10 ring-1 ring-primary"
            : "border-border bg-surface hover:bg-accent/40",
          isDisabled &&
            "cursor-not-allowed opacity-60 hover:bg-surface border-dashed border-border-strong",
          className,
        )}
      >
        {content}
      </button>
    );
  }

  return (
    <div
      data-slot="role-chip"
      className={cn(
        "flex min-h-[44px] flex-col items-start justify-center gap-1 rounded-card border border-border bg-surface p-3 text-left",
        isFull && "border-dashed bg-muted/20",
        className,
      )}
    >
      {content}
    </div>
  );
}
