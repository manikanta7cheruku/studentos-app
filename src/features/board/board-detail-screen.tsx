"use client";

import { RemoveDialog } from "@/features/admin-console/remove-dialog";
import * as React from "react";
import { useRouter } from "next/navigation";
import { LockIcon, MapPinIcon, SendIcon } from "lucide-react";
import { cn } from "cn";
import { Banner } from "@/components/ui/banner";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Avatar } from "@/components/app/avatar";
import { LoadError } from "@/components/app/load-error";
import { PageHeader } from "@/components/app/page-header";
import { Spinner } from "@/components/app/spinner";
import { ApiError, friendlyMessage } from "@/lib/api-client";
import { api, type BoardItem, type BoardMessage, type BoardName } from "@/lib/api/endpoints";
import { timeAgo } from "@/lib/time-ago";
import { useAttempt } from "@/lib/use-attempt";
import { useLoad } from "@/lib/use-load";
import { useCollege } from "@/features/college";
import { priceText } from "./board-card";
import { BOARDS, KIND_LABEL, RESOLVE_LABEL, boardPath } from "./board-config";

function Bubble({ message }: { message: BoardMessage }) {
  return (
    <li className={cn("flex", message.mine ? "justify-end" : "justify-start")}>
      <div
        className={cn(
          "max-w-[85%] rounded-2xl px-3.5 py-2 text-[14.5px] leading-relaxed",
          message.mine ? "bg-brand rounded-br-md text-white" : "rounded-bl-md bg-white/[0.08]",
        )}
      >
        <p className="whitespace-pre-line">{message.body}</p>
        <p className={cn("mt-0.5 text-[11px]", message.mine ? "text-white/70" : "text-ink-muted")}>
          {timeAgo(message.created_at)}
        </p>
      </div>
    </li>
  );
}

function MessageBox({
  postId,
  toUser,
  placeholder,
  onSent,
}: {
  postId: string;
  toUser?: string;
  placeholder: string;
  onSent: () => void;
}) {
  const { slug } = useCollege();
  const attempt = useAttempt();
  const [text, setText] = React.useState("");
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  async function submit(event: React.FormEvent) {
    event.preventDefault();
    const body = text.trim();
    if (!body || busy) return;
    setBusy(true);
    setError(null);
    try {
      await api.board.send(
        slug,
        postId,
        { body, ...(toUser ? { to_user: toUser } : {}) },
        attempt.get(),
      );
      attempt.reset();
      setText("");
      onSent();
    } catch (caught) {
      if (!(caught instanceof ApiError && caught.isOffline)) attempt.reset();
      setError(friendlyMessage(caught, "We could not send that. Please try again."));
    } finally {
      setBusy(false);
    }
  }
  return (
    <form onSubmit={submit} className="flex flex-col gap-1.5">
      <div className="flex items-end gap-2 rounded-[20px] border border-white/10 bg-white/[0.05] p-1.5 pl-3.5 focus-within:border-[#7d74e0]/60">
        <label htmlFor={`msg-${toUser ?? "author"}`} className="sr-only">
          {placeholder}
        </label>
        <textarea
          id={`msg-${toUser ?? "author"}`}
          value={text}
          onChange={(event) => setText(event.target.value)}
          maxLength={500}
          rows={1}
          placeholder={placeholder}
          className="max-h-28 min-h-10 flex-1 resize-none bg-transparent py-2 text-[14.5px] outline-none placeholder:text-ink-muted/70"
        />
        <Button type="submit" size="icon-sm" disabled={busy || !text.trim()} aria-label="Send">
          {busy ? <Spinner /> : <SendIcon aria-hidden="true" />}
        </Button>
      </div>
      {error ? <p className="px-2 text-[12.5px] text-danger">{error}</p> : null}
    </form>
  );
}

