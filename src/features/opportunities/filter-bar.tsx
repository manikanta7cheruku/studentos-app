"use client";

import * as React from "react";
import { CheckIcon, FilterIcon, RotateCcwIcon, SearchIcon, XIcon } from "lucide-react";
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
import type {
  OpportunityDeadlineFilter,
  OpportunityFilters,
  OpportunityKind,
  OpportunityMode,
} from "./types";

export interface FilterBarProps {
  filters: OpportunityFilters;
  onChange?: (filters: OpportunityFilters) => void;
  onApply?: (filters: OpportunityFilters) => void;
  onClear?: () => void;
  availableSkills?: string[];
  className?: string;
}

const ALL_KINDS: { id: OpportunityKind; label: string }[] = [
  { id: "internship", label: "Internship" },
  { id: "job", label: "Job" },
  { id: "hackathon", label: "Hackathon" },
  { id: "competition", label: "Competition" },
  { id: "scholarship", label: "Scholarship" },
];

export const DEFAULT_OPPORTUNITY_FILTERS: OpportunityFilters = {
  kinds: [],
  skills: [],
  mode: "all",
  location: "",
  deadline: "any",
};

export function getActiveFilterCount(filters: OpportunityFilters): number {
  let count = 0;
  if (filters.kinds && filters.kinds.length > 0) count += filters.kinds.length;
  if (filters.skills && filters.skills.length > 0) count += filters.skills.length;
  if (filters.mode && filters.mode !== "all") count += 1;
  if (filters.location && filters.location.trim().length > 0) count += 1;
  if (filters.deadline && filters.deadline !== "any") count += 1;
  return count;
}

