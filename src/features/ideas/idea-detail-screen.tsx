"use client";

import { RemoveDialog } from "@/features/admin-console/remove-dialog";
import { ReportMenu } from "@/features/admin-console/report-menu";
import * as React from "react";
import { useRouter } from "next/navigation";
import { CornerDownRightIcon, SendIcon, Trash2Icon, XIcon } from "lucide-react";
import { cn } from "cn";
import { Banner } from "@/components/ui/banner";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Avatar } from "@/components/app/avatar";
import { LoadError } from "@/components/app/load-error";
import { PageHeader } from "@/components/app/page-header";
import { Spinner } from "@/components/app/spinner";
import { ApiError, friendlyMessage } from "@/lib/api-client";
import { api, type Idea, type IdeaComment } from "@/lib/api/endpoints";
import { timeAgo } from "@/lib/time-ago";
import { useAttempt } from "@/lib/use-attempt";
import { useLoad } from "@/lib/use-load";
import { useCollege } from "@/features/college";
import { IdeaCard, VotePill } from "./idea-card";

/** A delete that asks once more, in place, so nothing is removed by a stray tap. */
function ConfirmDelete({ label, onConfirm }: { label: string; onConfirm: () => Promise<void> }) {
  const [asking, setAsking] = React.useState(false);
  const [busy, setBusy] = React.useState(false);
  if (!asking) {
    return (
      <button
        type="button"
        onClick={() => setAsking(true)}
        className="inline-flex h-8 items-center gap-1.5 rounded-full px-2.5 text-[12.5px] font-semibold text-ink-muted outline-none transition-colors duration-200 hover:bg-white/10 hover:text-danger focus-visible:ring-2 focus-visible:ring-ring"
      >
        <Trash2Icon aria-hidden="true" className="size-3.5" /> {label}
      </button>
    );
  }
  return (
    <span className="inline-flex items-center gap-1.5 text-[12.5px]">
      <span className="text-ink-muted">Sure?</span>
      <button
        type="button"
        disabled={busy}
        onClick={async () => {
          setBusy(true);
          try {
            await onConfirm();
          } finally {
            setBusy(false);
            setAsking(false);
          }
        }}
        className="inline-flex h-8 items-center rounded-full bg-danger/15 px-3 font-semibold text-danger outline-none hover:bg-danger/25 focus-visible:ring-2 focus-visible:ring-ring"
      >
        {busy ? <Spinner /> : "Delete"}
      </button>
      <button
        type="button"
        onClick={() => setAsking(false)}
        className="inline-flex h-8 items-center rounded-full px-2.5 font-semibold text-ink-muted outline-none hover:bg-white/10 focus-visible:ring-2 focus-visible:ring-ring"
      >
        Keep
      </button>
    </span>
  );
}

function CommentRow({
  comment,
  nested,
  onReply,
  onRemoved,
}: {
  comment: IdeaComment;
  nested?: boolean;
  onReply?: (comment: IdeaComment) => void;
  onRemoved: () => void;
}) {
  const { slug, isModerator } = useCollege();
  const ideaId = useIdeaId();
  return (
    <li
      className={cn(
        "flex gap-2.5 py-3",
        nested ? "ml-5 border-l-2 border-white/[0.08] pl-4" : "border-t border-white/[0.07]",
      )}
    >
      <Avatar name={comment.author.display_name} size="xs" className="mt-0.5" />
      <div className="min-w-0 flex-1">
        <p className="text-[13px]">
          <span className="font-semibold">{comment.author.display_name}</span>
          {comment.by_buzz_author ? (
            <span className="ml-1.5 rounded-full bg-[#8f86f0]/20 px-2 py-0.5 text-[10.5px] font-bold uppercase tracking-wide text-[#c9c4f8]">
              Author
            </span>
          ) : null}
          <span className="text-ink-muted"> · {timeAgo(comment.created_at)}</span>
        </p>
        <p className="mt-1 whitespace-pre-line text-[14.5px] leading-relaxed text-ink/90">
          {comment.body}
        </p>
        <div className="mt-1.5 flex items-center gap-1 text-ink-muted">
          <VotePill
            score={comment.score}
            mine={comment.my_vote}
            label="Vote on this comment"
            send={(value) => api.ideas.voteComment(slug, ideaId, comment.id, value)}
          />
          {onReply ? (
            <button
              type="button"
              onClick={() => onReply(comment)}
              className="inline-flex h-7 items-center gap-1.5 rounded-full px-2.5 text-[12px] font-semibold outline-none transition-colors duration-200 hover:bg-white/10 hover:text-ink focus-visible:ring-2 focus-visible:ring-ring"
            >
              <CornerDownRightIcon aria-hidden="true" className="size-3.5" /> Reply
            </button>
          ) : null}
          {!comment.is_owner ? (
            <ReportMenu
              targetType="idea_comment"
              targetId={comment.id}
              what="comment"
              className="ml-auto size-8"
            />
          ) : null}
          {comment.is_owner || isModerator ? (
            <ConfirmDelete
              label="Delete"
              onConfirm={async () => {
                await api.ideas.removeComment(slug, ideaId, comment.id);
                onRemoved();
              }}
            />
          ) : null}
        </div>
      </div>
    </li>
  );
}

