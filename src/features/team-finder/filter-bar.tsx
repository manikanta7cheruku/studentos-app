"use client";

import * as React from "react";
import { FilterIcon, RotateCcwIcon, SearchIcon } from "lucide-react";
import { cn } from "cn";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { FormField } from "@/components/ui/form-field";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import type { PostKind, PostStatus, TeamPostFilters } from "./types";

export interface FilterBarProps {
  filters: TeamPostFilters;
  onChange?: (filters: TeamPostFilters) => void;
  onApply?: (filters: TeamPostFilters) => void;
  onClear?: () => void;
  availableSkills?: string[];
  className?: string;
}

export function getActiveFilterCount(filters: TeamPostFilters): number {
  let count = 0;
  if (filters.kind && filters.kind !== "all") count += 1;
  if (filters.skill && filters.skill.trim()) count += 1;
  if (filters.status && filters.status !== "all") count += 1;
  if (filters.q && filters.q.trim()) count += 1;
  return count;
}

const DEFAULT_FILTERS: TeamPostFilters = {
  kind: "all",
  skill: "",
  status: "all",
  q: "",
};

export function FilterBar({
  filters,
  onChange,
  onApply,
  onClear,
  availableSkills,
  className,
}: FilterBarProps) {
  const [sheetOpen, setSheetOpen] = React.useState(false);
  const [localFilters, setLocalFilters] = React.useState<TeamPostFilters>(filters);

  const activeCount = getActiveFilterCount(filters);
  const localActiveCount = getActiveFilterCount(localFilters);

  const handleClear = () => {
    setLocalFilters(DEFAULT_FILTERS);
    onClear?.();
    onChange?.(DEFAULT_FILTERS);
    onApply?.(DEFAULT_FILTERS);
  };

  const handleLocalChange = (partial: Partial<TeamPostFilters>) => {
    const updated = { ...localFilters, ...partial };
    setLocalFilters(updated);
  };

  const handleApplySheet = () => {
    onApply?.(localFilters);
    onChange?.(localFilters);
    setSheetOpen(false);
  };

  const handleSheetOpenChange = (open: boolean) => {
    if (open) {
      setLocalFilters(filters);
    }
    setSheetOpen(open);
  };

  return (
    <div data-slot="team-filter-bar" className={cn("w-full min-w-0", className)}>
      {/* Phone View (< sm breakpoint): "Filters" button that opens bottom sheet */}
      <div className="flex sm:hidden items-center justify-between gap-3 w-full">
        <Dialog open={sheetOpen} onOpenChange={handleSheetOpenChange}>
          <DialogTrigger asChild>
            <Button
              type="button"
              variant="outline"
              className="flex-1 min-h-[44px] justify-between text-base px-4"
              aria-label={`Open filters. ${activeCount} active filter${activeCount === 1 ? "" : "s"}`}
            >
              <div className="flex items-center gap-2">
                <FilterIcon className="size-5 shrink-0" aria-hidden="true" />
                <span>Filters</span>
              </div>
              {activeCount > 0 ? (
                <Badge variant="default" className="ml-2">
                  {activeCount}
                </Badge>
              ) : (
                <span className="text-muted-foreground text-base">All</span>
              )}
            </Button>
          </DialogTrigger>

          {activeCount > 0 && (
            <Button
              type="button"
              variant="ghost"
              onClick={handleClear}
              className="min-h-[44px] text-base"
              aria-label="Clear active filters"
            >
              <RotateCcwIcon className="size-4 mr-1.5" aria-hidden="true" />
              Clear
            </Button>
          )}

          <DialogContent
            className={cn(
              "fixed inset-x-0 bottom-0 top-auto z-50 flex max-h-[90dvh] w-full max-w-full -translate-x-0 -translate-y-0 flex-col gap-4",
              "rounded-t-sheet rounded-b-none border-t border-border bg-popover p-6 text-base outline-none",
              "data-open:animate-in data-open:fade-in-0 data-open:slide-in-from-bottom data-closed:animate-out data-closed:fade-out-0 data-closed:slide-out-to-bottom",
            )}
          >
            <DialogHeader className="text-left pb-2">
              <div className="flex items-center justify-between">
                <DialogTitle>Filters</DialogTitle>
                {localActiveCount > 0 && <Badge variant="outline">{localActiveCount} active</Badge>}
              </div>
              <DialogDescription>
                Narrow team posts by kind, skill, status, or keyword.
              </DialogDescription>
            </DialogHeader>

            <div className="flex flex-col gap-4 overflow-y-auto py-2">
              {/* Keyword */}
              <FormField
                id="phone-filter-keyword"
                label="Search by keyword"
                help="Max 80 characters (title or description)"
              >
                <Input
                  value={localFilters.q ?? ""}
                  maxLength={80}
                  onChange={(e) => handleLocalChange({ q: e.target.value })}
                  placeholder="e.g. IoT, robotics, marketplace..."
                />
              </FormField>

              {/* Kind */}
              <FormField id="phone-filter-kind" label="Type of post">
                <Select
                  value={localFilters.kind ?? "all"}
                  onChange={(e) => handleLocalChange({ kind: e.target.value as PostKind | "all" })}
                >
                  <option value="all">All types</option>
                  <option value="project">Project</option>
                  <option value="startup">Startup</option>
                  <option value="hackathon">Hackathon</option>
                  <option value="competition">Competition</option>
                </Select>
              </FormField>

              {/* Skill */}
              <FormField id="phone-filter-skill" label="Skill required">
                {availableSkills && availableSkills.length > 0 ? (
                  <Select
                    value={localFilters.skill ?? ""}
                    onChange={(e) => handleLocalChange({ skill: e.target.value })}
                  >
                    <option value="">Any skill</option>
                    {availableSkills.map((sk) => (
                      <option key={sk} value={sk}>
                        {sk}
                      </option>
                    ))}
                  </Select>
                ) : (
                  <Input
                    value={localFilters.skill ?? ""}
                    onChange={(e) => handleLocalChange({ skill: e.target.value })}
                    placeholder="e.g. React, Python, Figma"
                  />
                )}
              </FormField>

              {/* Status */}
              <FormField id="phone-filter-status" label="Post status">
                <Select
                  value={localFilters.status ?? "all"}
                  onChange={(e) =>
                    handleLocalChange({ status: e.target.value as PostStatus | "all" })
                  }
                >
                  <option value="all">All statuses</option>
                  <option value="open">Open</option>
                  <option value="closed">Closed</option>
                  <option value="filled">Filled</option>
                  <option value="expired">Expired</option>
                </Select>
              </FormField>
            </div>

            <DialogFooter className="flex-row items-center justify-between gap-3 pt-4 border-t border-border">
              <Button
                type="button"
                variant="outline"
                onClick={handleClear}
                className="min-h-[44px] flex-1"
              >
                Clear all
              </Button>
              <Button
                type="button"
                variant="default"
                onClick={handleApplySheet}
                className="min-h-[44px] flex-1"
              >
                Apply filters
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Desktop View (>= sm breakpoint): Inline filter bar */}
      <div className="hidden sm:flex flex-wrap items-end gap-3 rounded-card border border-border bg-card p-4">
        {/* Keyword Search */}
        <div className="flex-1 min-w-[200px]">
          <FormField id="desktop-filter-keyword" label="Search" help="Keyword (max 80 chars)">
            <div className="relative">
              <SearchIcon
                className="pointer-events-none absolute left-3 top-1/2 size-5 -translate-y-1/2 text-muted-foreground"
                aria-hidden="true"
              />
              <Input
                value={filters.q ?? ""}
                maxLength={80}
                onChange={(e) => {
                  const updated = { ...filters, q: e.target.value };
                  onChange?.(updated);
                  onApply?.(updated);
                }}
                placeholder="Search posts..."
                className="pl-10"
              />
            </div>
          </FormField>
        </div>

        {/* Kind */}
        <div className="w-40 min-w-0">
          <FormField id="desktop-filter-kind" label="Type">
            <Select
              value={filters.kind ?? "all"}
              onChange={(e) => {
                const updated = { ...filters, kind: e.target.value as PostKind | "all" };
                onChange?.(updated);
                onApply?.(updated);
              }}
            >
              <option value="all">All types</option>
              <option value="project">Project</option>
              <option value="startup">Startup</option>
              <option value="hackathon">Hackathon</option>
              <option value="competition">Competition</option>
            </Select>
          </FormField>
        </div>

        {/* Skill */}
        <div className="w-44 min-w-0">
          <FormField id="desktop-filter-skill" label="Skill">
            {availableSkills && availableSkills.length > 0 ? (
              <Select
                value={filters.skill ?? ""}
                onChange={(e) => {
                  const updated = { ...filters, skill: e.target.value };
                  onChange?.(updated);
                  onApply?.(updated);
                }}
              >
                <option value="">Any skill</option>
                {availableSkills.map((sk) => (
                  <option key={sk} value={sk}>
                    {sk}
                  </option>
                ))}
              </Select>
            ) : (
              <Input
                value={filters.skill ?? ""}
                onChange={(e) => {
                  const updated = { ...filters, skill: e.target.value };
                  onChange?.(updated);
                  onApply?.(updated);
                }}
                placeholder="Skill name"
              />
            )}
          </FormField>
        </div>

        {/* Status */}
        <div className="w-36 min-w-0">
          <FormField id="desktop-filter-status" label="Status">
            <Select
              value={filters.status ?? "all"}
              onChange={(e) => {
                const updated = {
                  ...filters,
                  status: e.target.value as PostStatus | "all",
                };
                onChange?.(updated);
                onApply?.(updated);
              }}
            >
              <option value="all">All statuses</option>
              <option value="open">Open</option>
              <option value="closed">Closed</option>
              <option value="filled">Filled</option>
              <option value="expired">Expired</option>
            </Select>
          </FormField>
        </div>

        {/* Clear Filters (Desktop) */}
        {activeCount > 0 && (
          <Button
            type="button"
            variant="ghost"
            onClick={handleClear}
            className="min-h-[44px] text-base"
          >
            <RotateCcwIcon className="size-4 mr-1.5" aria-hidden="true" />
            Clear ({activeCount})
          </Button>
        )}
      </div>
    </div>
  );
}
