"use client";

import * as React from "react";
import {
  PinIcon,
  MegaphoneIcon,
  RefreshCwIcon,
  AlertCircleIcon,
  CalendarIcon,
  UserIcon,
} from "lucide-react";
import { cn } from "cn";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { Skeleton } from "@/components/ui/skeleton";
import type { AnnouncementItem, UserRole } from "./types";
import { fetchAnnouncements } from "./sample-data";
import { AnnouncementForm } from "./announcement-form";
import { ReportDialog } from "@/features/reports";

export interface AnnouncementsViewProps {
  initialData?: AnnouncementItem[];
  userRole?: UserRole;
  forcedState?: "loading" | "empty" | "error" | "success";
  onAnnouncementCreated?: (item: AnnouncementItem) => void;
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

export function AnnouncementsView({
  initialData,
  userRole = "student",
  forcedState,
  onAnnouncementCreated,
}: AnnouncementsViewProps) {
  const [items, setItems] = React.useState<AnnouncementItem[]>(initialData || []);
  const [loading, setLoading] = React.useState<boolean>(
    forcedState === "loading" || (!initialData && !forcedState),
  );
  const [error, setError] = React.useState<{ message: string; requestId: string } | null>(
    forcedState === "error"
      ? {
          message:
            "Unable to load campus announcements. Please check your connection and try again.",
          requestId: "req-err-ann-500",
        }
      : null,
  );

  const loadData = React.useCallback(async () => {
    if (forcedState) return;
    setLoading(true);
    setError(null);
    try {
      const response = await fetchAnnouncements();
      setItems(response.data);
    } catch {
      setError({
        message: "Unable to retrieve announcements from your college right now.",
        requestId: "req-ann-fetch-fail",
      });
    } finally {
      setLoading(false);
    }
  }, [forcedState]);

  React.useEffect(() => {
    let active = true;
    if (!initialData && !forcedState) {
      fetchAnnouncements()
        .then((response) => {
          if (active) {
            setItems(response.data);
            setLoading(false);
          }
        })
        .catch(() => {
          if (active) {
            setError({
              message: "Unable to retrieve announcements from your college right now.",
              requestId: "req-ann-fetch-fail",
            });
            setLoading(false);
          }
        });
    }
    return () => {
      active = false;
    };
  }, [initialData, forcedState]);

  const handleCreated = (item: AnnouncementItem) => {
    setItems((prev) => {
      const next = [item, ...prev];
      // Keep pinned first
      return next.sort((a, b) => {
        if (a.pinned !== b.pinned) {
          return a.pinned ? -1 : 1;
        }
        return new Date(b.publish_at).getTime() - new Date(a.publish_at).getTime();
      });
    });
    onAnnouncementCreated?.(item);
  };

  // 1. Loading State
  if (loading || forcedState === "loading") {
    return (
      <div data-testid="announcements-loading" className="flex flex-col gap-6">
        <div className="flex flex-col gap-2">
          <Skeleton className="h-8 w-64" />
          <Skeleton className="h-5 w-80" />
        </div>
        <div className="flex flex-col gap-4">
          {[1, 2, 3].map((n) => (
            <div
              key={n}
              className="flex flex-col gap-3 rounded-card border border-border bg-surface p-5"
            >
              <div className="flex items-center justify-between">
                <Skeleton className="h-6 w-32" />
                <Skeleton className="h-5 w-24" />
              </div>
              <Skeleton className="h-6 w-3/4" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-5/6" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  // 2. Error State
  if (error || forcedState === "error") {
    return (
      <div data-testid="announcements-error" className="flex flex-col gap-6">
        <h1 className="font-heading text-2xl font-semibold sm:text-3xl">Campus Announcements</h1>
        <div className="flex flex-col items-start gap-4 rounded-card border border-border-strong bg-surface p-6">
          <div className="flex items-center gap-2 text-danger">
            <AlertCircleIcon className="size-6 shrink-0" aria-hidden="true" />
            <h2 className="font-heading text-xl font-semibold text-foreground">
              Could not load announcements
            </h2>
          </div>
          <p className="text-base text-foreground">
            {error?.message ||
              "We encountered an issue retrieving official notices from your college. Please try again."}
          </p>
          <p className="text-base text-muted-foreground">
            Reference ID: <code>{error?.requestId || "req-err-ann-default"}</code>
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

  const displayedItems = forcedState === "empty" ? [] : items;

  // Ensure pinned announcements are ordered first
  const sortedItems = [...displayedItems].sort((a, b) => {
    if (a.pinned !== b.pinned) {
      return a.pinned ? -1 : 1;
    }
    return new Date(b.publish_at).getTime() - new Date(a.publish_at).getTime();
  });

  return (
    <div data-testid="announcements-container" className="flex flex-col gap-6">
      {/* Header */}
      <div className="flex flex-col gap-2">
        <h1 className="font-heading text-2xl font-semibold sm:text-3xl">Campus Announcements</h1>
        <p className="text-base text-muted-foreground">
          Official notices, academic schedules, and campus updates from your college.
        </p>
      </div>

      {/* Moderator/Admin Post Form (Hidden from students) */}
      <AnnouncementForm userRole={userRole} onAnnouncementCreated={handleCreated} />

      {/* 3. Empty State */}
      {sortedItems.length === 0 ? (
        <EmptyState
          icon={<MegaphoneIcon className="size-8" />}
          title="No announcements yet"
          description="There are currently no official announcements posted for your college. Check back later for campus notices."
        />
      ) : (
        /* 4. Success State (List) */
        <ul className="flex flex-col gap-4" aria-label="Announcements list">
          {sortedItems.map((announcement) => (
            <li
              key={announcement.id}
              className={cn(
                "flex flex-col gap-3 rounded-card border bg-surface p-5 transition-shadow",
                announcement.pinned
                  ? "border-primary/60 bg-accent/15 ring-1 ring-primary/20"
                  : "border-border",
              )}
            >
              {/* Card Meta & Badges */}
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex flex-wrap items-center gap-2">
                  {announcement.pinned && (
                    <Badge variant="default" className="flex items-center gap-1.5 font-semibold">
                      <PinIcon className="size-4 shrink-0" aria-hidden="true" />
                      <span>Pinned</span>
                    </Badge>
                  )}
                  <span className="flex items-center gap-1 text-base text-muted-foreground">
                    <UserIcon className="size-4" aria-hidden="true" />
                    <span>{announcement.author_name}</span>
                  </span>
                  <span className="text-base text-muted-foreground" aria-hidden="true">
                    •
                  </span>
                  <Badge variant="outline">{announcement.author_role}</Badge>
                </div>

                <div className="flex items-center gap-3 text-base text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <CalendarIcon className="size-4" aria-hidden="true" />
                    <time dateTime={announcement.publish_at}>
                      {formatDate(announcement.publish_at)}
                    </time>
                  </span>
                  <ReportDialog
                    targetType="announcement"
                    targetId={announcement.id}
                    targetTitle={announcement.title}
                  />
                </div>
              </div>

              {/* Title and Body */}
              <div className="flex flex-col gap-2">
                <h2 className="font-heading text-xl font-semibold text-foreground">
                  {announcement.title}
                </h2>
                {/* Security: Render strictly as plain text, never dangerouslySetInnerHTML */}
                <p className="text-base leading-relaxed text-foreground whitespace-pre-line">
                  {announcement.body}
                </p>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
