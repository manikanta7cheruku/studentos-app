"use client";

import * as React from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import { Button } from "@/components/ui/button";
import { Banner } from "@/components/ui/banner";

export type ScreenState = "empty" | "loading" | "error";

export interface PlaceholderScreenProps {
  moduleName: string;
  title: string;
  description: string;
  actionLabel: string;
  icon?: React.ReactNode;
  initialState?: ScreenState;
}

export function PlaceholderScreen({
  moduleName,
  title,
  description,
  actionLabel,
  icon,
  initialState = "empty",
}: PlaceholderScreenProps) {
  const [state, setState] = React.useState<ScreenState>(initialState);
  const [requestId, setRequestId] = React.useState<string>("req_mock_sample_8472");

  function handleRetry() {
    setState("loading");
    setTimeout(() => {
      setState("empty");
    }, 600);
  }

  function simulateError() {
    setRequestId(`req_err_${Math.random().toString(36).substring(2, 8)}`);
    setState("error");
  }

  return (
    <div className="mx-auto flex w-full max-w-4xl flex-col gap-6 px-4 py-6 md:px-8 md:py-8">
      {/* Page Header */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <span className="text-sm font-semibold uppercase tracking-wider text-ink-muted">
            {moduleName}
          </span>
          <h1 className="font-heading text-2xl font-bold break-words md:text-3xl">{title}</h1>
        </div>

        {/* State preview toggles for reviewers & tests */}
        <div
          role="group"
          aria-label="View states"
          className="flex items-center gap-1.5 rounded-card border border-border bg-surface p-1 text-xs"
        >
          <button
            type="button"
            onClick={() => setState("empty")}
            className={`rounded px-2.5 py-1 font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
              state === "empty" ? "bg-accent font-semibold text-primary" : "text-ink-muted"
            }`}
          >
            Empty
          </button>
          <button
            type="button"
            onClick={() => setState("loading")}
            className={`rounded px-2.5 py-1 font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
              state === "loading" ? "bg-accent font-semibold text-primary" : "text-ink-muted"
            }`}
          >
            Loading
          </button>
          <button
            type="button"
            onClick={simulateError}
            className={`rounded px-2.5 py-1 font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
              state === "error" ? "bg-accent font-semibold text-primary" : "text-ink-muted"
            }`}
          >
            Error
          </button>
        </div>
      </div>

      {/* Loading State: Skeleton matching layout */}
      {state === "loading" && (
        <div data-testid="screen-loading" className="flex flex-col gap-4">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-4 w-72" />
          <div className="mt-4 flex flex-col gap-3">
            <Skeleton className="h-28 w-full rounded-card" />
            <Skeleton className="h-28 w-full rounded-card" />
            <Skeleton className="h-28 w-full rounded-card" />
          </div>
        </div>
      )}

      {/* Error State: Plain language message, retry button, request ID */}
      {state === "error" && (
        <div data-testid="screen-error" className="flex flex-col gap-4">
          <Banner variant="error" title="Unable to load this section">
            <div className="flex flex-col gap-3">
              <p>We could not load {moduleName} content right now. Please try again.</p>
              <div className="flex items-center gap-4">
                <Button variant="outline" size="sm" onClick={handleRetry}>
                  Try again
                </Button>
                <span className="text-xs text-muted-foreground">Request ID: {requestId}</span>
              </div>
            </div>
          </Banner>
        </div>
      )}

      {/* Empty State: Explains what belongs here + primary action */}
      {state === "empty" && (
        <div data-testid="screen-empty">
          <EmptyState
            icon={icon}
            title={`No ${moduleName} items yet`}
            description={description}
            action={<Button className="min-h-11">{actionLabel}</Button>}
          />
        </div>
      )}
    </div>
  );
}
