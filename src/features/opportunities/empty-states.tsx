"use client";

import * as React from "react";
import { AlertCircleIcon, BriefcaseIcon, RotateCcwIcon, SearchXIcon } from "lucide-react";
import { cn } from "cn";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { Skeleton } from "@/components/ui/skeleton";

export interface NoOpportunitiesEmptyStateProps {
  className?: string;
}

export function NoOpportunitiesEmptyState({ className }: NoOpportunitiesEmptyStateProps) {
  return (
    <EmptyState
      icon={<BriefcaseIcon aria-hidden="true" />}
      title="No opportunities yet"
      description="Your college administrators and placement coordinators haven't posted any curated opportunities yet. Check back soon!"
      className={className}
    />
  );
}

export interface NoOpportunityResultsEmptyStateProps {
  onClearFilters?: () => void;
  className?: string;
}

export function NoOpportunityResultsEmptyState({
  onClearFilters,
  className,
}: NoOpportunityResultsEmptyStateProps) {
  return (
    <EmptyState
      icon={<SearchXIcon aria-hidden="true" />}
      title="No matching opportunities"
      description="No curated opportunities matched your selected filters. Try broadening your criteria or resetting filters."
      action={
        onClearFilters ? (
          <Button
            type="button"
            variant="outline"
            onClick={onClearFilters}
            className="min-h-[44px] gap-2 px-5"
          >
            <RotateCcwIcon className="size-4" aria-hidden="true" />
            <span>Clear filters</span>
          </Button>
        ) : undefined
      }
      className={className}
    />
  );
}

export interface OpportunitiesErrorStateProps {
  message?: string;
  requestId?: string;
  onRetry?: () => void;
  className?: string;
}

export function OpportunitiesErrorState({
  message = "Failed to load opportunities. Please try again.",
  requestId,
  onRetry,
  className,
}: OpportunitiesErrorStateProps) {
  return (
    <div
      role="alert"
      className={cn(
        "flex flex-col items-center justify-center gap-4 rounded-card border border-danger/40 bg-card p-8 text-center text-card-foreground shadow-xs",
        className,
      )}
    >
      <div className="flex size-12 items-center justify-center rounded-full bg-danger/10 text-danger">
        <AlertCircleIcon className="size-6" aria-hidden="true" />
      </div>

      <div className="flex max-w-md flex-col gap-1.5">
        <h3 className="font-heading text-xl font-bold text-ink">Unable to load opportunities</h3>
        <p className="text-base text-ink-muted leading-relaxed">{message}</p>
        {requestId ? (
          <span className="text-base font-mono text-ink-muted mt-1">Request ID: {requestId}</span>
        ) : null}
      </div>

      {onRetry ? (
        <Button type="button" onClick={onRetry} className="min-h-[44px] px-6 gap-2 mt-2">
          <RotateCcwIcon className="size-4" aria-hidden="true" />
          <span>Retry</span>
        </Button>
      ) : null}
    </div>
  );
}

export function OpportunitiesSkeleton({ count = 3 }: { count?: number }) {
  return (
    <div
      data-testid="opportunities-skeleton"
      role="status"
      aria-label="Loading opportunities"
      className="flex flex-col gap-4 w-full"
    >
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          className="flex flex-col gap-4 rounded-card border border-border bg-card p-6 min-w-0"
        >
          <div className="flex items-center justify-between border-b border-border pb-3">
            <div className="flex gap-2">
              <Skeleton className="h-6 w-24 rounded-full" />
              <Skeleton className="h-6 w-20 rounded-full" />
            </div>
            <Skeleton className="h-5 w-28" />
          </div>

          <div className="flex flex-col gap-2">
            <Skeleton className="h-7 w-2/3" />
            <Skeleton className="h-5 w-1/3" />
            <Skeleton className="h-5 w-1/4 mt-1" />
          </div>

          <Skeleton className="h-12 w-full" />

          <div className="flex gap-2">
            <Skeleton className="h-6 w-16 rounded-full" />
            <Skeleton className="h-6 w-20 rounded-full" />
            <Skeleton className="h-6 w-24 rounded-full" />
          </div>

          <div className="flex items-center justify-between border-t border-border pt-4 mt-2">
            <div className="flex gap-2">
              <Skeleton className="h-11 w-24" />
              <Skeleton className="h-11 w-36" />
            </div>
            <Skeleton className="h-11 w-24" />
          </div>
        </div>
      ))}
    </div>
  );
}
