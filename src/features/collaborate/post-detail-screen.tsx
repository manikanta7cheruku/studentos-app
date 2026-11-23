"use client";

import * as React from "react";
import Link from "next/link";
import {
  CalendarClockIcon,
  ExternalLinkIcon,
  MapPinIcon,
  MessageCircleIcon,
  PencilIcon,
  UsersRoundIcon,
} from "lucide-react";
import { Banner } from "@/components/ui/banner";
import { Fact, GlassTile } from "@/components/app/glass-parts";
import { GlassSheet } from "@/components/app/glass-sheet";
import { Skeleton } from "@/components/ui/skeleton";
import { LoadError } from "@/components/app/load-error";
import { PageHeader } from "@/components/app/page-header";
import { Spinner } from "@/components/app/spinner";
import { ApiError, friendlyMessage } from "@/lib/api-client";
import { api, type TeamPostDetail } from "@/lib/api/endpoints";
import { useLoad } from "@/lib/use-load";
import { useCollege } from "@/features/college";
import { KIND_LABEL, formatDeadline, isTimedKind } from "./labels";
import { StatusPill } from "./post-row";
import { PostRequests } from "./post-requests";
import { ReportMenu } from "@/features/admin-console/report-menu";
import { RoleList } from "./role-list";
import { Participants } from "./participants";
import { RemoveDialog } from "@/features/admin-console/remove-dialog";

function startLabel(deadline: string | null): string {
  if (!deadline) return "No time set";
  const date = new Date(deadline);
  if (Number.isNaN(date.getTime())) return "No time set";
  return date.toLocaleString(undefined, {
    weekday: "short",
    day: "numeric",
    month: "short",
    hour: "numeric",
    minute: "2-digit",
  });
}

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
    <GlassSheet
      open={open}
      onOpenChange={(next) => !busy && onOpenChange(next)}
      title="Close this post?"
      description="No one can ask to join anymore. Requests that are still waiting are cancelled and those people are told. You cannot open it again."
    >
      {error ? (
        <Banner variant="error">
          <p>{error}</p>
        </Banner>
      ) : null}
      <div className="flex gap-2.5 pt-5">
        <button
          type="button"
          className="profile-btn flex-1"
          onClick={() => onOpenChange(false)}
          disabled={busy}
        >
          Keep it open
        </button>
        <button
          type="button"
          className="profile-btn profile-btn-primary flex-1"
          onClick={() => void close()}
          disabled={busy}
        >
          {busy ? <Spinner /> : null} Close the post
        </button>
      </div>
    </GlassSheet>
  );
}

function PostBody({ post, reload }: { post: TeamPostDetail; reload: () => void }) {
  const { slug, isModerator } = useCollege();
  const [closing, setClosing] = React.useState(false);
  const [removing, setRemoving] = React.useState(false);
  const version = post.roles.map((role) => role.filled).join(",") + post.status;

  return (
    <article className="flex flex-col gap-4">
      <header className="glass-card flex flex-col gap-5 rounded-[24px] p-5">
        <div className="flex items-start gap-3.5">
          <GlassTile size="lg">
            <UsersRoundIcon />
          </GlassTile>
          <div className="min-w-0 flex-1">
            <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-ink-muted">
              {KIND_LABEL[post.kind]}
            </p>
            <h1 className="text-balance font-heading text-[1.45rem] font-extrabold leading-tight tracking-tight [overflow-wrap:anywhere]">
              {post.title}
            </h1>
            <p className="mt-1 text-[13px] text-ink-muted">
              by{" "}
              <Link
                href={`/c/${slug}/people/${post.author.user_id}`}
                className="font-medium text-ink underline-offset-4 hover:underline"
              >
                {post.author.display_name}
              </Link>
            </p>
          </div>
          <StatusPill status={post.status} />
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <Fact icon={<CalendarClockIcon />} label={isTimedKind(post.kind) ? "When" : "Deadline"}>
            {isTimedKind(post.kind) ? startLabel(post.deadline) : formatDeadline(post.deadline)}
          </Fact>
          {post.place ? (
            <Fact icon={<MapPinIcon />} label="Where">
              {post.place}
            </Fact>
          ) : null}
          {post.join_mode === "open" && post.status === "open" ? (
            <Fact icon={<UsersRoundIcon />} label="Joining">
              Open to everyone
              <span className="block text-[13px] font-normal text-ink-muted">
                Tap Join, no approval needed
              </span>
            </Fact>
          ) : null}
        </div>

        {post.is_owner && post.status === "open" ? (
          <div className="flex gap-2.5">
            <Link href={`/c/${slug}/collaborate/${post.id}/edit`} className="profile-btn flex-1">
              <PencilIcon aria-hidden="true" /> Edit
            </Link>
            <button type="button" className="profile-btn flex-1" onClick={() => setClosing(true)}>
              Close the post
            </button>
          </div>
        ) : null}
        {!post.is_owner || (isModerator && !post.is_owner) ? (
          <div className="flex flex-wrap items-center gap-2.5">
            {!post.is_owner ? (
              <ReportMenu targetType="team_post" targetId={post.id} what="plan" />
            ) : null}
            {isModerator && !post.is_owner ? (
              <button type="button" className="profile-btn" onClick={() => setRemoving(true)}>
                Remove this plan
              </button>
            ) : null}
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
        <section aria-labelledby="about" className="glass-card rounded-[22px] p-4">
          <h2 id="about" className="sr-only">
            About
          </h2>
          <p className="whitespace-pre-line text-[14.5px] leading-relaxed [overflow-wrap:anywhere]">
            {post.description}
          </p>
        </section>
      ) : null}

      {post.external_link || post.team_link ? (
        <section aria-label="Links" className="flex flex-wrap gap-2.5">
          {post.external_link ? (
            <a
              href={post.external_link}
              target="_blank"
              rel="noopener noreferrer"
              className="profile-btn w-fit"
            >
              <ExternalLinkIcon aria-hidden="true" className="size-4" /> More details
            </a>
          ) : null}
          {post.team_link ? (
            <a
              href={post.team_link}
              target="_blank"
              rel="noopener noreferrer"
              className="profile-btn w-fit"
            >
              <MessageCircleIcon aria-hidden="true" className="size-4" /> Team chat
            </a>
          ) : null}
        </section>
      ) : null}

      <RoleList post={post} onChanged={reload} />

      <Participants post={post} version={version} />

      {post.is_owner ? <PostRequests post={post} onChanged={reload} /> : null}

      <RemoveDialog
        slug={slug}
        kind="plan"
        id={post.id}
        open={removing}
        onOpenChange={setRemoving}
        onRemoved={reload}
      />
      <CloseDialog post={post} open={closing} onOpenChange={setClosing} onClosed={reload} />
    </article>
  );
}

export function PostDetailScreen({ postId }: { postId: string }) {
  const { slug } = useCollege();
  const state = useLoad(
    () => api.teamPosts.one(slug, postId),
    [slug, postId],
    `plan:${slug}:${postId}`,
  );

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-4 px-5 pt-4 pb-2 md:px-8 md:py-8">
      <PageHeader title="Plan" back={{ href: `/c/${slug}/collaborate`, label: "All plans" }} />
      {state.status === "loading" ? (
        <div aria-busy="true" className="flex flex-col gap-4">
          <Skeleton className="h-4 w-32" />
          <Skeleton className="h-10 w-3/4" />
          <Skeleton className="h-24 w-full" />
        </div>
      ) : state.status === "error" ? (
        state.error instanceof ApiError && state.error.status === 404 ? (
          <div className="glass-card rounded-[24px] p-8">
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