const IdeaIdContext = React.createContext("");
const useIdeaId = () => React.useContext(IdeaIdContext);

function Composer({
  ideaId,
  replyTo,
  onCancelReply,
  onPosted,
}: {
  ideaId: string;
  replyTo: IdeaComment | null;
  onCancelReply: () => void;
  onPosted: () => void;
}) {
  const { slug } = useCollege();
  const attempt = useAttempt();
  const [text, setText] = React.useState("");
  const [anonymous, setAnonymous] = React.useState(false);
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const inputRef = React.useRef<HTMLTextAreaElement>(null);

  React.useEffect(() => {
    if (replyTo) inputRef.current?.focus();
  }, [replyTo]);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    const body = text.trim();
    if (!body || busy) return;
    setBusy(true);
    setError(null);
    try {
      await api.ideas.comment(
        slug,
        ideaId,
        { body, parent_id: replyTo ? (replyTo.parent_id ?? replyTo.id) : null, anonymous },
        attempt.get(),
      );
      attempt.reset();
      setText("");
      onCancelReply();
      onPosted();
    } catch (caught) {
      if (!(caught instanceof ApiError && caught.isOffline)) attempt.reset();
      setError(friendlyMessage(caught, "We could not post your comment. Please try again."));
    } finally {
      setBusy(false);
    }
  }

  return (
    <form
      onSubmit={submit}
      className="glass sticky bottom-[calc(5.75rem+var(--safe-bottom))] z-20 mt-4 flex flex-col gap-2 rounded-[22px] p-2.5 md:bottom-4"
    >
      {replyTo ? (
        <div className="flex items-center justify-between rounded-xl bg-white/[0.06] px-3 py-1.5 text-[12.5px] text-ink-muted">
          <span className="truncate">
            Replying to <b className="text-ink">{replyTo.author.display_name}</b>
          </span>
          <button
            type="button"
            onClick={onCancelReply}
            aria-label="Cancel reply"
            className="inline-flex size-6 items-center justify-center rounded-full outline-none hover:bg-white/10 focus-visible:ring-2 focus-visible:ring-ring"
          >
            <XIcon aria-hidden="true" className="size-3.5" />
          </button>
        </div>
      ) : null}
      <div className="flex items-end gap-2 rounded-[22px] border border-white/10 bg-white/[0.05] p-1.5 pl-3 transition-[border-color,box-shadow] duration-200 focus-within:border-[#8f86f0]/70 focus-within:shadow-[0_0_0_3px_rgba(143,134,240,0.22)]">
        <label htmlFor="comment-body" className="sr-only">
          Add a comment
        </label>
        <textarea
          id="comment-body"
          ref={inputRef}
          value={text}
          onChange={(event) => setText(event.target.value)}
          maxLength={800}
          rows={1}
          placeholder="Add a comment"
          onKeyDown={(event) => {
            if (event.key === "Enter" && (event.metaKey || event.ctrlKey)) void submit(event);
          }}
          className="max-h-32 min-h-10 flex-1 resize-none bg-transparent px-3 py-2 text-[14.5px] outline-none placeholder:text-ink-muted/70"
        />
        <button
          type="button"
          onClick={() => setAnonymous((value) => !value)}
          aria-pressed={anonymous}
          title="Post without your name"
          className={cn(
            "mb-0.5 inline-flex h-9 shrink-0 items-center rounded-full border px-3 text-[12px] font-semibold outline-none transition-[background-color,border-color,color] duration-200 focus-visible:ring-2 focus-visible:ring-ring",
            anonymous
              ? "border-[#8f86f0]/60 bg-[#8f86f0]/20 text-ink"
              : "border-white/10 text-ink-muted hover:text-ink",
          )}
        >
          Anonymous
        </button>
        <Button
          type="submit"
          size="icon-sm"
          disabled={busy || !text.trim()}
          aria-label="Post comment"
        >
          {busy ? <Spinner /> : <SendIcon aria-hidden="true" />}
        </Button>
      </div>
      {error ? <p className="px-3 pb-1 text-[12.5px] text-danger">{error}</p> : null}
    </form>
  );
}

