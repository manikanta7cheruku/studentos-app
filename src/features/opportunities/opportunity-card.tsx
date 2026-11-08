"use client";

import * as React from "react";
import {
  BookmarkIcon,
  CheckIcon,
  ExternalLinkIcon,
  MapPinIcon,
  CalendarIcon,
  BadgeCheckIcon,
  PlusCircleIcon,
  CoinsIcon,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "cn";

import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import { apiClient, ApiError } from "@/lib/api-client";
import type { Opportunity } from "./types";

export interface OpportunityCardProps {
  opportunity: Opportunity;
  slug?: string;
  referenceDate?: Date;
  onSaveToggle?: (id: string, saved: boolean) => void;
  onAddToTracker?: (opportunity: Opportunity) => void;
  onViewTracker?: () => void;
  className?: string;
}

export function formatStipend(minPaise: number | null, maxPaise: number | null): string {
  if (minPaise === null && maxPaise === null) {
    return "Unpaid/Not listed";
  }
  if (minPaise === 0 && (maxPaise === 0 || maxPaise === null)) {
    return "Unpaid";
  }
  if (minPaise !== null && maxPaise !== null) {
    const min = Math.round(minPaise / 100);
    const max = Math.round(maxPaise / 100);
    if (min === max) {
      return `₹${min.toLocaleString("en-IN")} / month`;
    }
    return `₹${min.toLocaleString("en-IN")} – ₹${max.toLocaleString("en-IN")} / month`;
  }
  if (minPaise !== null) {
    const min = Math.round(minPaise / 100);
    return `From ₹${min.toLocaleString("en-IN")} / month`;
  }
  if (maxPaise !== null) {
    const max = Math.round(maxPaise / 100);
    return `Up to ₹${max.toLocaleString("en-IN")} / month`;
  }
  return "Unpaid/Not listed";
}

export function formatDeadline(
  deadline: string | null,
  referenceDate?: Date,
): { label: string; isClosed: boolean } {
  if (!deadline) {
    return { label: "No deadline", isClosed: false };
  }
  const date = new Date(deadline);
  if (Number.isNaN(date.getTime())) {
    return { label: "No deadline", isClosed: false };
  }
  if (!referenceDate) {
    return { label: "No deadline", isClosed: false };
  }
  const diffTime = date.getTime() - referenceDate.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  if (diffDays < 0) {
    return { label: "Closed", isClosed: true };
  }
  if (diffDays === 0) {
    return { label: "Closes today", isClosed: false };
  }
  if (diffDays === 1) {
    return { label: "Closes in 1 day", isClosed: false };
  }
  return { label: `Closes in ${diffDays} days`, isClosed: false };
}

export function formatVerifiedDate(isoDate: string): string {
  try {
    const date = new Date(isoDate);
    if (Number.isNaN(date.getTime())) return "Verified recently";
    return (
      "Verified " +
      new Intl.DateTimeFormat("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
      }).format(date)
    );
  } catch {
    return "Verified recently";
  }
}

const KIND_LABELS: Record<string, string> = {
  internship: "Internship",
  job: "Job",
  hackathon: "Hackathon",
  competition: "Competition",
  scholarship: "Scholarship",
};

const MODE_LABELS: Record<string, string> = {
  onsite: "Onsite",
  remote: "Remote",
  hybrid: "Hybrid",
};

let cachedClientNow: Date | null = null;
const emptySubscribe = () => () => {};
const getClientSnapshot = (): Date => {
  if (!cachedClientNow) {
    cachedClientNow = new Date();
  }
  return cachedClientNow;
};
const getServerSnapshot = (): null => null;

function useClientNow(): Date | undefined {
  const date = React.useSyncExternalStore(emptySubscribe, getClientSnapshot, getServerSnapshot);
  return date ?? undefined;
}

