"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import {
  CheckIcon,
  FlameIcon,
  LockIcon,
  SendIcon,
  Trash2Icon,
  TrophyIcon,
  UserPlusIcon,
} from "lucide-react";
import { cn } from "cn";
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
import { Avatar } from "@/components/app/avatar";
import { PersonLink } from "@/components/app/person-link";
import { LoadError } from "@/components/app/load-error";
import { OverflowMenu } from "@/components/app/overflow-menu";
import { PageHeader } from "@/components/app/page-header";
import { Spinner } from "@/components/app/spinner";
import { ReportMenu } from "@/features/admin-console/report-menu";
import { ApiError, friendlyMessage } from "@/lib/api-client";
import { api, type Debate, type DebateArgument } from "@/lib/api/endpoints";
import { timeAgo } from "@/lib/time-ago";
import { useAttempt } from "@/lib/use-attempt";
import { useLoad } from "@/lib/use-load";
import { useCollege } from "@/features/college";
import { InvitePicker, type Picked } from "./invite-picker";
import { DEBATE_TOPIC_LABEL, SidesBar, leader, resultLine, timeLeft, useNow } from "./debate-parts";

const SIDE_TINT = ["bg-[#8f86f0]/20 text-[#d6d1fb]", "bg-[#e0866a]/20 text-[#f6c7b6]"] as const;

function ArgumentRow({
  argument,
  debate,
  live,
  onChange,
}: {
  argument: DebateArgument;
  debate: Debate;
  live: boolean;
  onChange: () => void;
}) {
  const { slug, isModerator } = useCollege();
  const [busy, setBusy] = React.useState(false);
  const [asking, setAsking] = React.useState(false);
  const sideName = argument.side === 0 ? debate.side_a : debate.side_b;

  async function strong() {
    if (busy || argument.is_owner || !live) return;
    setBusy(true);
    try {
      await api.debates.strongPoint(slug, debate.id, argument.id, argument.i_upvoted ? 0 : 1);
      onChange();
    } catch {
      // The count simply stays.
    } finally {
      setBusy(false);
    }
  }

  async function remove() {
    setBusy(true);
    try {
      await api.debates.removeArgument(slug, debate.id, argument.id);
      onChange();
    } finally {
      setBusy(false);
      setAsking(false);
    }
  }

  return (
    <li className="glass-card flex gap-3 rounded-[20px] p-3.5">
      <PersonLink
        slug={slug}
        userId={argument.author.user_id}
        plain
        className="mt-0.5 h-fit rounded-full"
      >
        <Avatar name={argument.author.display_name} size="xs" />
      </PersonLink>
      <div className="min-w-0 flex-1">
        <p className="flex flex-wrap items-center gap-x-2 gap-y-1 text-[13px]">
          <PersonLink slug={slug} userId={argument.author.user_id} className="font-semibold">
            {argument.author.display_name}
          </PersonLink>
          <span
            className={cn(
              "rounded-full px-2 py-0.5 text-[11px] font-bold",
              SIDE_TINT[argument.side],
            )}
          >
            {sideName}
          </span>
          {argument.by_debate_author ? (
            <span className="rounded-full bg-white/[0.08] px-2 py-0.5 text-[10.5px] font-bold uppercase tracking-wide text-ink-muted">
              Started it
            </span>
          ) : null}
          <span className="text-ink-muted">{timeAgo(argument.created_at)}</span>
        </p>
        <p className="mt-1.5 whitespace-pre-line break-words text-[14.5px] leading-relaxed">
          {argument.body}
        </p>
        <div className="mt-2 flex items-center gap-1.5">
          <button
            type="button"
            onClick={() => void strong()}
            disabled={argument.is_owner || !live}
            aria-pressed={argument.i_upvoted}
            aria-label={`Strong point, ${argument.score} so far`}
            className={cn(
              "inline-flex h-8 items-center gap-1.5 rounded-full border px-3 text-[12.5px] font-semibold outline-none transition-[background-color,border-color,color,transform] duration-200 focus-visible:ring-2 focus-visible:ring-ring active:scale-95 disabled:opacity-70",
              argument.i_upvoted
                ? "bg-brand border-transparent text-white"
                : "border-white/10 bg-white/[0.04] text-ink-muted hover:border-white/25 hover:text-ink",
            )}
          >
            <FlameIcon aria-hidden="true" className="size-3.5" />
            Strong point <span className="tabular">{argument.score}</span>
          </button>
          {!argument.is_owner ? (
            <ReportMenu
              targetType="debate_argument"
              targetId={argument.id}
              what="argument"
              className="ml-auto size-8"
            />
          ) : null}
          {argument.is_owner || isModerator ? (
            asking ? (
              <span className="ml-auto inline-flex items-center gap-1.5 text-[12.5px]">
                <span className="text-ink-muted">Remove it?</span>
                <button
                  type="button"
                  onClick={() => void remove()}
                  disabled={busy}
                  className="inline-flex h-8 items-center rounded-full bg-danger/15 px-3 font-semibold text-danger outline-none hover:bg-danger/25 focus-visible:ring-2 focus-visible:ring-ring"
                >
                  {busy ? <Spinner /> : "Remove"}
                </button>
                <button
                  type="button"
                  onClick={() => setAsking(false)}
                  className="inline-flex h-8 items-center rounded-full px-2.5 font-semibold text-ink-muted outline-none hover:bg-white/10 focus-visible:ring-2 focus-visible:ring-ring"
                >
                  Keep
                </button>
              </span>
            ) : (
              <button
                type="button"
                onClick={() => setAsking(true)}
                aria-label="Remove this argument"
                className="ml-auto inline-flex size-8 items-center justify-center rounded-full text-ink-muted outline-none transition-colors hover:bg-white/10 hover:text-danger focus-visible:ring-2 focus-visible:ring-ring"
              >
                <Trash2Icon aria-hidden="true" className="size-4" />
              </button>
            )
          ) : null}
        </div>
      </div>
    </li>
  );
}