function Thread({ idea }: { idea: Idea }) {
  const { slug } = useCollege();
  const comments = useLoad(() => api.ideas.comments(slug, idea.id), [slug, idea.id]);
  const [replyTo, setReplyTo] = React.useState<IdeaComment | null>(null);

  const tops = comments.status === "ready" ? comments.data.filter((c) => c.parent_id === null) : [];
  const repliesOf = (id: string) =>
    comments.status === "ready" ? comments.data.filter((c) => c.parent_id === id) : [];

  return (
    <IdeaIdContext.Provider value={idea.id}>
      <section aria-labelledby="comments-title" className="flex flex-col">
        <h2 id="comments-title" className="mb-1 text-[15px] font-bold">
          {comments.status === "ready" ? comments.data.length : idea.comment_count}{" "}
          {(comments.status === "ready" ? comments.data.length : idea.comment_count) === 1
            ? "comment"
            : "comments"}
        </h2>
        {comments.status === "loading" ? (
          <div aria-busy="true" className="flex flex-col gap-4 pt-3">
            {[0, 1].map((n) => (
              <div key={n} className="flex gap-3">
                <Skeleton className="size-7 shrink-0 rounded-full" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-4 w-28" />
                  <Skeleton className="h-4 w-full" />
                </div>
              </div>
            ))}
          </div>
        ) : comments.status === "error" ? (
          <LoadError error={comments.error} onRetry={comments.reload} what="the comments" />
        ) : tops.length === 0 ? (
          <p className="border-t border-white/[0.07] py-8 text-center text-[14px] text-ink-muted">
            No comments yet. Say something.
          </p>
        ) : (
          <ul className="stagger">
            {tops.map((comment) => (
              <React.Fragment key={comment.id}>
                <CommentRow comment={comment} onReply={setReplyTo} onRemoved={comments.reload} />
                {repliesOf(comment.id).map((reply) => (
                  <CommentRow
                    key={reply.id}
                    comment={reply}
                    nested
                    onReply={setReplyTo}
                    onRemoved={comments.reload}
                  />
                ))}
              </React.Fragment>
            ))}
          </ul>
        )}
        <Composer
          ideaId={idea.id}
          replyTo={replyTo}
          onCancelReply={() => setReplyTo(null)}
          onPosted={comments.reload}
        />
      </section>
    </IdeaIdContext.Provider>
  );
}

export function IdeaDetailScreen({ ideaId }: { ideaId: string }) {
  const { slug, isModerator } = useCollege();
  const router = useRouter();
  const state = useLoad(
    () => api.ideas.one(slug, ideaId),
    [slug, ideaId],
    `idea:${slug}:${ideaId}`,
  );
  const [error, setError] = React.useState<string | null>(null);
  const [removing, setRemoving] = React.useState(false);

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-5 px-5 pt-4 pb-2 md:px-8 md:py-8">
      <PageHeader
        title="Buzz"
        back={{ href: `/c/${slug}/ideas`, label: "Buzz" }}
        menu={
          state.status === "ready" && !state.data.is_owner ? (
            <ReportMenu targetType="idea" targetId={ideaId} what="buzz" />
          ) : undefined
        }
      />
      {state.status === "loading" ? (
        <div aria-busy="true" className="flex flex-col gap-3">
          <Skeleton className="h-8 w-3/4" />
          <Skeleton className="h-24 w-full" />
        </div>
      ) : state.status === "error" ? (
        state.error instanceof ApiError && state.error.status === 404 ? (
          <div className="rounded-card border border-white/10 bg-white/[0.03] p-8">
            <p className="text-lg font-bold">This buzz is not available.</p>
            <p className="mt-1 text-ink-muted">
              It may have been removed, or it belongs to another space.
            </p>
          </div>
        ) : (
          <LoadError error={state.error} onRetry={state.reload} what="this buzz" />
        )
      ) : (
        <>
          <IdeaCard idea={state.data} full />
          {isModerator && !state.data.is_owner ? (
            <div className="-mt-2 flex justify-end">
              <Button variant="outline" onClick={() => setRemoving(true)}>
                Remove this buzz
              </Button>
              <RemoveDialog
                slug={slug}
                kind="thought"
                id={ideaId}
                open={removing}
                onOpenChange={setRemoving}
                onRemoved={() => router.push(`/c/${slug}/ideas`)}
              />
            </div>
          ) : null}
          {state.data.is_owner ? (
            <div className="-mt-2 flex justify-end">
              <ConfirmDelete
                label="Delete buzz"
                onConfirm={async () => {
                  try {
                    await api.ideas.remove(slug, ideaId);
                    router.push(`/c/${slug}/ideas`);
                  } catch (caught) {
                    setError(friendlyMessage(caught, "We could not delete the buzz."));
                  }
                }}
              />
            </div>
          ) : null}
          {error ? (
            <Banner variant="error">
              <p>{error}</p>
            </Banner>
          ) : null}
          <Thread idea={state.data} />
        </>
      )}
    </div>
  );
}
