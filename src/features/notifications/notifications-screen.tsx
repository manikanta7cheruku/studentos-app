"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  BellIcon,
  MessageCircleIcon,
  CalendarCheckIcon,
  MapPinnedIcon,
  CheckCheckIcon,
  ChevronRightIcon,
  MegaphoneIcon,
  ScaleIcon,
  ShieldAlertIcon,
  UserCheckIcon,
  UserPlusIcon,
  UsersIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { GlideTabs } from "@/components/app/glide-tabs";
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
  if (item.type.startsWith("team.")) {
    const postId = item.payload.post_id;
    return typeof postId === "string" ? `${base}/collaborate/${postId}` : `${base}/collaborate`;
  }
  if (item.type.startsWith("venue.")) {
    const venueId = item.payload.venue_id;
    // The manager answers on the venue page, the person who asked sees it in My bookings.
    if (item.type === "venue.booking_requested" || item.type === "venue.booking_cancelled")
      return typeof venueId === "string" ? `${base}/turf/${venueId}` : `${base}/turf`;
    return `${base}/turf/bookings`;
  }
  if (item.type === "dm.received") {
    const from = item.payload.from;
    return typeof from === "string" ? `${base}/messages/${from}` : `${base}/messages`;
  }
  if (item.type === "debate.invited") {
    const debateId = item.payload.debate_id;
    return typeof debateId === "string" ? `${base}/debates/${debateId}` : `${base}/debates`;
  }
  // A person's own content was removed, warned about or actioned: the page where they can read the rules and their profile.
  if (
    item.type === "content.removed" ||
    item.type.startsWith("moderation.") ||
    item.type === "report.actioned"
  )
    return "/safety";
  if (item.type === "opportunity.deadline_soon") return `${base}/career`;
  if (item.type.startsWith("membership.")) return `${base}/me`;
  return null;
}

