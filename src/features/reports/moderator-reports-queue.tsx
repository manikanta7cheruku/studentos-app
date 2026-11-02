"use client";

import * as React from "react";
import {
  ShieldAlertIcon,
  CheckCircle2Icon,
  RefreshCwIcon,
  AlertCircleIcon,
  EyeOffIcon,
  UserXIcon,
  XCircleIcon,
  AlertTriangleIcon,
} from "lucide-react";
import { cn } from "cn";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import type { ModerationActionType, ReportItem, ReportReason, ReportStatus } from "./types";
import { executeModeratorAction, fetchReportsQueue } from "./sample-data";

export interface ModeratorReportsQueueProps {
  initialData?: ReportItem[];
  forcedState?: "loading" | "empty" | "error" | "success";
  onActionComplete?: (reportId: string, action: ModerationActionType) => void;
}

const TARGET_TYPE_LABELS: Record<string, string> = {
  team_post: "Team post",
  profile: "Profile",
  announcement: "Announcement",
  comment: "Comment",
};

function formatTargetType(targetType: string): string {
  return TARGET_TYPE_LABELS[targetType] || targetType;
}

function getReasonBadge(reason: ReportReason) {
  switch (reason) {
    case "harassment":
      return <Badge variant="destructive">Harassment</Badge>;
    case "spam":
      return <Badge variant="warning">Spam</Badge>;
    case "impersonation":
      return <Badge variant="destructive">Impersonation</Badge>;
    case "inappropriate":
      return <Badge variant="warning">Inappropriate</Badge>;
    default:
      return <Badge variant="outline">Other Policy</Badge>;
  }
}

function getStatusBadge(status: ReportStatus) {
  switch (status) {
    case "open":
      return (
        <Badge variant="default" className="flex items-center gap-1">
          <span className="size-2 rounded-full bg-surface" aria-hidden="true" />
          <span>Open</span>
        </Badge>
      );
    case "dismissed":
      return <Badge variant="outline">Dismissed</Badge>;
    case "actioned":
      return (
        <Badge variant="success" className="flex items-center gap-1">
          <CheckCircle2Icon className="size-3.5" aria-hidden="true" />
          <span>Actioned</span>
        </Badge>
      );
  }
}

function formatDate(isoString: string): string {
  try {
    const date = new Date(isoString);
    return date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  } catch {
    return isoString;
  }
}

/**
 * ModeratorReportsQueue displays reported content for campus moderators.
 *
 * Security:
 * // TODO: RPT-02, RPT-03. UI hiding is not security - the server enforces moderator
 * // or admin role check via RLS for viewing reports and executing moderation actions.
 */
