"use client";

import * as React from "react";
import { Button } from "@/components/ui/button";
import { LoadError } from "@/components/app/load-error";
import { api, type ContentItem } from "@/lib/api/endpoints";
import { timeAgo } from "@/features/notifications/notifications-screen";
import { useLoad } from "@/lib/use-load";
import { useCollege } from "@/features/college";
import { ConsolePage, EmptyNote, ListSkeleton } from "./admin-shell";
import { RemoveDialog } from "./remove-dialog";

const KIND_LABEL: Record<ContentItem["kind"], string> = {
  plan: "Plan",
  thought: "Buzz",
  event: "Event",
  listing: "Board post",
};

function Row({ item, onDone }: { item: ContentItem; onDone: () => void }) {
  const { slug } = useCollege();
  const [open, setOpen] = React.useState(false);
  return (
    <li className="flex flex-wrap items-center gap-3 py-3.5">
      <span className="rounded-full border border-border px-2.5 py-0.5 text-[12px] font-semibold text-ink-muted">
        {KIND_LABEL[item.kind]}
      </span>
      <div className="min-w-0 flex-1">
        <p className="truncate text-[15px] font-semibold">{item.title || "(no title)"}</p>
        <p className="text-[13px] text-ink-muted">
          {item.author} · {timeAgo(item.created_at)}
        </p>
      </div>
      <Button variant="outline" size="sm" onClick={() => setOpen(true)}>
        Remove
      </Button>
      <RemoveDialog
        slug={slug}
        kind={item.kind}
        id={item.id}
        open={open}
        onOpenChange={setOpen}
        onRemoved={onDone}
      />
    </li>
  );
}

/** The newest plans, buzz, events and board posts. A moderator removes one with a reason the author receives. */
export function ContentScreen() {
  const { slug } = useCollege();
  const state = useLoad(() => api.admin.content(slug), [slug]);
  return (
    <ConsolePage
      title="Content"
      description="Remove a plan, buzz, event or board post. You pick the reason and the person who posted it is told."
    >
      {state.status === "loading" ? (
        <ListSkeleton />
      ) : state.status === "error" ? (
        <LoadError error={state.error} onRetry={state.reload} what="the content" />
      ) : state.data.length === 0 ? (
        <EmptyNote>Nothing has been posted yet.</EmptyNote>
      ) : (
        <ul className="divide-y divide-border border-y border-border">
          {state.data.map((item) => (
            <Row key={`${item.kind}-${item.id}`} item={item} onDone={state.reload} />
          ))}
        </ul>
      )}
    </ConsolePage>
  );
}
