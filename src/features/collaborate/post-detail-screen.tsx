"use client";

import * as React from "react";
import Link from "next/link";
import { CalendarIcon, ExternalLinkIcon, MessageCircleIcon, PencilIcon } from "lucide-react";
import { Banner } from "@/components/ui/banner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { LoadError } from "@/components/app/load-error";
import { Spinner } from "@/components/app/spinner";
import { ApiError, friendlyMessage } from "@/lib/api-client";
import { api, type TeamPostDetail } from "@/lib/api/endpoints";
import { useLoad } from "@/lib/use-load";
import { useCollege } from "@/features/college";
import { KIND_LABEL, formatDeadline } from "./labels";
import { StatusPill } from "./post-row";
import { PostRequests } from "./post-requests";
import { ReportButton } from "@/features/admin-console/report-button";
import { RoleList } from "./role-list";

function CloseDialog({
  post,
  open,
  onOpenChange,
  onClosed,
}: {
  post: TeamPostDetail;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onClosed: () => void;
}) {
  const { slug } = useCollege();
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  async function close() {
    setBusy(true);
    setError(null);
    try {
      await api.teamPosts.close(slug, post.id);
      onOpenChange(false);
      onClosed();
    } catch (caught) {
      setError(friendlyMessage(caught, "We could not close the post. Please try again."));
    } finally {
      setBusy(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={(next) => !busy && onOpenChange(next)}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Close this post?</DialogTitle>
          <DialogDescription>
            No one can ask to join anymore. Requests that are still waiting are cancelled and those
            people are told. You cannot open it again.
          </DialogDescription>
        </DialogHeader>
        {error ? (
          <Banner variant="error">
            <p>{error}</p>
          </Banner>
        ) : null}
        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)} disabled={busy}>
            Keep it open
          </Button>
          <Button variant="destructive" onClick={() => void close()} disabled={busy}>
            {busy ? <Spinner /> : null} Close the post
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function PostBody({ post, reload }: { post: TeamPostDetail; reload: () => void }) {
  const { slug } = useCollege();
  const [closing, setClosing] = React.useState(false);

  return (
    <article className="flex flex-col gap-8">
      <header className="flex flex-col gap-4 border-b border-border pb-6">
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5 text-[14px]">
          <span className="font-semibold uppercase tracking-[0.06em] text-ink">
            {KIND_LABEL[post.kind]}
          </span>
          <StatusPill status={post.status} />
        </div>
        <h1 className="text-balance text-3xl font-semibold leading-tight tracking-tight sm:text-4xl">
          {post.title}
        </h1>
        <p className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[15px] text-ink-muted">
          <span>
            by{" "}
            <Link
              href={`/c/${slug}/people/${post.author.user_id}`}
              className="font-medium text-ink underline-offset-4 hover:underline"
            >
              {post.author.display_name}
            </Link>
          </span>
          <span className="inline-flex items-center gap-1.5">
            <CalendarIcon aria-hidden="true" className="size-4" />
            {formatDeadline(post.deadline)}
          </span>
        </p>
        {!post.is_owner ? (
          <div>
            <ReportButton targetType="team_post" targetId={post.id} what="this post" />
          </div>
        ) : null}
        {post.is_owner && post.status === "open" ? (
          <div className="flex flex-wrap gap-3">
            <Button asChild variant="outline">
              <Link href={`/c/${slug}/collaborate/${post.id}/edit`}>
                <PencilIcon aria-hidden="true" /> Edit
              </Link>
            </Button>
            <Button variant="ghost" onClick={() => setClosing(true)}>
              Close the post
            </Button>
          </div>
        ) : null}
      </header>

      {post.status !== "open" ? (
        <Banner
          variant="info"
          title={post.status === "filled" ? "The team is full" : "Not taking requests"}
        >
          <p>
            {post.status === "filled"
              ? "Every role has been filled."
              : post.status === "expired"
                ? "The deadline has passed."
                : "The author closed this post."}
          </p>
        </Banner>
      ) : null}

      {post.description ? (
        <section aria-labelledby="about" className="max-w-prose">
          <h2 id="about" className="sr-only">
            About
          </h2>
          <p className="whitespace-pre-line text-[17px] leading-relaxed">{post.description}</p>
        </section>
      ) : null}

      {post.external_link || post.team_link ? (
        <section aria-label="Links" className="flex flex-col gap-2">
          {post.external_link ? (
            <a
              href={post.external_link}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex min-h-11 w-fit items-center gap-2 font-medium text-primary underline underline-offset-4"
            >
              <ExternalLinkIcon aria-hidden="true" className="size-4" /> More details
            </a>
          ) : null}
          {post.team_link ? (
            <a
              href={post.team_link}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex min-h-11 w-fit items-center gap-2 font-medium text-primary underline underline-offset-4"
            >
              <MessageCircleIcon aria-hidden="true" className="size-4" /> Team chat
            </a>
          ) : null}
        </section>
      ) : null}

      <RoleList post={post} onChanged={reload} />

      {post.is_owner ? <PostRequests post={post} onChanged={reload} /> : null}

      <CloseDialog post={post} open={closing} onOpenChange={setClosing} onClosed={reload} />
    </article>
  );
}

export function PostDetailScreen({ postId }: { postId: string }) {
  const { slug } = useCollege();
  const state = useLoad(() => api.teamPosts.one(slug, postId), [slug, postId]);

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-6 px-5 py-8 md:px-8 md:py-12">
      <Link
        href={`/c/${slug}/collaborate`}
        className="-ml-1 inline-flex min-h-11 w-fit items-center rounded-input px-1 text-[15px] font-medium text-ink-muted hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        ← All posts
      </Link>
      {state.status === "loading" ? (
        <div aria-busy="true" className="flex flex-col gap-4">
          <Skeleton className="h-4 w-32" />
          <Skeleton className="h-10 w-3/4" />
          <Skeleton className="h-24 w-full" />
        </div>
      ) : state.status === "error" ? (
        state.error instanceof ApiError && state.error.status === 404 ? (
          <div className="rounded-card border border-border p-8">
            <p className="text-lg font-semibold">This post is not available.</p>
            <p className="mt-1 text-ink-muted">
              It may have been removed, or it belongs to another space.
            </p>
          </div>
        ) : (
          <LoadError error={state.error} onRetry={state.reload} what="this post" />
        )
      ) : (
        <PostBody post={state.data} reload={state.reload} />
      )}
    </div>
  );
}
