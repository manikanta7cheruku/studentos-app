"use client";

import * as React from "react";
import { PinIcon } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { LoadError } from "@/components/app/load-error";
import { PageHeader } from "@/components/app/page-header";
import { api, type Announcement } from "@/lib/api/endpoints";
import { useLoad } from "@/lib/use-load";
import { useCollege } from "@/features/college";

function when(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function AnnouncementCard({ item }: { item: Announcement }) {
  const [open, setOpen] = React.useState(false);
  const long = item.body.length > 280;
  return (
    <article className="rounded-card border border-border bg-surface p-5 sm:p-6">
      {item.pinned ? (
        <p className="mb-2 inline-flex items-center gap-1.5 text-[12px] font-semibold uppercase tracking-[0.08em] text-primary">
          <PinIcon aria-hidden="true" className="size-3.5" /> Pinned
        </p>
      ) : null}
      <h2 className="text-xl font-semibold leading-snug">{item.title}</h2>
      <p
        className={`mt-2 whitespace-pre-line text-[15px] leading-relaxed text-ink ${long && !open ? "line-clamp-4" : ""}`}
      >
        {item.body}
      </p>
      {long ? (
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          className="mt-2 inline-flex min-h-11 items-center rounded-input text-[13.5px] font-semibold text-primary hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          {open ? "Show less" : "Read more"}
        </button>
      ) : null}
      <p className="mt-3 text-[13px] text-ink-muted">
        {item.author.display_name} · <time dateTime={item.publish_at}>{when(item.publish_at)}</time>
      </p>
    </article>
  );
}

export function CampusScreen() {
  const { slug, college } = useCollege();
  const state = useLoad(() => api.announcements.list(slug), [slug]);

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-8 px-5 py-8 md:px-8 md:py-12">
      <PageHeader
        eyebrow={college.name}
        title="Campus"
        description="Notices from your college. Pinned ones stay at the top."
      />
      {state.status === "loading" ? (
        <div className="flex flex-col gap-4" aria-busy="true" aria-label="Loading announcements">
          {[0, 1, 2].map((n) => (
            <div key={n} className="rounded-card border border-border bg-surface p-6">
              <Skeleton className="h-6 w-2/3" />
              <Skeleton className="mt-4 h-4 w-full" />
              <Skeleton className="mt-2 h-4 w-5/6" />
            </div>
          ))}
        </div>
      ) : state.status === "error" ? (
        <LoadError error={state.error} onRetry={state.reload} what="the announcements" />
      ) : state.data.data.length === 0 ? (
        <div className="rounded-card border border-dashed border-border-strong bg-surface/60 p-8">
          <p className="text-lg font-semibold">No announcements yet.</p>
          <p className="mt-1 max-w-prose text-ink-muted">
            When your college admins or moderators post a notice, it shows up here and you get a
            notification.
          </p>
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          {state.data.data.map((item) => (
            <AnnouncementCard key={item.id} item={item} />
          ))}
        </div>
      )}
    </div>
  );
}