/** One debate: the two sides, how people are split, and the arguments. It takes sides and arguments only while it is live. */
export function DebateDetailScreen({ debateId }: { debateId: string }) {
  const { slug, isModerator } = useCollege();
  const router = useRouter();
  const attempt = useAttempt();
  const state = useLoad(() => api.debates.one(slug, debateId), [slug, debateId]);
  const list = useLoad(() => api.debates.arguments(slug, debateId), [slug, debateId]);
  const now = useNow();
  const [filter, setFilter] = React.useState<0 | 1 | null>(null);
  const [text, setText] = React.useState("");
  const [anonymous, setAnonymous] = React.useState(false);
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [asking, setAsking] = React.useState(false);

  const { reload: reloadDebate } = state;
  const { reload: reloadList } = list;
  // New arguments and a changing split appear without leaving the page, while it is live.
  const live =
    state.status === "ready" && !state.data.ended && new Date(state.data.ends_at).getTime() > now;
  React.useEffect(() => {
    if (!live) return;
    const timer = window.setInterval(() => {
      if (document.visibilityState === "visible") {
        reloadDebate();
        reloadList();
      }
    }, 15_000);
    return () => window.clearInterval(timer);
  }, [live, reloadDebate, reloadList]);

  async function pick(side: 0 | 1) {
    if (busy || !live) return;
    setBusy(true);
    setError(null);
    try {
      await api.debates.pickSide(slug, debateId, side);
      reloadDebate();
    } catch (caught) {
      setError(friendlyMessage(caught, "We could not save your side. Please try again."));
    } finally {
      setBusy(false);
    }
  }

  async function post(event: React.FormEvent) {
    event.preventDefault();
    const body = text.trim();
    if (!body || busy) return;
    setBusy(true);
    setError(null);
    try {
      await api.debates.argue(slug, debateId, { body, anonymous }, attempt.get());
      attempt.reset();
      setText("");
      reloadList();
      reloadDebate();
    } catch (caught) {
      if (!(caught instanceof ApiError && caught.isOffline)) attempt.reset();
      setError(
        caught instanceof ApiError && caught.code === "CONFLICT"
          ? "This debate has just closed."
          : caught instanceof ApiError && caught.code === "RATE_LIMITED"
            ? "Slow down a little. Try again in a few minutes."
            : friendlyMessage(caught, "We could not post that. Please try again."),
      );
    } finally {
      setBusy(false);
    }
  }

  async function removeDebate() {
    setBusy(true);
    try {
      await api.debates.remove(slug, debateId);
      router.replace(`/c/${slug}/debates`);
    } catch (caught) {
      setError(friendlyMessage(caught, "We could not remove it. Please try again."));
      setBusy(false);
      setAsking(false);
    }
  }

  if (state.status === "loading")
    return (
      <div
        aria-busy="true"
        className="mx-auto flex w-full max-w-2xl flex-col gap-4 px-4 pt-2 md:px-8 md:py-8"
      >
        <Skeleton className="h-8 w-40" />
        <Skeleton className="h-28 w-full rounded-[22px]" />
        <Skeleton className="h-20 w-full rounded-[22px]" />
      </div>
    );
  if (state.status === "error")
    return (
      <div className="mx-auto w-full max-w-2xl px-4 pt-2 md:px-8 md:py-8">
        {state.error instanceof ApiError && state.error.status === 404 ? (
          <div className="glass-card rounded-[22px] p-8">
            <p className="text-lg font-bold">This debate is not available.</p>
            <p className="mt-1 text-ink-muted">It may have been removed.</p>
          </div>
        ) : (
          <LoadError error={state.error} onRetry={state.reload} what="this debate" />
        )}
      </div>
    );

  const debate = state.data;
  const args = list.status === "ready" ? list.data : [];
  const shown = filter === null ? args : args.filter((item) => item.side === filter);
  const lead = leader(debate);
  const sideName = (side: number | null) =>
    side === null ? "" : side === 0 ? debate.side_a : debate.side_b;
  const menu = (
    <div className="flex items-center gap-1">
      {!debate.is_owner ? (
        <ReportMenu targetType="debate" targetId={debate.id} what="debate" />
      ) : null}
      {debate.is_owner || isModerator ? (
        <OverflowMenu
          label="Debate options"
          items={[
            {
              label: "Remove this debate",
              icon: <Trash2Icon aria-hidden="true" />,
              danger: true,
              onSelect: () => setAsking(true),
            },
          ]}
        />
      ) : null}
    </div>
  );

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-4 px-4 pt-2 pb-2 md:px-8 md:py-8">
      <PageHeader
        title="Debate"
        back={{ href: `/c/${slug}/debates`, label: "Debates" }}
        menu={menu}
      />

      {debate.visibility === "invite" && debate.is_owner && live ? (
        <InviteMore slug={slug} debateId={debate.id} count={debate.invited_count ?? 0} />
      ) : null}

      {asking ? (
        <Banner variant="error">
          <p className="flex flex-wrap items-center gap-3">
            Remove this debate for everyone?
            <Button
              size="sm"
              variant="destructive"
              disabled={busy}
              onClick={() => void removeDebate()}
            >
              {busy ? <Spinner /> : null} Remove
            </Button>
            <Button size="sm" variant="ghost" onClick={() => setAsking(false)}>
              Keep it
            </Button>
          </p>
        </Banner>
      ) : null}

      <section className="glass-card relative overflow-hidden rounded-[26px] p-5">
        <span
          aria-hidden="true"
          className="bg-brand pointer-events-none absolute -right-10 -top-12 size-36 rounded-full opacity-25 blur-3xl"
        />
        <p className="relative flex items-center justify-between gap-3 text-[11.5px] font-bold uppercase tracking-[0.1em] text-ink-muted">
          <span className="inline-flex items-center gap-2">
            {DEBATE_TOPIC_LABEL[debate.topic]}
            {debate.visibility === "invite" ? (
              <span className="inline-flex items-center gap-1 rounded-full bg-white/10 px-2 py-0.5 text-[10.5px] text-ink">
                <LockIcon aria-hidden="true" className="size-3" /> Private
              </span>
            ) : null}
          </span>
          <span className={cn("normal-case tracking-normal", live ? "text-[#f0a58c]" : "")}>
            {live ? timeLeft(debate.ends_at, now) : "Closed"}
          </span>
        </p>
        <h1 className="relative mt-2 text-balance font-heading text-[1.5rem] font-extrabold leading-tight tracking-tight">
          {debate.title}
        </h1>
        {debate.body ? (
          <p className="relative mt-2 whitespace-pre-line text-[14.5px] leading-relaxed text-ink-muted">
            {debate.body}
          </p>
        ) : null}
        <p className="relative mt-2 text-[12.5px] text-ink-muted">
          Started by{" "}
          <PersonLink slug={slug} userId={debate.author.user_id} className="font-medium text-ink">
            {debate.author.display_name}
          </PersonLink>
        </p>

        {!live ? (
          <div className="relative mt-4 flex items-start gap-3 rounded-2xl border border-white/10 bg-white/[0.05] p-3.5">
            <TrophyIcon aria-hidden="true" className="mt-0.5 size-5 shrink-0 text-[#f0c36a]" />
            <div>
              <p className="text-[14.5px] font-bold">{resultLine(debate)}</p>
              <p className="text-[12.5px] text-ink-muted">
                This debate is closed. You can still read every argument.
              </p>
            </div>
          </div>
        ) : null}

        <div
          role="radiogroup"
          aria-label="Choose your side"
          className="relative mt-4 grid grid-cols-2 gap-2.5"
        >
          {([0, 1] as const).map((side) => {
            const mine = debate.my_side === side;
            const count = side === 0 ? debate.a_count : debate.b_count;
            return (
              <button
                key={side}
                type="button"
                role="radio"
                aria-checked={mine}
                disabled={!live || busy}
                onClick={() => void pick(side)}
                className={cn(
                  "flex min-h-[4.5rem] flex-col items-start justify-between gap-1 rounded-[18px] border p-3 text-left outline-none transition-[border-color,background-color,transform] duration-200 focus-visible:ring-2 focus-visible:ring-ring active:scale-[0.98] disabled:cursor-default",
                  mine
                    ? side === 0
                      ? "border-[#8f86f0]/70 bg-[#8f86f0]/20"
                      : "border-[#e0866a]/70 bg-[#e0866a]/20"
                    : "border-white/10 bg-white/[0.04] hover:border-white/25",
                  !live && lead === side && "border-[#f0c36a]/60",
                )}
              >
                <span className="flex w-full items-center justify-between gap-2 text-[15px] font-bold leading-tight">
                  <span className="truncate">{side === 0 ? debate.side_a : debate.side_b}</span>
                  {mine ? <CheckIcon aria-hidden="true" className="size-4 shrink-0" /> : null}
                </span>
                <span className="tabular text-[12.5px] text-ink-muted">
                  {count} {count === 1 ? "person" : "people"}
                </span>
              </button>
            );
          })}
        </div>
        <SidesBar debate={debate} className="relative mt-4" />
        {live && debate.my_side === null ? (
          <p className="relative mt-3 text-[13px] text-ink-muted">
            Pick a side to join. You can change it until the time is up.
          </p>
        ) : null}
      </section>

      <section aria-labelledby="arguments" className="flex flex-col gap-3">
        <div className="flex items-center justify-between gap-3">
          <h2 id="arguments" className="text-[15px] font-bold">
            {debate.argument_count} {debate.argument_count === 1 ? "argument" : "arguments"}
          </h2>
          <div
            role="group"
            aria-label="Show"
            className="inline-flex rounded-full border border-white/10 bg-white/[0.04] p-0.5"
          >
            {(
              [
                [null, "All"],
                [0, debate.side_a],
                [1, debate.side_b],
              ] as const
            ).map(([value, label]) => (
              <button
                key={String(value)}
                type="button"
                aria-pressed={filter === value}
                onClick={() => setFilter(value)}
                className={cn(
                  "h-7 max-w-[7rem] truncate rounded-full px-3 text-[12px] font-semibold outline-none transition-colors duration-200 focus-visible:ring-2 focus-visible:ring-ring",
                  filter === value ? "bg-white/[0.16] text-ink" : "text-ink-muted hover:text-ink",
                )}
              >
                {label}
              </button>
            ))}
          </div>
        </div>
        {list.status === "loading" ? (
          <div aria-busy="true" className="flex flex-col gap-3">
            <Skeleton className="h-24 w-full rounded-[20px]" />
            <Skeleton className="h-24 w-full rounded-[20px]" />
          </div>
        ) : list.status === "error" ? (
          <LoadError error={list.error} onRetry={list.reload} what="the arguments" />
        ) : shown.length === 0 ? (
          <p className="glass-card rounded-[20px] p-5 text-center text-[14px] text-ink-muted">
            {live
              ? "No arguments here yet. Be the first to make a point."
              : "Nobody made an argument."}
          </p>
        ) : (
          <ul className="stagger flex flex-col gap-2.5">
            {shown.map((item) => (
              <ArgumentRow
                key={item.id}
                argument={item}
                debate={debate}
                live={live}
                onChange={() => {
                  reloadList();
                  reloadDebate();
                }}
              />
            ))}
          </ul>
        )}
      </section>

      {error ? (
        <Banner variant="error">
          <p>{error}</p>
        </Banner>
      ) : null}

      {live && debate.my_side !== null ? (
        <form
          onSubmit={post}
          className="glass sticky bottom-[calc(5.75rem+var(--safe-bottom))] z-20 flex flex-col gap-2 rounded-[22px] p-2.5 md:bottom-4"
        >
          <div className="flex items-end gap-2 rounded-[18px] border border-white/10 bg-white/[0.05] p-1.5 pl-3 transition-[border-color,box-shadow] duration-200 focus-within:border-[#8f86f0]/70 focus-within:shadow-[0_0_0_3px_rgba(143,134,240,0.22)]">
            <label htmlFor="argument-body" className="sr-only">
              Your argument
            </label>
            <textarea
              id="argument-body"
              value={text}
              onChange={(event) => setText(event.target.value)}
              maxLength={600}
              rows={1}
              placeholder={`Make your point for ${sideName(debate.my_side)}`}
              className="max-h-32 min-h-10 flex-1 resize-none bg-transparent px-1 py-2 text-[16px] outline-none placeholder:text-ink-muted/70 md:text-[14.5px]"
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
              className="size-10 rounded-full"
              disabled={busy || !text.trim()}
              aria-label="Post argument"
            >
              {busy ? <Spinner /> : <SendIcon aria-hidden="true" />}
            </Button>
          </div>
          <p className="px-2 text-[11.5px] text-ink-muted">
            Argue the idea, not the person. Hate and abuse are removed.
          </p>
        </form>
      ) : live ? (
        <p className="glass-card rounded-[20px] p-4 text-center text-[14px] text-ink-muted">
          Pick a side above to join the debate and post your argument.
        </p>
      ) : null}
    </div>
  );
}