export function FilterBar({
  filters,
  onChange,
  onApply,
  onClear,
  availableSkills = [],
  className,
}: FilterBarProps) {
  const [sheetOpen, setSheetOpen] = React.useState(false);
  const [localFilters, setLocalFilters] = React.useState<OpportunityFilters>(filters);
  const [skillInput, setSkillInput] = React.useState("");

  const activeCount = getActiveFilterCount(filters);
  const localActiveCount = getActiveFilterCount(localFilters);

  const handleClear = () => {
    setLocalFilters(DEFAULT_OPPORTUNITY_FILTERS);
    setSkillInput("");
    onClear?.();
    onChange?.(DEFAULT_OPPORTUNITY_FILTERS);
    onApply?.(DEFAULT_OPPORTUNITY_FILTERS);
  };

  const handleToggleKind = (kind: OpportunityKind, isLocal = false) => {
    const targetFilters = isLocal ? localFilters : filters;
    const exists = targetFilters.kinds.includes(kind);
    const newKinds = exists
      ? targetFilters.kinds.filter((k) => k !== kind)
      : [...targetFilters.kinds, kind];

    const updated = { ...targetFilters, kinds: newKinds };
    if (isLocal) {
      setLocalFilters(updated);
    } else {
      onChange?.(updated);
      onApply?.(updated);
    }
  };

  const handleAddSkill = (skillToAdd: string, isLocal = false) => {
    const trimmed = skillToAdd.trim();
    if (!trimmed) return;
    const targetFilters = isLocal ? localFilters : filters;
    if (targetFilters.skills.some((s) => s.toLowerCase() === trimmed.toLowerCase())) {
      setSkillInput("");
      return;
    }
    const updated = {
      ...targetFilters,
      skills: [...targetFilters.skills, trimmed],
    };
    setSkillInput("");
    if (isLocal) {
      setLocalFilters(updated);
    } else {
      onChange?.(updated);
      onApply?.(updated);
    }
  };

  const handleRemoveSkill = (skillToRemove: string, isLocal = false) => {
    const targetFilters = isLocal ? localFilters : filters;
    const updated = {
      ...targetFilters,
      skills: targetFilters.skills.filter((s) => s !== skillToRemove),
    };
    if (isLocal) {
      setLocalFilters(updated);
    } else {
      onChange?.(updated);
      onApply?.(updated);
    }
  };

  const handleModeChange = (modeValue: string, isLocal = false) => {
    const mode = (modeValue || "all") as OpportunityMode | "all";
    const targetFilters = isLocal ? localFilters : filters;
    const updated = { ...targetFilters, mode };
    if (isLocal) {
      setLocalFilters(updated);
    } else {
      onChange?.(updated);
      onApply?.(updated);
    }
  };

  const handleLocationChange = (loc: string, isLocal = false) => {
    const targetFilters = isLocal ? localFilters : filters;
    const updated = { ...targetFilters, location: loc };
    if (isLocal) {
      setLocalFilters(updated);
    } else {
      onChange?.(updated);
      onApply?.(updated);
    }
  };

  const handleDeadlineChange = (deadlineVal: string, isLocal = false) => {
    const deadline = (deadlineVal || "any") as OpportunityDeadlineFilter;
    const targetFilters = isLocal ? localFilters : filters;
    const updated = { ...targetFilters, deadline };
    if (isLocal) {
      setLocalFilters(updated);
    } else {
      onChange?.(updated);
      onApply?.(updated);
    }
  };

  const handleApplySheet = () => {
    onApply?.(localFilters);
    onChange?.(localFilters);
    setSheetOpen(false);
  };

  const filteredSkillSuggestions = skillInput.trim()
    ? availableSkills
        .filter(
          (s) =>
            s.toLowerCase().includes(skillInput.toLowerCase()) &&
            !filters.skills.some((sel) => sel.toLowerCase() === s.toLowerCase()),
        )
        .slice(0, 5)
    : [];

  return (
    <div data-slot="opportunity-filter-bar" className={cn("w-full min-w-0 space-y-4", className)}>
      {/* Mobile view (< sm breakpoint / <640px) */}
      <div className="flex flex-wrap sm:hidden items-center justify-between gap-3 w-full min-w-0 max-w-full">
        <Dialog
          open={sheetOpen}
          onOpenChange={(open) => {
            if (open) setLocalFilters(filters);
            setSheetOpen(open);
          }}
        >
          <DialogTrigger asChild>
            <Button
              type="button"
              variant="outline"
              className="flex-1 min-w-0 min-h-[44px] justify-between text-base px-3"
              aria-label={`Open filters. ${activeCount} active filter${activeCount === 1 ? "" : "s"}`}
            >
              <div className="flex items-center gap-2 min-w-0">
                <FilterIcon className="size-5 shrink-0" aria-hidden="true" />
                <span className="font-medium truncate">Filter opportunities</span>
              </div>
              {activeCount > 0 ? (
                <Badge variant="secondary" className="ml-2 shrink-0 px-2 py-0.5 font-bold">
                  {activeCount}
                </Badge>
              ) : null}
            </Button>
          </DialogTrigger>

          <DialogContent className="w-full max-w-lg p-4 sm:p-6 max-h-[90vh] overflow-y-auto min-w-0 max-w-full">
            <DialogHeader>
              <DialogTitle>Filter Opportunities</DialogTitle>
              <DialogDescription>
                Narrow curated opportunities by type, skills, mode, and deadlines.
              </DialogDescription>
            </DialogHeader>

            <div className="flex flex-col gap-5 py-4">
              {/* Type = kind multi-select */}
              <div className="flex flex-col gap-2 min-w-0 max-w-full">
                <span className="text-base font-semibold text-ink">Type</span>
                <div className="flex flex-wrap gap-2" role="group" aria-label="Opportunity types">
                  {ALL_KINDS.map((kind) => {
                    const isSelected = localFilters.kinds.includes(kind.id);
                    return (
                      <Button
                        key={kind.id}
                        type="button"
                        variant="outline"
                        className={cn(
                          "min-h-[44px] gap-1.5 px-3 transition-colors",
                          isSelected
                            ? "border-primary bg-primary/10 text-primary font-semibold ring-1 ring-primary hover:bg-primary/15"
                            : "border-border-strong bg-surface text-foreground hover:bg-accent/40 font-normal",
                        )}
                        aria-pressed={isSelected}
                        onClick={() => handleToggleKind(kind.id, true)}
                      >
                        {isSelected && (
                          <CheckIcon className="size-4 shrink-0 text-primary" aria-hidden="true" />
                        )}
                        <span>{kind.label}</span>
                      </Button>
                    );
                  })}
                </div>
              </div>

              {/* Skills search and chips */}
              <div className="flex flex-col gap-2">
                <label htmlFor="mobile-skill-input" className="text-base font-semibold text-ink">
                  Skills
                </label>
                <p className="text-base text-ink-muted">Type and press enter to add a skill</p>
                <Input
                  id="mobile-skill-input"
                  value={skillInput}
                  onChange={(e) => setSkillInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      handleAddSkill(skillInput, true);
                    }
                  }}
                  placeholder="e.g. React, Python"
                  className="min-h-[44px] text-base"
                />
                {filteredSkillSuggestions.length > 0 ? (
                  <div className="flex flex-wrap gap-1.5 pt-1">
                    {filteredSkillSuggestions.map((s) => (
                      <Button
                        key={s}
                        type="button"
                        variant="outline"
                        className="min-h-[44px] text-base px-2 py-1"
                        onClick={() => handleAddSkill(s, true)}
                      >
                        + {s}
                      </Button>
                    ))}
                  </div>
                ) : null}

                {localFilters.skills.length > 0 ? (
                  <div
                    role="group"
                    aria-label="Active skill filters"
                    className="flex flex-wrap gap-1.5 pt-1"
                  >
                    {localFilters.skills.map((skill) => (
                      <Badge
                        key={skill}
                        variant="secondary"
                        className="gap-1 px-2.5 py-1 text-base font-medium"
                      >
                        <span>{skill}</span>
                        <button
                          type="button"
                          onClick={() => handleRemoveSkill(skill, true)}
                          className="min-h-[44px] min-w-[44px] -mr-1 inline-flex items-center justify-center rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                          aria-label={`Remove skill ${skill}`}
                        >
                          <XIcon className="size-4" aria-hidden="true" />
                        </button>
                      </Badge>
                    ))}
                  </div>
                ) : null}
              </div>

              {/* Mode and Location */}
              <div className="grid grid-cols-1 gap-4">
                <FormField id="mobile-mode-select" label="Mode">
                  <Select
                    id="mobile-mode-select"
                    value={localFilters.mode || "all"}
                    onChange={(e) => handleModeChange(e.target.value, true)}
                    className="min-h-[44px] text-base"
                  >
                    <option value="all">All modes</option>
                    <option value="onsite">Onsite</option>
                    <option value="remote">Remote</option>
                    <option value="hybrid">Hybrid</option>
                  </Select>
                </FormField>

                <FormField id="mobile-location-input" label="Location">
                  <Input
                    id="mobile-location-input"
                    value={localFilters.location || ""}
                    onChange={(e) => handleLocationChange(e.target.value, true)}
                    placeholder="Search city or location..."
                    className="min-h-[44px] text-base"
                  />
                </FormField>
              </div>

              {/* Deadline filter */}
              <FormField
                id="mobile-deadline-select"
                label="Deadline"
                help="Deadline-less items remain visible unless 'hide closed' excludes them"
              >
                <Select
                  id="mobile-deadline-select"
                  value={localFilters.deadline || "any"}
                  onChange={(e) => handleDeadlineChange(e.target.value, true)}
                  className="min-h-[44px] text-base"
                >
                  <option value="any">Any deadline</option>
                  <option value="7d">Next 7 days</option>
                  <option value="30d">Next 30 days</option>
                  <option value="hide_closed">Hide closed</option>
                </Select>
              </FormField>
            </div>

            <DialogFooter className="flex flex-row items-center justify-between gap-3 pt-4 border-t border-border">
              <Button
                type="button"
                variant="outline"
                onClick={handleClear}
                disabled={localActiveCount === 0}
                className="min-h-[44px] gap-2"
              >
                <RotateCcwIcon className="size-4" aria-hidden="true" />
                <span>Clear all</span>
              </Button>
              <Button type="button" onClick={handleApplySheet} className="min-h-[44px] px-6">
                Apply ({localActiveCount})
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {activeCount > 0 ? (
          <Button
            type="button"
            variant="ghost"
            onClick={handleClear}
            className="min-h-[44px] shrink-0 gap-1.5 text-base text-ink-muted hover:text-ink px-3"
            aria-label="Clear all filters"
          >
            <RotateCcwIcon className="size-4" aria-hidden="true" />
            <span>Clear</span>
          </Button>
        ) : null}
      </div>

      {/* Desktop view (>= sm breakpoint / >=640px) */}
      <div className="hidden sm:flex flex-col gap-4 rounded-card border border-border bg-card p-5 min-w-0 max-w-full">
        <div className="flex flex-wrap items-center justify-between gap-3 pb-2 border-b border-border min-w-0 max-w-full">
          <div className="flex items-center gap-2 min-w-0">
            <FilterIcon className="size-5 text-ink-muted shrink-0" aria-hidden="true" />
            <span className="font-heading text-lg font-semibold text-ink">Filters</span>
            {activeCount > 0 ? (
              <Badge variant="secondary" className="px-2 font-bold shrink-0">
                {activeCount} active
              </Badge>
            ) : null}
          </div>

          {activeCount > 0 ? (
            <Button
              type="button"
              variant="outline"
              onClick={handleClear}
              className="min-h-[44px] shrink-0 gap-1.5 text-base px-3"
              aria-label="Clear all filters"
            >
              <RotateCcwIcon className="size-4" aria-hidden="true" />
              <span>Clear filters</span>
            </Button>
          ) : null}
        </div>

        {/* 1. Type = kind (multi-select) */}
        <div className="flex flex-col gap-2 min-w-0 max-w-full">
          <span className="text-base font-semibold text-ink">Type</span>
          <div className="flex flex-wrap gap-2" role="group" aria-label="Opportunity types">
            {ALL_KINDS.map((kind) => {
              const isSelected = filters.kinds.includes(kind.id);
              return (
                <Button
                  key={kind.id}
                  type="button"
                  variant="outline"
                  className={cn(
                    "min-h-[44px] gap-1.5 px-3 transition-colors",
                    isSelected
                      ? "border-primary bg-primary/10 text-primary font-semibold ring-1 ring-primary hover:bg-primary/15"
                      : "border-border-strong bg-surface text-foreground hover:bg-accent/40 font-normal",
                  )}
                  aria-pressed={isSelected}
                  onClick={() => handleToggleKind(kind.id, false)}
                >
                  {isSelected && (
                    <CheckIcon className="size-4 shrink-0 text-primary" aria-hidden="true" />
                  )}
                  <span>{kind.label}</span>
                </Button>
              );
            })}
          </div>
        </div>

        {/* 2. Skills search chips (match any) */}
        <div className="flex flex-col gap-2">
          <label htmlFor="desktop-skill-input" className="text-base font-semibold text-ink">
            Skills
          </label>
          <div className="flex flex-wrap items-center gap-2">
            <div className="relative min-w-[240px] max-w-sm flex-1">
              <Input
                id="desktop-skill-input"
                value={skillInput}
                onChange={(e) => setSkillInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    handleAddSkill(skillInput, false);
                  }
                }}
                placeholder="Search skills (e.g. React, Python)..."
                className="min-h-[44px] text-base"
              />
            </div>
            {filteredSkillSuggestions.map((s) => (
              <Button
                key={s}
                type="button"
                variant="outline"
                className="min-h-[44px] text-base px-3"
                onClick={() => handleAddSkill(s, false)}
              >
                + {s}
              </Button>
            ))}
          </div>

          {filters.skills.length > 0 ? (
            <div
              role="group"
              aria-label="Active skill filters"
              className="flex flex-wrap gap-1.5 pt-1"
            >
              {filters.skills.map((skill) => (
                <Badge
                  key={skill}
                  variant="secondary"
                  className="gap-1 px-3 py-1 text-base font-medium"
                >
                  <span>{skill}</span>
                  <button
                    type="button"
                    onClick={() => handleRemoveSkill(skill, false)}
                    className="min-h-[44px] min-w-[44px] -mr-1 inline-flex items-center justify-center rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    aria-label={`Remove skill ${skill}`}
                  >
                    <XIcon className="size-4" aria-hidden="true" />
                  </button>
                </Badge>
              ))}
            </div>
          ) : null}
        </div>

        {/* 3. Location (Mode + Location text) and 4. Deadline */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-1">
          <div>
            <label
              htmlFor="desktop-mode-select"
              className="text-base font-semibold text-ink mb-1.5 block"
            >
              Mode
            </label>
            <Select
              id="desktop-mode-select"
              value={filters.mode || "all"}
              onChange={(e) => handleModeChange(e.target.value, false)}
              className="min-h-[44px] text-base w-full"
            >
              <option value="all">All modes</option>
              <option value="onsite">Onsite</option>
              <option value="remote">Remote</option>
              <option value="hybrid">Hybrid</option>
            </Select>
          </div>

          <div>
            <label
              htmlFor="desktop-location-input"
              className="text-base font-semibold text-ink mb-1.5 block"
            >
              Location
            </label>
            <div className="relative">
              <Input
                id="desktop-location-input"
                value={filters.location || ""}
                onChange={(e) => handleLocationChange(e.target.value, false)}
                placeholder="City or state..."
                className="min-h-[44px] text-base w-full pl-9"
              />
              <SearchIcon
                className="size-4 text-ink-muted absolute left-3 top-3.5"
                aria-hidden="true"
              />
            </div>
          </div>

          <div>
            <label
              htmlFor="desktop-deadline-select"
              className="text-base font-semibold text-ink mb-1.5 block"
            >
              Deadline
            </label>
            {/* Deadline-less items stay visible unless "hide closed" excludes them */}
            <Select
              id="desktop-deadline-select"
              value={filters.deadline || "any"}
              onChange={(e) => handleDeadlineChange(e.target.value, false)}
              className="min-h-[44px] text-base w-full"
            >
              <option value="any">Any deadline</option>
              <option value="7d">Next 7 days</option>
              <option value="30d">Next 30 days</option>
              <option value="hide_closed">Hide closed</option>
            </Select>
          </div>
        </div>
      </div>
    </div>
  );
}