function Messages({ post }: { post: BoardItem }) {
  const { slug } = useCollege();
  const state = useLoad(() => api.board.messages(slug, post.id), [slug, post.id]);
  const closed = post.status !== "open";

  // The author's view: one thread per person.
  const threads = React.useMemo(() => {
    if (state.status !== "ready") return [];
    const map = new Map<string, { name: string; items: BoardMessage[] }>();
    for (const message of state.data) {
      const key = message.with_user.user_id;
      const entry = map.get(key) ?? { name: message.with_user.display_name, items: [] };
      entry.items.push(message);
      map.set(key, entry);
    }
    return [...map.entries()];
  }, [state]);

  return (
    <section aria-labelledby="messages-title" className="flex flex-col gap-4">
      <div>
        <h2 id="messages-title" className="text-[15px] font-bold">
          {post.is_owner ? "Messages" : `Write to ${post.author.display_name}`}
        </h2>
        <p className="mt-0.5 flex items-center gap-1.5 text-[12.5px] text-ink-muted">
          <LockIcon aria-hidden="true" className="size-3.5" />
          {post.is_owner
            ? "Each person's messages are private to you and them."
            : `Only you and ${post.author.display_name} can see this.`}
        </p>
      </div>
      {state.status === "loading" ? (
        <Skeleton className="h-20 w-full rounded-2xl" />
      ) : state.status === "error" ? (
        <LoadError error={state.error} onRetry={state.reload} what="the messages" />
      ) : post.is_owner ? (
        threads.length === 0 ? (
          <p className="rounded-2xl border border-white/10 bg-white/[0.03] p-5 text-center text-[14px] text-ink-muted">
            No messages yet. When someone writes to you, it shows here.
          </p>
        ) : (
          <div className="flex flex-col gap-5">
            {threads.map(([userId, thread]) => (
              <div
                key={userId}
                className="flex flex-col gap-3 rounded-[20px] border border-white/[0.08] bg-surface p-4"
              >
                <p className="flex items-center gap-2 text-[13.5px] font-semibold">
                  <Avatar name={thread.name} size="xs" /> {thread.name}
                </p>
                <ul className="flex flex-col gap-2">
                  {thread.items.map((message) => (
                    <Bubble key={message.id} message={message} />
                  ))}
                </ul>
                {closed ? null : (
                  <MessageBox
                    postId={post.id}
                    toUser={userId}
                    placeholder={`Reply to ${thread.name}`}
                    onSent={state.reload}
                  />
                )}
              </div>
            ))}
          </div>
        )
      ) : (
        <div className="flex flex-col gap-3">
          {state.data.length > 0 ? (
            <ul className="flex flex-col gap-2">
              {state.data.map((message) => (
                <Bubble key={message.id} message={message} />
              ))}
            </ul>
          ) : null}
          {closed ? (
            <p className="text-[13.5px] text-ink-muted">
              This post is done, so it is not taking messages.
            </p>
          ) : (
            <MessageBox
              postId={post.id}
              placeholder={state.data.length ? "Write back" : "Hi, is this still available?"}
              onSent={state.reload}
            />
          )}
        </div>
      )}
    </section>
  );
}

