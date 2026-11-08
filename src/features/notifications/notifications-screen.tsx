"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { CheckCheckIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { LoadError } from "@/components/app/load-error";
import { PageHeader } from "@/components/app/page-header";
import { Spinner } from "@/components/app/spinner";
import { ApiError, friendlyMessage } from "@/lib/api-client";
import { api, type NotificationItem } from "@/lib/api/endpoints";
import { useLoad } from "@/lib/use-load";
import { useCollege } from "@/features/college";

// The person's own notifications (NTF-01, NTF-02). A notification is a title and a sentence; the type decides where
// it leads. Opening one marks it read. "Mark all as read" does it for the whole list.

export function notificationHref(item: NotificationItem, slug: string): string | null {
  const base = `/c/${slug}`;
  if (item.type === "announcement.published") return `${base}/campus`;
  if (item.type.startsWith("team.")) return `${base}/collaborate`;
  if (item.type === "opportunity.deadline_soon") return `${base}/career`;
  if (item.type.startsWith("membership.")) return `${base}/me`;
  return null;
}

export function timeAgo(iso: string, now = Date.now()): string {
  const seconds = Math.max(0, Math.round((now - new Date(iso).getTime()) / 1000));
  if (seconds < 60) return "just now";
  const minutes = Math.round(seconds / 60);
  if (minutes < 60) return `${minutes} min ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours} h ago`;
  const days = Math.round(hours / 24);
  if (days < 7) return `${days} d ago`;
  return new Date(iso).toLocaleDateString(undefined, { day: "numeric", month: "short" });
}

export function NotificationsScreen() {
  const { slug, refreshUnread } = useCollege();
  const router = useRouter();
  const first = useLoad(() => api.notifications.list({ limit: 20 }), []);
  const [extra, setExtra] = React.useState<NotificationItem[]>([]);
  const [cursor, setCursor] = React.useState<string | null | undefined>(undefined);
  const [readIds, setReadIds] = React.useState<Set<string>>(new Set());
  const [allRead, setAllRead] = React.useState(false);
  const [busy, setBusy] = React.useState<"more" | "all" | null>(null);
  const [problem, setProblem] = React.useState<string | null>(null);

  const items = first.status === "ready" ? [...first.data.data, ...extra] : [];
  const nextCursor =
    cursor === undefined && first.status === "ready" ? first.data.meta.next_cursor : cursor;
  const isRead = (item: NotificationItem) =>
    allRead || readIds.has(item.id) || item.read_at !== null;
  const unread = items.filter((item) => !isRead(item)).length;

  async function open(item: NotificationItem) {
    const href = notificationHref(item, slug);
    if (!isRead(item)) {
      setReadIds((prev) => new Set(prev).add(item.id));
      api.notifications.markRead({ ids: [item.id] }).then(refreshUnread, () => undefined);
    }
    if (href) router.push(href);
  }

  async function markAll() {
    setBusy("all");
    setProblem(null);
    try {
      await api.notifications.markRead({ all: true });
      setAllRead(true);
      await refreshUnread();
    } catch (error) {
      setProblem(friendlyMessage(error));
    } finally {
      setBusy(null);
    }
  }

  async function loadMore() {
    if (!nextCursor) return;
    setBusy("more");
    setProblem(null);
    try {
      const page = await api.notifications.list({ limit: 20, cursor: nextCursor });
      setExtra((prev) => [...prev, ...page.data]);
      setCursor(page.meta.next_cursor ?? null);
    } catch (error) {
      setProblem(error instanceof ApiError ? friendlyMessage(error) : "Could not load more.");
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-8 px-5 py-8 md:px-8 md:py-12">
      <PageHeader
        eyebrow="Notifications"
        title="What needs your attention"
        description="Decisions on your requests, new announcements and reminders appear here."
        actions={
          <Button variant="outline" onClick={markAll} disabled={busy !== null || unread === 0}>
            {busy === "all" ? <Spinner /> : <CheckCheckIcon aria-hidden="true" />}
            Mark all as read
          </Button>
        }
      />

      {first.status === "loading" ? (
        <div
          className="flex flex-col gap-px overflow-hidden rounded-card border border-border"
          aria-busy="true"
          role="status"
          aria-label="Loading notifications"
        >
          {[0, 1, 2, 3].map((n) => (
            <div key={n} className="flex flex-col gap-2 bg-surface p-5">
              <Skeleton className="h-5 w-1/2" />
              <Skeleton className="h-4 w-3/4" />
            </div>
          ))}
        </div>
      ) : first.status === "error" ? (
        <LoadError error={first.error} onRetry={first.reload} what="your notifications" />
      ) : items.length === 0 ? (
        <div className="rounded-card border border-dashed border-border-strong bg-surface/60 p-8">
          <p className="text-lg font-semibold">You are all caught up.</p>
          <p className="mt-1 max-w-prose text-ink-muted">
            When someone answers a request of yours, or your college posts something, you will see
            it here.{" "}
            <Link
              href={`/c/${slug}/campus`}
              className="font-semibold text-primary underline underline-offset-4"
            >
              Go to Campus
            </Link>
          </p>
        </div>
      ) : (
        <ul className="overflow-hidden rounded-card border border-border bg-surface">
          {items.map((item) => {
            const read = isRead(item);
            return (
              <li key={item.id} className="border-b border-border last:border-b-0">
                <button
                  type="button"
                  onClick={() => open(item)}
                  className="flex min-h-[4.5rem] w-full items-start gap-4 p-5 text-left transition-colors hover:bg-accent-soft/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring"
                >
                  <span
                    aria-hidden="true"
                    className={`mt-2 size-2.5 shrink-0 rounded-full ${read ? "bg-transparent" : "bg-primary"}`}
                  />
                  <span className="min-w-0 flex-1">
                    <span
                      className={`block text-[17px] leading-snug ${read ? "text-ink" : "font-semibold text-ink"}`}
                    >
                      {read ? null : <span className="sr-only">Unread: </span>}
                      {item.payload.title}
                    </span>
                    <span className="mt-1 block text-[16px] leading-relaxed text-ink-muted">
                      {item.payload.message}
                    </span>
                    <span className="mt-1.5 block text-[14px] text-ink-muted">
                      {timeAgo(item.created_at)}
                    </span>
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      )}

      {problem ? (
        <p role="alert" className="text-danger">
          {problem}
        </p>
      ) : null}
      {nextCursor ? (
        <Button
          variant="outline"
          onClick={loadMore}
          disabled={busy !== null}
          className="self-start"
        >
          {busy === "more" ? <Spinner /> : null} Show older
        </Button>
      ) : null}
    </div>
  );
}
