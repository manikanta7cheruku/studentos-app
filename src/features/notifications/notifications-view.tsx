"use client";

import * as React from "react";
import {
  BellIcon,
  CheckIcon,
  ClockIcon,
  RefreshCwIcon,
  ShieldCheckIcon,
  UsersIcon,
  AlertCircleIcon,
  CheckCheckIcon,
} from "lucide-react";
import { cn } from "cn";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { Skeleton } from "@/components/ui/skeleton";
import type { NotificationItem, NotificationType } from "./types";
import {
  fetchNotifications,
  markNotificationAsRead,
  markAllNotificationsAsRead,
} from "./sample-data";

export interface NotificationsViewProps {
  /**
   * Optional initial notifications for server-rendering or testing.
   */
  initialData?: NotificationItem[];
  /**
   * Force a specific state for testing/demo purposes.
   */
  forcedState?: "loading" | "empty" | "error" | "success";
  /**
   * Callback fired after an item is marked read.
   */
  onNotificationRead?: (id: string) => void;
}

function getTypeIcon(type: NotificationType) {
  switch (type) {
    case "verification_decision":
      return <ShieldCheckIcon className="size-5 shrink-0" aria-hidden="true" />;
    case "join_request_received":
    case "join_request_decided":
      return <UsersIcon className="size-5 shrink-0" aria-hidden="true" />;
    case "reminder":
      return <ClockIcon className="size-5 shrink-0" aria-hidden="true" />;
    case "report_outcome":
      return <AlertCircleIcon className="size-5 shrink-0" aria-hidden="true" />;
    default:
      return <BellIcon className="size-5 shrink-0" aria-hidden="true" />;
  }
}