function Actions({
  post,
  board,
  onChanged,
}: {
  post: BoardItem;
  board: BoardName;
  onChanged: () => void;
}) {
  const { slug, isModerator } = useCollege();
  const router = useRouter();
  const [busy, setBusy] = React.useState(false);
  const [asking, setAsking] = React.useState(false);
  const [removing, setRemoving] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  async function run(action: () => Promise<unknown>, after: () => void) {
    setBusy(true);
    setError(null);
    try {
      await action();
      after();
    } catch (caught) {
      setError(friendlyMessage(caught, "That did not work. Please try again."));
    } finally {
      setBusy(false);
      setAsking(false);
    }
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center gap-2">
        {post.is_owner ? (
          post.status === "open" ? (
            <Button
              variant="secondary"
              disabled={busy}
              onClick={() =>
                void run(() => api.board.setStatus(slug, post.id, "resolved"), onChanged)
              }
            >
              {RESOLVE_LABEL[post.kind]}
            </Button>
          ) : (
            <Button
              variant="secondary"
              disabled={busy}
              onClick={() => void run(() => api.board.setStatus(slug, post.id, "open"), onChanged)}
            >
              Open it again
            </Button>
          )
        ) : null}
        {isModerator && !post.is_owner ? (
          <>
            <Button variant="outline" onClick={() => setRemoving(true)}>
              Remove this post
            </Button>
            <RemoveDialog
              slug={slug}
              kind="listing"
              id={post.id}
              open={removing}
              onOpenChange={setRemoving}
              onRemoved={() => router.push(boardPath(slug, board))}
            />
          </>
        ) : null}
        {post.is_owner ? (
          asking ? (
            <span className="inline-flex items-center gap-2 text-[13.5px]">
              <span className="text-ink-muted">Delete for good?</span>
              <Button
                variant="destructive"
                size="sm"
                disabled={busy}
                onClick={() =>
                  void run(
                    () => api.board.remove(slug, post.id),
                    () => router.push(boardPath(slug, board)),
                  )
                }
              >
                {busy ? <Spinner /> : "Delete"}
              </Button>
              <Button variant="ghost" size="sm" onClick={() => setAsking(false)}>
                Keep
              </Button>
            </span>
          ) : (
            <Button variant="ghost" onClick={() => setAsking(true)}>
              Delete
            </Button>
          )
        ) : null}
      </div>
      {error ? (
        <Banner variant="error">
          <p>{error}</p>
        </Banner>
      ) : null}
    </div>
  );
}

export function BoardDetailScreen({ board, postId }: { board: BoardName; postId: string }) {
  const { slug } = useCollege();
  const config = BOARDS[board];
  const state = useLoad(() => api.board.one(slug, postId), [slug, postId]);

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-6 px-5 py-6 md:px-8 md:py-10">
      <PageHeader
        title={config.title}
        back={{ href: boardPath(slug, board), label: config.title }}
      />
      {state.status === "loading" ? (
        <div aria-busy="true" className="flex flex-col gap-3">
          <Skeleton className="h-6 w-24 rounded-full" />
          <Skeleton className="h-9 w-3/4" />
          <Skeleton className="h-20 w-full" />
        </div>
      ) : state.status === "error" ? (
        state.error instanceof ApiError && state.error.status === 404 ? (
          <div className="rounded-card border border-white/10 bg-white/[0.03] p-8">
            <p className="text-lg font-bold">This post is not available.</p>
            <p className="mt-1 text-ink-muted">
              It may have been removed, or it belongs to another space.
            </p>
          </div>
        ) : (
          <LoadError error={state.error} onRetry={state.reload} what="this post" />
        )
      ) : (
        <>
          <article className="flex flex-col gap-3">
            <div className="flex items-center gap-2">
              <span className="bg-brand inline-flex h-6 items-center rounded-full px-2.5 text-[11.5px] font-bold text-white">
                {KIND_LABEL[state.data.kind]}
              </span>
              {state.data.status === "resolved" ? (
                <span className="text-[12.5px] font-semibold text-success">Done</span>
              ) : null}
            </div>
            <h1 className="text-balance font-heading text-[1.6rem] font-extrabold leading-tight tracking-tight">
              {state.data.title}
            </h1>
            {priceText(state.data) ? (
              <p className="font-heading text-[1.3rem] font-extrabold">{priceText(state.data)}</p>
            ) : null}
            {state.data.description ? (
              <p className="whitespace-pre-line text-[15px] leading-relaxed text-ink/90">
                {state.data.description}
              </p>
            ) : null}
            <p className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[13px] text-ink-muted">
              <span className="flex items-center gap-2">
                <Avatar name={state.data.author.display_name} size="xs" />{" "}
                {state.data.author.display_name}
              </span>
              {state.data.place ? (
                <span className="flex items-center gap-1.5">
                  <MapPinIcon aria-hidden="true" className="size-3.5" /> {state.data.place}
                </span>
              ) : null}
              <span>{timeAgo(state.data.created_at)}</span>
            </p>
          </article>
          <Actions post={state.data} board={board} onChanged={state.reload} />
          <Messages post={state.data} />
        </>
      )}
    </div>
  );
}