/** An icon and two colours for each kind of notification, so the list can be scanned at a glance. */
function look(type: string): { icon: React.ReactNode; tint: string } {
  if (type === "team.joined")
    return { icon: <UserPlusIcon />, tint: "from-[#2fb98a] to-[#2f90b9]" };
  if (type.startsWith("team.request_accepted") || type === "membership.approved")
    return { icon: <UserCheckIcon />, tint: "from-[#2fb98a] to-[#2f90b9]" };
  if (type.startsWith("team.")) return { icon: <UsersIcon />, tint: "from-[#5b54d6] to-[#8a5fd0]" };
  if (type === "dm.received")
    return { icon: <MessageCircleIcon />, tint: "from-[#d6549a] to-[#e0866a]" };
  if (type === "venue.booking_confirmed")
    return { icon: <CalendarCheckIcon />, tint: "from-[#2fb98a] to-[#2f90b9]" };
  if (type.startsWith("venue."))
    return { icon: <MapPinnedIcon />, tint: "from-[#2f9fd0] to-[#4f6fe0]" };
  if (type === "content.removed" || type.startsWith("moderation.") || type === "report.actioned")
    return { icon: <ShieldAlertIcon />, tint: "from-[#d99a3a] to-[#d6665a]" };
  if (type === "debate.invited")
    return { icon: <ScaleIcon />, tint: "from-[#e0866a] to-[#d6549a]" };
  if (type === "announcement.published")
    return { icon: <MegaphoneIcon />, tint: "from-[#2f9fd0] to-[#4f6fe0]" };
  return { icon: <BellIcon />, tint: "from-[#5b54d6] to-[#7a5198]" };
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

// What a notification is about, for the filter row. The row only lists kinds that have something in it.
const CATEGORIES = [
  { id: "messages", label: "Messages" },
  { id: "plans", label: "Plans" },
  { id: "debates", label: "Debates" },
  { id: "turf", label: "Turf" },
  { id: "campus", label: "Campus" },
  { id: "safety", label: "Safety" },
] as const;
type Category = (typeof CATEGORIES)[number]["id"];

export function categoryOf(type: string): Category {
  if (type === "dm.received") return "messages";
  if (type.startsWith("team.")) return "plans";
  if (type.startsWith("debate.")) return "debates";
  if (type.startsWith("venue.")) return "turf";
  if (type === "content.removed" || type.startsWith("moderation.") || type === "report.actioned")
    return "safety";
  return "campus";
}

/** "Today", "Yesterday", "Earlier this week" or a date: the heading above a group of notifications. */
function dayLabel(iso: string, now = new Date()): string {
  const start = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
  const diff = Math.round((start(now) - start(new Date(iso))) / 86_400_000);
  if (diff <= 0) return "Today";
  if (diff === 1) return "Yesterday";
  if (diff < 7) return "Earlier this week";
  return "Older";
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
  const [tab, setTab] = React.useState<"all" | "unread">("all");
  const [category, setCategory] = React.useState<Category | "all">("all");

  // New notifications appear on their own: fetch the first page again every few seconds while the page is in front.
  const { reload } = first;
  React.useEffect(() => {
    const timer = window.setInterval(() => {
      if (document.visibilityState === "visible") reload();
    }, 15_000);
    const back = () => {
      if (document.visibilityState === "visible") reload();
    };
    document.addEventListener("visibilitychange", back);
    return () => {
      window.clearInterval(timer);
      document.removeEventListener("visibilitychange", back);
    };
  }, [reload]);

  // The first page can move on while older pages are open, so the same notification is never listed twice.
  const items = React.useMemo(() => {
    const seen = new Set<string>();
    const all = first.status === "ready" ? [...first.data.data, ...extra] : [];
    return all.filter((item) => (seen.has(item.id) ? false : (seen.add(item.id), true)));
  }, [first, extra]);
  const nextCursor =
    cursor === undefined && first.status === "ready" ? first.data.meta.next_cursor : cursor;
  const isRead = (item: NotificationItem) =>
    allRead || readIds.has(item.id) || item.read_at !== null;
  const unread = items.filter((item) => !isRead(item)).length;
  const inCategory = (item: NotificationItem) =>
    category === "all" || categoryOf(item.type) === category;
  const shown = items.filter((item) => (tab === "all" || !isRead(item)) && inCategory(item));
  // The kinds that have something in them, with how many are unread, for the filter row.
  const kinds = CATEGORIES.map((c) => ({
    ...c,
    total: items.filter((item) => categoryOf(item.type) === c.id).length,
    unread: items.filter((item) => categoryOf(item.type) === c.id && !isRead(item)).length,
  })).filter((c) => c.total > 0);

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

  // Group by day, newest first, keeping each group's heading once.
  const groups: { label: string; rows: NotificationItem[] }[] = [];
  for (const item of shown) {
    const label = dayLabel(item.created_at);
    const last = groups[groups.length - 1];
    if (last && last.label === label) last.rows.push(item);
    else groups.push({ label, rows: [item] });
  }

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-4 px-4 pt-2 pb-2 md:px-8 md:py-8">
      <PageHeader app title="Updates" />
      <div className="flex items-center gap-2">
        <GlideTabs
          label="Which updates"
          value={tab}
          onChange={setTab}
          className="flex-1"
          tabs={[
            { value: "all", label: "All" },
            { value: "unread", label: unread ? `Unread (${unread})` : "Unread" },
          ]}
        />
        <Button
          variant="outline"
          size="icon"
          onClick={markAll}
          disabled={busy !== null || unread === 0}
          aria-label="Mark all as read"
          title="Mark all as read"
          className="size-11 shrink-0 rounded-full"
        >
          {busy === "all" ? <Spinner /> : <CheckCheckIcon aria-hidden="true" />}
        </Button>
      </div>

      {kinds.length > 1 ? (
        <div
          role="group"
          aria-label="What it is about"
          className="no-scrollbar -mx-4 flex gap-2 overflow-x-auto px-4 md:mx-0 md:flex-wrap md:px-0"
        >
          {[{ id: "all" as const, label: "Everything", unread: 0 }, ...kinds].map((c) => (
            <button
              key={c.id}
              type="button"
              aria-pressed={category === c.id}
              onClick={() => setCategory(c.id)}
              className={`inline-flex h-8 shrink-0 items-center gap-1.5 rounded-full border px-3.5 text-[12.5px] font-semibold outline-none transition-[background-color,border-color,color,transform] duration-200 focus-visible:ring-2 focus-visible:ring-ring active:scale-95 ${
                category === c.id
                  ? "bg-brand border-transparent text-white"
                  : "border-white/10 bg-white/[0.04] text-ink-muted hover:border-white/25 hover:text-ink"
              }`}
            >
              {c.label}
              {c.unread > 0 ? (
                <span
                  className={`tabular rounded-full px-1.5 text-[11px] font-bold ${
                    category === c.id ? "bg-white/25" : "bg-brand text-white"
                  }`}
                >
                  {c.unread}
                </span>
              ) : null}
            </button>
          ))}
        </div>
      ) : null}

      {first.status === "loading" ? (
        <div className="flex flex-col gap-2.5" aria-busy="true" aria-label="Loading notifications">
          {[0, 1, 2, 3].map((n) => (
            <div key={n} className="glass-card flex items-start gap-3.5 rounded-[20px] p-4">
              <Skeleton className="size-11 rounded-[14px]" />
              <div className="flex-1">
                <Skeleton className="h-5 w-1/2" />
                <Skeleton className="mt-2 h-4 w-3/4" />
              </div>
            </div>
          ))}
        </div>
      ) : first.status === "error" ? (
        <LoadError error={first.error} onRetry={first.reload} what="your notifications" />
      ) : shown.length === 0 ? (
        <div className="glass-card flex flex-col items-center gap-3 rounded-[24px] px-6 py-12 text-center">
          <span className="bg-brand inline-flex size-12 items-center justify-center rounded-2xl text-white">
            <BellIcon aria-hidden="true" className="size-6" />
          </span>
          <p className="text-lg font-bold">
            {items.length > 0
              ? tab === "unread"
                ? "Nothing unread here"
                : "Nothing in this filter"
              : "You are all caught up"}
          </p>
          <p className="max-w-[34ch] text-[14px] text-ink-muted">
            When someone answers a request of yours, invites you to a debate, or your college posts
            something, you will see it here.
          </p>
          <Button asChild variant="outline" className="mt-1">
            <Link href={`/c/${slug}`}>Back to Home</Link>
          </Button>
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          {groups.map((group) => (
            <section key={group.label} aria-label={group.label}>
              <h2 className="mb-2 px-1 text-[11.5px] font-bold uppercase tracking-[0.1em] text-ink-muted">
                {group.label}
              </h2>
              <ul className="stagger flex flex-col gap-2.5">
                {group.rows.map((item) => {
                  const read = isRead(item);
                  const goes = notificationHref(item, slug) !== null;
                  return (
                    <li key={item.id}>
                      <button
                        type="button"
                        onClick={() => open(item)}
                        className="glass-card lift flex min-h-[4.5rem] w-full items-start gap-3.5 rounded-[20px] p-4 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                      >
                        <span
                          aria-hidden="true"
                          className={`inline-flex size-11 shrink-0 items-center justify-center rounded-[14px] bg-gradient-to-br text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.3)] [&_svg]:size-5 ${look(item.type).tint} ${read ? "opacity-60" : ""}`}
                        >
                          {look(item.type).icon}
                        </span>
                        <span className="min-w-0 flex-1">
                          <span
                            className={`block text-[15px] leading-snug ${read ? "text-ink" : "font-semibold text-ink"}`}
                          >
                            {read ? null : <span className="sr-only">Unread: </span>}
                            {item.payload.title}
                          </span>
                          <span className="mt-1 block text-[14px] leading-relaxed text-ink-muted">
                            {item.payload.message}
                          </span>
                          <span className="mt-1.5 block text-[12.5px] text-ink-muted">
                            {timeAgo(item.created_at)}
                          </span>
                        </span>
                        {read ? null : (
                          <span
                            aria-hidden="true"
                            className="bg-brand mt-1.5 size-2.5 shrink-0 rounded-full"
                          />
                        )}
                        {goes ? (
                          <ChevronRightIcon
                            aria-hidden="true"
                            className="mt-3 size-4 shrink-0 text-ink-muted/60"
                          />
                        ) : null}
                      </button>
                    </li>
                  );
                })}
              </ul>
            </section>
          ))}
        </div>
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