export function OpportunityCard({
  opportunity,
  referenceDate,
  onSaveToggle,
  onAddToTracker,
  onViewTracker,
  className,
}: OpportunityCardProps) {
  const clientNow = useClientNow();
  const effectiveRefDate = referenceDate ?? clientNow;
  const [savedOverride, setSavedOverride] = React.useState<boolean | null>(null);
  const [isSaving, setIsSaving] = React.useState<boolean>(false);
  const [trackerOverride, setTrackerOverride] = React.useState<boolean | null>(null);
  const [isTracking, setIsTracking] = React.useState<boolean>(false);

  const isSaved = savedOverride !== null ? savedOverride : Boolean(opportunity.saved);
  const isInTracker = trackerOverride !== null ? trackerOverride : Boolean(opportunity.in_tracker);

  const { label: deadlineLabel, isClosed: isPastDeadline } = formatDeadline(
    opportunity.deadline,
    effectiveRefDate,
  );
  // The API works out "expired" from the deadline, so it is the source of truth.
  const isExpired = opportunity.status === "expired";
  const isClosed = isPastDeadline || isExpired;
  const hasStipend = opportunity.stipend_min !== null || opportunity.stipend_max !== null;
  const hasLocation = opportunity.location.trim().length > 0;
  const stipendText = formatStipend(opportunity.stipend_min, opportunity.stipend_max);
  const verifiedText = formatVerifiedDate(opportunity.last_verified_at);

  const isSafeApplyUrl =
    typeof opportunity.apply_url === "string" &&
    (opportunity.apply_url.startsWith("https://") || opportunity.apply_url.startsWith("http://"));

  const handleToggleSave = async () => {
    const nextSaved = !isSaved;
    setSavedOverride(nextSaved);
    setIsSaving(true);
    try {
      if (nextSaved) {
        await apiClient(`/me/saved-opportunities/${opportunity.id}`, {
          method: "PUT",
        });
        toast.success(`Saved "${opportunity.title}"`);
      } else {
        await apiClient(`/me/saved-opportunities/${opportunity.id}`, {
          method: "DELETE",
        });
        toast.success(`Removed "${opportunity.title}" from saved`);
      }
      onSaveToggle?.(opportunity.id, nextSaved);
    } catch (err) {
      // Roll back optimistic state on failure
      setSavedOverride(!nextSaved);
      toast.error(err instanceof Error ? err.message : "Failed to update saved opportunity");
    } finally {
      setIsSaving(false);
    }
  };

  const handleAddToTracker = async () => {
    setIsTracking(true);
    try {
      await apiClient("/me/applications", {
        method: "POST",
        headers: {
          "Idempotency-Key": crypto.randomUUID(),
        },
        body: {
          company: opportunity.org,
          role_title: opportunity.title,
          source_url: opportunity.apply_url,
          deadline: opportunity.deadline,
          opportunity_id: opportunity.id,
          status: "saved",
        },
      });

      setTrackerOverride(true);
      onAddToTracker?.(opportunity);
      toast.success("Added to application tracker", {
        action: {
          label: "View tracker",
          onClick: () => {
            onViewTracker?.();
          },
        },
      });
    } catch (err) {
      if (err instanceof ApiError && (err.status === 409 || err.code === "CONFLICT")) {
        // Duplicate: treat as in tracker
        setTrackerOverride(true);
        toast.info("Already in tracker", {
          action: {
            label: "View tracker",
            onClick: () => {
              onViewTracker?.();
            },
          },
        });
      } else {
        toast.error(err instanceof Error ? err.message : "Failed to add to tracker");
      }
    } finally {
      setIsTracking(false);
    }
  };

  return (
    <article
      data-slot="opportunity-card"
      data-testid={`opportunity-card-${opportunity.id}`}
      className={cn(
        "flex min-w-0 max-w-full w-full flex-col gap-4 rounded-card border border-border bg-card p-4 sm:p-6 text-base text-card-foreground",
        "focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-2",
        className,
      )}
    >
      {/* Header: Kind, Mode, Location, Deadline */}
      <header className="flex flex-wrap items-center justify-between gap-3 border-b border-border pb-3 min-w-0 max-w-full">
        <div className="flex flex-wrap items-center gap-2 min-w-0 max-w-full">
          <Badge variant="outline">{KIND_LABELS[opportunity.kind] || opportunity.kind}</Badge>
          <Badge variant="secondary">{MODE_LABELS[opportunity.mode] || opportunity.mode}</Badge>
          {isExpired ? (
            <Badge variant="outline" className="border-danger text-danger">
              Expired
            </Badge>
          ) : null}
          {isSaved && opportunity.changed_since_saved ? (
            <Badge variant="outline">Changed since you saved</Badge>
          ) : null}
          {hasLocation ? (
            <div className="flex items-center gap-1 text-base text-ink-muted min-w-0 max-w-full">
              <MapPinIcon className="size-4 shrink-0" aria-hidden="true" />
              <span className="break-words">{opportunity.location}</span>
            </div>
          ) : null}
        </div>

        <div
          className={cn(
            "flex items-center gap-1.5 text-base font-medium min-w-0 max-w-full",
            isClosed ? "text-danger" : "text-ink-muted",
          )}
        >
          <CalendarIcon className="size-4 shrink-0" aria-hidden="true" />
          <span className="break-words">{isExpired ? "Closed" : deadlineLabel}</span>
        </div>
      </header>

      {/* Main Details: Title, Org, Stipend */}
      <div className="flex flex-col gap-1.5 min-w-0 max-w-full">
        <h3 className="font-heading text-xl font-bold break-words">{opportunity.title}</h3>
        <p className="text-base font-semibold text-ink break-words">{opportunity.org}</p>

        {hasStipend ? (
          <div className="flex items-center gap-1.5 pt-1 text-base text-ink-muted min-w-0 max-w-full">
            <CoinsIcon className="size-4 shrink-0" aria-hidden="true" />
            <span className="break-words">{stipendText}</span>
          </div>
        ) : null}
      </div>

      {/* Eligibility summary */}
      {opportunity.eligibility ? (
        <p className="text-base text-ink-muted break-words leading-relaxed">
          {opportunity.eligibility}
        </p>
      ) : null}

      {/* Skills chips */}
      {opportunity.skills && opportunity.skills.length > 0 ? (
        <div
          role="group"
          aria-label="Required skills"
          className="flex flex-wrap items-center gap-1.5 pt-1 min-w-0 max-w-full"
        >
          {opportunity.skills.map((skill) => (
            <Badge key={skill} variant="secondary" className="font-normal">
              {skill}
            </Badge>
          ))}
        </div>
      ) : null}

      {/* Verification date */}
      <div className="flex items-center gap-1.5 pt-1 text-base text-ink-muted min-w-0 max-w-full">
        <BadgeCheckIcon className="size-4 shrink-0 text-success" aria-hidden="true" />
        <span className="break-words">
          {verifiedText}
          {opportunity.posted_by ? ` · Posted by ${opportunity.posted_by}` : ""}
        </span>
      </div>

      {/* Actions footer: Apply link, Save button, Add to tracker button */}
      <footer className="mt-2 flex flex-wrap items-center justify-between gap-3 border-t border-border pt-4 min-w-0 max-w-full">
        <div className="flex flex-wrap items-center gap-2 min-w-0 max-w-full">
          {/* Save button with optimistic toggle */}
          <Button
            type="button"
            variant="outline"
            className={cn(
              "min-h-[44px] gap-2 px-4 transition-colors",
              isSaved
                ? "border-primary bg-primary/10 text-primary font-semibold ring-1 ring-primary hover:bg-primary/15"
                : "border-border-strong bg-surface text-foreground hover:bg-accent/40",
            )}
            aria-label={isSaved ? `Unsave ${opportunity.title}` : `Save ${opportunity.title}`}
            aria-pressed={isSaved}
            disabled={isSaving}
            onClick={handleToggleSave}
          >
            <BookmarkIcon
              className={cn(
                "size-5 shrink-0",
                isSaved ? "fill-primary text-primary" : "text-foreground",
              )}
              aria-hidden="true"
            />
            <span>{isSaved ? "Saved" : "Save"}</span>
          </Button>

          {/* Add to tracker / In tracker */}
          {isInTracker ? (
            <Button
              type="button"
              variant="outline"
              disabled
              className="min-h-[44px] gap-2 text-ink-muted"
              aria-label="In tracker"
            >
              <CheckIcon className="size-5 shrink-0 text-success" aria-hidden="true" />
              <span>In tracker</span>
            </Button>
          ) : (
            <Button
              type="button"
              variant="outline"
              disabled={isTracking}
              onClick={handleAddToTracker}
              className="min-h-[44px] gap-2"
            >
              <PlusCircleIcon className="size-5 shrink-0" aria-hidden="true" />
              <span>Add to tracker</span>
            </Button>
          )}
        </div>

        {/* Apply external link: strictly primary button styling, real <a> */}
        {isSafeApplyUrl ? (
          <a
            href={opportunity.apply_url}
            target="_blank"
            rel="noopener noreferrer"
            aria-label={`Apply to ${opportunity.title} at ${opportunity.org} (opens in a new tab)`}
            className={cn(
              buttonVariants({ variant: "default" }),
              "min-h-[44px] gap-1.5 px-5 text-base font-semibold max-w-full",
            )}
          >
            <span>Apply</span>
            <ExternalLinkIcon className="size-4 shrink-0" aria-hidden="true" />
          </a>
        ) : (
          <span
            data-testid="unsafe-apply-url"
            className="inline-flex min-h-[44px] items-center text-base text-ink-muted"
          >
            Invalid link
          </span>
        )}
      </footer>
    </article>
  );
}