function getTypeLabel(type: NotificationType): string {
  switch (type) {
    case "verification_decision":
      return "Verification";
    case "join_request_received":
      return "Team Request";
    case "join_request_decided":
      return "Team Decision";
    case "reminder":
      return "Reminder";
    case "report_outcome":
      return "Report Update";
    default:
      return "Notification";
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

export function NotificationsView({
  initialData,
  forcedState,
  onNotificationRead,
}: NotificationsViewProps) {
  const [items, setItems] = React.useState<NotificationItem[]>(initialData || []);
  const [loading, setLoading] = React.useState<boolean>(
    forcedState === "loading" || (!initialData && !forcedState),
  );
  const [error, setError] = React.useState<{ message: string; requestId: string } | null>(
    forcedState === "error"
      ? {
          message: "Unable to load notifications. Please check your connection and try again.",
          requestId: "req-err-ntf-500",
        }
      : null,
  );
  const [filter, setFilter] = React.useState<"all" | "unread">("all");

  const loadData = React.useCallback(async () => {
    if (forcedState) return;
    setLoading(true);
    setError(null);
    try {
      const response = await fetchNotifications();
      setItems(response.data);
    } catch {
      setError({
        message: "Unable to load your notifications right now.",
        requestId: "req-ntf-fetch-fail",
      });
    } finally {
      setLoading(false);
    }
  }, [forcedState]);

  React.useEffect(() => {
    let active = true;
    if (!initialData && !forcedState) {
      fetchNotifications()
        .then((response) => {
          if (active) {
            setItems(response.data);
            setLoading(false);
          }
        })
        .catch(() => {
          if (active) {
            setError({
              message: "Unable to load your notifications right now.",
              requestId: "req-ntf-fetch-fail",
            });
            setLoading(false);
          }
        });
    }
    return () => {
      active = false;
    };
  }, [initialData, forcedState]);

  const handleMarkAsRead = async (id: string) => {
    try {
      await markNotificationAsRead(id);
      setItems((prev) =>
        prev.map((item) =>
          item.id === id ? { ...item, read_at: new Date().toISOString() } : item,
        ),
      );
      onNotificationRead?.(id);
    } catch {
      // In production, handle via user error toast
    }
  };

  const handleMarkAllAsRead = async () => {
    try {
      await markAllNotificationsAsRead();
      const now = new Date().toISOString();
      setItems((prev) => prev.map((item) => ({ ...item, read_at: item.read_at || now })));
    } catch {
      // In production, handle via user error toast
    }
  };

  // 1. Loading State
  if (loading || forcedState === "loading") {
    return (
      <div data-testid="notifications-loading" className="flex flex-col gap-6">
        <div className="flex flex-col gap-2">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-5 w-72" />
        </div>
        <div className="flex gap-2">
          <Skeleton className="h-11 w-24" />
          <Skeleton className="h-11 w-24" />
        </div>
        <div className="flex flex-col gap-4">
          {[1, 2, 3].map((n) => (
            <div key={n} className="flex flex-col gap-3 glass-card rounded-[22px] p-4">
              <div className="flex items-center justify-between">
                <Skeleton className="h-6 w-32" />
                <Skeleton className="h-5 w-20" />
              </div>
              <Skeleton className="h-5 w-3/4" />
              <Skeleton className="h-4 w-full" />
              <div className="flex items-center justify-between pt-2">
                <Skeleton className="h-4 w-28" />
                <Skeleton className="h-11 w-32" />
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
      <div data-testid="notifications-error" className="flex flex-col gap-6">
        <h1 className="font-heading text-2xl font-semibold">Notifications</h1>
        <div className="flex flex-col items-start gap-4 rounded-card border border-border-strong bg-surface p-6">
          <div className="flex items-center gap-2 text-danger">
            <AlertCircleIcon className="size-6 shrink-0" aria-hidden="true" />
            <h2 className="font-heading text-xl font-semibold text-foreground">
              Could not load notifications
            </h2>
          </div>
          <p className="text-base text-foreground">
            {error?.message ||
              "We could not reach your college server. Please try again in a few moments."}
          </p>
          <p className="text-base text-muted-foreground">
            Reference ID: <code>{error?.requestId || "req-err-ntf-default"}</code>
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

  // Filter items
  const displayedItems =
    forcedState === "empty"
      ? []
      : filter === "unread"
        ? items.filter((item) => !item.read_at)
        : items;

  const unreadCount = items.filter((item) => !item.read_at).length;

  return (
    <div data-testid="notifications-container" className="flex flex-col gap-6">
      {/* Page Header */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="font-heading text-2xl font-semibold sm:text-3xl">Notifications</h1>
          <p className="text-base text-muted-foreground">
            Updates on your college memberships, team join requests, and reminders.
          </p>
        </div>

        {unreadCount > 0 && (
          <Button
            type="button"
            variant="outline"
            onClick={() => void handleMarkAllAsRead()}
            className="mt-2 flex items-center gap-2 sm:mt-0"
          >
            <CheckCheckIcon className="size-5" aria-hidden="true" />
            <span>Mark all as read</span>
          </Button>
        )}
      </div>

      {/* Filter Tabs */}
      <div
        className="flex gap-2 border-b border-border pb-2"
        role="tablist"
        aria-label="Notification filters"
      >
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
          aria-selected={filter === "unread"}
          onClick={() => setFilter("unread")}
          className={cn(
            "min-h-11 rounded-card px-4 py-2 text-base font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
            filter === "unread"
              ? "bg-accent font-semibold text-primary"
              : "text-muted-foreground hover:bg-accent/40 hover:text-foreground",
          )}
        >
          Unread ({unreadCount})
        </button>
      </div>

      {/* 3. Empty State */}
      {displayedItems.length === 0 ? (
        <EmptyState
          icon={<BellIcon className="size-8" />}
          title={filter === "unread" ? "No unread notifications" : "No notifications yet"}
          description={
            filter === "unread"
              ? "You are all caught up! There are no unread notifications right now."
              : "When you receive team requests, reminders, or verification decisions from your college, they will be listed here."
          }
          action={
            filter === "unread" ? (
              <Button type="button" variant="outline" onClick={() => setFilter("all")}>
                View all notifications
              </Button>
            ) : undefined
          }
        />
      ) : (
        /* 4. Success State (List) */
        <ul className="flex flex-col gap-4" aria-label="Notifications list">
          {displayedItems.map((notification) => {
            const isUnread = !notification.read_at;

            return (
              <li
                key={notification.id}
                className={cn(
                  "flex flex-col gap-3 rounded-card border bg-surface p-4 transition-colors",
                  isUnread
                    ? "border-primary/50 bg-accent/20 ring-1 ring-primary/20"
                    : "border-border text-foreground",
                )}
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="text-muted-foreground" aria-hidden="true">
                      {getTypeIcon(notification.type)}
                    </span>
                    <Badge variant="outline">{getTypeLabel(notification.type)}</Badge>
                    {isUnread && (
                      <Badge variant="default" className="flex items-center gap-1 font-semibold">
                        <span className="size-2 rounded-full bg-surface" aria-hidden="true" />
                        <span>Unread</span>
                      </Badge>
                    )}
                  </div>
                  <span className="text-base text-muted-foreground">
                    {formatDate(notification.created_at)}
                  </span>
                </div>

                <div className="flex flex-col gap-1">
                  <h2 className="font-heading text-lg font-semibold text-foreground">
                    {notification.title}
                  </h2>
                  {/* Security: Render body strictly as plain text, never HTML */}
                  <p className="text-base text-foreground">{notification.body}</p>
                </div>

                {isUnread && (
                  <div className="flex justify-end pt-2">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => void handleMarkAsRead(notification.id)}
                      className="flex items-center gap-2"
                      aria-label={`Mark "${notification.title}" as read`}
                    >
                      <CheckIcon className="size-5" aria-hidden="true" />
                      <span>Mark as read</span>
                    </Button>
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