/** The author of a private debate adds more people while it is still live. */
function InviteMore({ slug, debateId, count }: { slug: string; debateId: string; count: number }) {
  const [open, setOpen] = React.useState(false);
  const [picked, setPicked] = React.useState<Picked[]>([]);
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [done, setDone] = React.useState(false);

  async function save() {
    if (busy || picked.length === 0) return;
    setBusy(true);
    setError(null);
    try {
      await api.debates.invite(
        slug,
        debateId,
        picked.map((p) => p.user_id),
      );
      setDone(true);
      setPicked([]);
      setOpen(false);
    } catch (caught) {
      setError(friendlyMessage(caught, "We could not invite them. Please try again."));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="glass-clear flex items-center justify-between gap-3 rounded-2xl px-4 py-2.5 text-[13px]">
      <span className="text-ink-muted">
        {done ? "Invites sent. " : ""}
        Invite only · {count} invited
      </span>
      <Button type="button" size="sm" variant="outline" onClick={() => setOpen(true)}>
        <UserPlusIcon aria-hidden="true" /> Invite more
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Invite more people</DialogTitle>
            <DialogDescription>They get a notification and can join the debate.</DialogDescription>
          </DialogHeader>
          <InvitePicker slug={slug} picked={picked} onChange={setPicked} />
          {error ? <p className="text-[13px] text-red-300">{error}</p> : null}
          <DialogFooter>
            <Button type="button" variant="ghost" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button
              type="button"
              onClick={() => void save()}
              disabled={busy || picked.length === 0}
            >
              {busy ? <Spinner /> : null} Invite
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