export function ModeratorReportsQueue({
  initialData,
  forcedState,
  onActionComplete,
}: ModeratorReportsQueueProps) {
  const [items, setItems] = React.useState<ReportItem[]>(initialData || []);
  const [loading, setLoading] = React.useState<boolean>(
    forcedState === "loading" || (!initialData && !forcedState),
  );
  const [error, setError] = React.useState<{ message: string; requestId: string } | null>(
    forcedState === "error"
      ? {
          message: "Unable to load reports queue. Please check your connection and try again.",
          requestId: "req-err-rpt-500",
        }
      : null,
  );
  const [filter, setFilter] = React.useState<"all" | "open" | "resolved">("open");
  const [processingId, setProcessingId] = React.useState<string | null>(null);
  const [suspendTargetReport, setSuspendTargetReport] = React.useState<ReportItem | null>(null);

  const loadData = React.useCallback(async () => {
    if (forcedState) return;
    setLoading(true);
    setError(null);
    try {
      const response = await fetchReportsQueue();
      setItems(response.data);
    } catch {
      setError({
        message: "Failed to retrieve reports from your college.",
        requestId: "req-rpt-fetch-fail",
      });
    } finally {
      setLoading(false);
    }
  }, [forcedState]);

  React.useEffect(() => {
    let active = true;
    if (!initialData && !forcedState) {
      fetchReportsQueue()
        .then((response) => {
          if (active) {
            setItems(response.data);
            setLoading(false);
          }
        })
        .catch(() => {
          if (active) {
            setError({
              message: "Failed to retrieve reports from your college.",
              requestId: "req-rpt-fetch-fail",
            });
            setLoading(false);
          }
        });
    }
    return () => {
      active = false;
    };
  }, [initialData, forcedState]);

  const handleAction = async (reportId: string, action: ModerationActionType) => {
    setProcessingId(reportId);
    try {
      await executeModeratorAction({ report_id: reportId, action });
      setItems((prev) =>
        prev.map((r) =>
          r.id === reportId
            ? {
                ...r,
                status: action === "dismiss" ? "dismissed" : "actioned",
                handled_by: "usr-mod-current",
                handled_at: new Date().toISOString(),
              }
            : r,
        ),
      );
      onActionComplete?.(reportId, action);
    } catch {
      // In production, trigger toast
    } finally {
      setProcessingId(null);
    }
  };

  // 1. Loading State
  if (loading || forcedState === "loading") {
    return (
      <div data-testid="reports-queue-loading" className="flex flex-col gap-6">
        <div className="flex flex-col gap-2">
          <Skeleton className="h-8 w-64" />
          <Skeleton className="h-5 w-80" />
        </div>
        <div className="flex gap-2">
          <Skeleton className="h-11 w-24" />
          <Skeleton className="h-11 w-24" />
          <Skeleton className="h-11 w-24" />
        </div>
        <div className="flex flex-col gap-4">
          {[1, 2, 3].map((n) => (
            <div
              key={n}
              className="flex flex-col gap-3 rounded-card border border-border bg-surface p-5"
            >
              <div className="flex items-center justify-between">
                <Skeleton className="h-6 w-36" />
                <Skeleton className="h-5 w-20" />
              </div>
              <Skeleton className="h-6 w-3/4" />
              <Skeleton className="h-4 w-full" />
              <div className="flex gap-2 pt-2">
                <Skeleton className="h-11 w-28" />
                <Skeleton className="h-11 w-28" />
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  // 2. Error State
  if (error || forcedState === "error") {
    return (
      <div data-testid="reports-queue-error" className="flex flex-col gap-6">
        <h1 className="font-heading text-2xl font-semibold sm:text-3xl">Moderation Queue</h1>
        <div className="flex flex-col items-start gap-4 rounded-card border border-border-strong bg-surface p-6">
          <div className="flex items-center gap-2 text-danger">
            <AlertCircleIcon className="size-6 shrink-0" aria-hidden="true" />
            <h2 className="font-heading text-xl font-semibold text-foreground">
              Could not load reports queue
            </h2>
          </div>
          <p className="text-base text-foreground">
            {error?.message ||
              "There was a problem loading safety reports. Please try again in a moment."}
          </p>
          <p className="text-base text-muted-foreground">
            Reference ID: <code>{error?.requestId || "req-err-rpt-default"}</code>
          </p>
          <Button
            type="button"
            variant="default"
            onClick={() => void loadData()}
            className="flex items-center gap-2"
          >
            <RefreshCwIcon className="size-5" aria-hidden="true" />
            <span>Try again</span>
          </Button>
        </div>
      </div>
    );
  }

  const displayedItems =
    forcedState === "empty"
      ? []
      : filter === "open"
        ? items.filter((r) => r.status === "open")
        : filter === "resolved"
          ? items.filter((r) => r.status !== "open")
          : items;

  const openCount = items.filter((r) => r.status === "open").length;

  return (
    <div data-testid="reports-queue-container" className="flex flex-col gap-6">
      {/* Header */}
      <div className="flex flex-col gap-2">
        <div className="flex items-center gap-2">
          <ShieldAlertIcon className="size-7 text-primary" aria-hidden="true" />
          <h1 className="font-heading text-2xl font-semibold sm:text-3xl">Moderation Queue</h1>
        </div>
        <p className="text-base text-muted-foreground">
          Review community reports submitted by students at your college. Actions are logged for
          accountability.
        </p>
      </div>

      {/* Filter Tabs */}
      <div
        className="flex gap-2 border-b border-border pb-2"
        role="tablist"
        aria-label="Report queue filters"
      >
        <button
          type="button"
          role="tab"
          aria-selected={filter === "open"}
          onClick={() => setFilter("open")}
          className={cn(
            "min-h-11 rounded-card px-4 py-2 text-base font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
            filter === "open"
              ? "bg-accent font-semibold text-primary"
              : "text-muted-foreground hover:bg-accent/40 hover:text-foreground",
          )}
        >
          Open ({openCount})
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={filter === "all"}
          onClick={() => setFilter("all")}
          className={cn(
            "min-h-11 rounded-card px-4 py-2 text-base font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
            filter === "all"
              ? "bg-accent font-semibold text-primary"
              : "text-muted-foreground hover:bg-accent/40 hover:text-foreground",
          )}
        >
          All ({items.length})
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={filter === "resolved"}
          onClick={() => setFilter("resolved")}
          className={cn(
            "min-h-11 rounded-card px-4 py-2 text-base font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
            filter === "resolved"
              ? "bg-accent font-semibold text-primary"
              : "text-muted-foreground hover:bg-accent/40 hover:text-foreground",
          )}
        >
          Resolved ({items.length - openCount})
        </button>
      </div>

      {/* 3. Empty State */}
      {displayedItems.length === 0 ? (
        <EmptyState
          icon={<CheckCircle2Icon className="size-8" />}
          title={filter === "open" ? "No open reports" : "No reports found"}
          description={
            filter === "open"
              ? "All reports have been reviewed! Your college community feed has no pending safety concerns."
              : "There are no reports matching this filter."
          }
          action={
            filter !== "all" ? (
              <Button type="button" variant="outline" onClick={() => setFilter("all")}>
                View all reports
              </Button>
            ) : undefined
          }
        />
      ) : (
        /* 4. Success State (List) */
        <ul className="flex flex-col gap-4" aria-label="Reports list">
          {displayedItems.map((report) => {
            const isOpen = report.status === "open";
            const isBusy = processingId === report.id;

            return (
              <li
                key={report.id}
                className={cn(
                  "flex flex-col gap-3 rounded-card border bg-surface p-5 transition-colors",
                  isOpen ? "border-border-strong ring-1 ring-border" : "border-border opacity-90",
                )}
              >
                {/* Meta row */}
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex flex-wrap items-center gap-2">
                    {getStatusBadge(report.status)}
                    {getReasonBadge(report.reason)}
                    <span className="text-base text-muted-foreground">
                      Target:{" "}
                      <strong className="text-foreground">
                        {formatTargetType(report.target_type)}
                      </strong>
                    </span>
                  </div>
                  <span className="text-base text-muted-foreground">
                    Reported on {formatDate(report.created_at)}
                  </span>
                </div>

                {/* Content Details */}
                <div className="flex flex-col gap-1">
                  <h2 className="font-heading text-lg font-semibold text-foreground">
                    {report.target_title ||
                      `Reported ${formatTargetType(report.target_type)} #${report.target_id}`}
                  </h2>
                  {report.details && (
                    <div className="rounded-input border border-border bg-accent/20 p-3 text-base text-foreground">
                      <span className="font-semibold text-foreground">Reporter note: </span>
                      {/* Plain text only */}
                      {report.details}
                    </div>
                  )}
                  {report.handled_at && (
                    <p className="text-base text-muted-foreground">
                      Handled on {formatDate(report.handled_at)} by{" "}
                      {report.handled_by || "moderator"}
                    </p>
                  )}
                </div>

                {/* Actions row (Open only) */}
                {isOpen && (
                  <div className="flex flex-wrap items-center gap-2 border-t border-border pt-3">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      disabled={isBusy}
                      onClick={() => void handleAction(report.id, "dismiss")}
                      className="flex items-center gap-1.5"
                    >
                      <XCircleIcon className="size-4" aria-hidden="true" />
                      <span>Dismiss report</span>
                    </Button>
                    <Button
                      type="button"
                      variant="secondary"
                      size="sm"
                      disabled={isBusy}
                      onClick={() => void handleAction(report.id, "hide")}
                      className="flex items-center gap-1.5"
                    >
                      <EyeOffIcon className="size-4" aria-hidden="true" />
                      <span>Hide content</span>
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      disabled={isBusy}
                      onClick={() => void handleAction(report.id, "warn")}
                      className="flex items-center gap-1.5"
                    >
                      <AlertTriangleIcon className="size-4" aria-hidden="true" />
                      <span>Warn member</span>
                    </Button>
                    <Button
                      type="button"
                      variant="destructive"
                      size="sm"
                      disabled={isBusy}
                      onClick={() => setSuspendTargetReport(report)}
                      className="flex items-center gap-1.5"
                    >
                      <UserXIcon className="size-4" aria-hidden="true" />
                      <span>Suspend member</span>
                    </Button>
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      )}

      {/* Suspend Confirmation Dialog */}
      <Dialog
        open={Boolean(suspendTargetReport)}
        onOpenChange={(open) => {
          if (!open) setSuspendTargetReport(null);
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Confirm member suspension</DialogTitle>
            <DialogDescription>
              Are you sure you want to suspend this member from your college? They will lose access
              to team posts and campus spaces.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="pt-2">
            <Button type="button" variant="outline" onClick={() => setSuspendTargetReport(null)}>
              Cancel
            </Button>
            <Button
              type="button"
              variant="destructive"
              disabled={processingId === suspendTargetReport?.id}
              onClick={async () => {
                if (suspendTargetReport) {
                  const targetId = suspendTargetReport.id;
                  setSuspendTargetReport(null);
                  await handleAction(targetId, "suspend");
                }
              }}
            >
              Confirm suspension
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
