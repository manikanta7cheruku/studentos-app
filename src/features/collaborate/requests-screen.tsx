"use client";

import * as React from "react";
import Link from "next/link";
import { CheckIcon, InboxIcon, SendIcon, XIcon } from "lucide-react";
import { cn } from "cn";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Avatar } from "@/components/app/avatar";
import { GlideTabs } from "@/components/app/glide-tabs";
import { LoadError } from "@/components/app/load-error";
import { PageHeader } from "@/components/app/page-header";
import { Spinner } from "@/components/app/spinner";
import { ApiError, friendlyMessage } from "@/lib/api-client";
import { api, type JoinRequestItem, type MyJoinRequest } from "@/lib/api/endpoints";
import { timeAgo } from "@/lib/time-ago";
import { useLoad } from "@/lib/use-load";
import { useCollege } from "@/features/college";
import { KIND_LABEL } from "./labels";

// The status of a request I sent, in plain words, with a colour so the list can be scanned.
const STATUS: Record<string, { words: string; chip: string }> = {
  pending: { words: "Waiting for the author", chip: "bg-[#f0c36a]/15 text-[#f0c36a]" },
  accepted: { words: "Accepted. You are on the team", chip: "bg-[#2fb98a]/15 text-[#5fd6ad]" },
  declined: { words: "The author said no this time", chip: "bg-white/10 text-ink-muted" },
  withdrawn: { words: "You withdrew it", chip: "bg-white/10 text-ink-muted" },
  cancelled: { words: "Cancelled: the post closed or filled", chip: "bg-white/10 text-ink-muted" },
};
const SHORT: Record<string, string> = {
  pending: "Waiting",
  accepted: "Accepted",
  declined: "Declined",
  withdrawn: "Withdrawn",
  cancelled: "Cancelled",
};

type Incoming = { post: { id: string; title: string }; request: JoinRequestItem };

/** One person asking to join one of my posts. Accept or decline right here: the card goes away at once and comes back on failure. */
function IncomingCard({
  item,
  onDecide,
}: {
  item: Incoming;
  onDecide: (
    item: Incoming,
    decision: "accepted" | "declined",
    note?: string,
  ) => Promise<string | null>;
}) {
  const { slug } = useCollege();
  const [busy, setBusy] = React.useState<"accepted" | "declined" | null>(null);
  const [error, setError] = React.useState<string | null>(null);
  const [declining, setDeclining] = React.useState(false);
  const [note, setNote] = React.useState("");
  const { request, post } = item;

  async function decide(decision: "accepted" | "declined") {
    if (busy) return;
    setBusy(decision);
    setError(null);
    const failure = await onDecide(
      item,
      decision,
      decision === "declined" ? note.trim() || undefined : undefined,
    );
    if (failure) {
      setError(failure);
      setBusy(null);
    }
  }

  return (
    <li
      className={cn(
        "glass-card flex flex-col gap-3 rounded-[20px] p-4 transition-[opacity,transform] duration-300",
        busy && "scale-[0.99] opacity-60",
      )}
    >
      <div className="flex items-start gap-3">
        <Link href={`/c/${slug}/people/${request.applicant.user_id}`} className="shrink-0">
          <Avatar name={request.applicant.display_name} size="md" />
        </Link>
        <div className="min-w-0 flex-1">
          <p className="text-[15px] font-bold leading-tight">
            <Link
              href={`/c/${slug}/people/${request.applicant.user_id}`}
              className="hover:underline"
            >
              {request.applicant.display_name}
            </Link>{" "}
            <span className="font-normal text-ink-muted">wants to be {request.role_name}</span>
          </p>
          {request.applicant.headline ? (
            <p className="truncate text-[13px] text-ink-muted">{request.applicant.headline}</p>
          ) : null}
          <p className="mt-0.5 truncate text-[12px] text-ink-muted/80">
            For{" "}
            <Link
              href={`/c/${slug}/collaborate/${post.id}`}
              className="font-semibold hover:underline"
            >
              {post.title}
            </Link>{" "}
            · {timeAgo(request.created_at)}
          </p>
        </div>
      </div>
      {request.applicant.skills.length ? (
        <p className="flex flex-wrap gap-1.5">
          {request.applicant.skills.slice(0, 6).map((skill) => (
            <span
              key={skill}
              className="rounded-full bg-white/[0.07] px-2.5 py-0.5 text-[11.5px] font-medium text-ink-muted"
            >
              {skill}
            </span>
          ))}
        </p>
      ) : null}
      {request.message ? (
        <blockquote className="rounded-2xl bg-white/[0.05] px-3.5 py-2.5 text-[14px] leading-relaxed text-ink/90">
          {request.message}
        </blockquote>
      ) : null}
      {error ? <p className="text-[13px] text-danger">{error}</p> : null}
      {declining ? (
        <div className="flex flex-col gap-2">
          <label
            htmlFor={`note-${request.id}`}
            className="text-[12.5px] font-semibold text-ink-muted"
          >
            A note for them (optional)
          </label>
          <textarea
            id={`note-${request.id}`}
            value={note}
            onChange={(event) => setNote(event.target.value)}
            maxLength={500}
            rows={3}
            placeholder="They will see this."
            className="glass-clear w-full resize-none rounded-2xl p-3 text-[16px] outline-none focus-visible:ring-2 focus-visible:ring-ring md:text-[14px]"
          />
          <div className="flex gap-2">
            <Button
              type="button"
              variant="destructive"
              className="flex-1"
              onClick={() => void decide("declined")}
              disabled={busy !== null}
            >
              {busy === "declined" ? <Spinner /> : <XIcon aria-hidden="true" />} Send decline
            </Button>
            <Button
              type="button"
              variant="ghost"
              onClick={() => setDeclining(false)}
              disabled={busy !== null}
            >
              Back
            </Button>
          </div>
        </div>
      ) : (
        <div className="flex gap-2">
          <Button
            type="button"
            className="flex-1"
            onClick={() => void decide("accepted")}
            disabled={busy !== null}
          >
            {busy === "accepted" ? <Spinner /> : <CheckIcon aria-hidden="true" />} Accept
          </Button>
          <Button
            type="button"
            variant="outline"
            className="flex-1"
            onClick={() => setDeclining(true)}
            disabled={busy !== null}
          >
            <XIcon aria-hidden="true" /> Decline
          </Button>
        </div>
      )}
    </li>
  );
}

/** A request I sent: a coloured status, the author's note, and Withdraw (asks first). */
function SentCard({ item, onChanged }: { item: MyJoinRequest; onChanged: () => void }) {
  const { slug } = useCollege();
  const [busy, setBusy] = React.useState(false);
  const [asking, setAsking] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const live = item.status === "pending" || item.status === "accepted";
  const status = STATUS[item.status] ?? { words: item.status, chip: "bg-white/10 text-ink-muted" };

  async function withdraw() {
    setBusy(true);
    setError(null);
    try {
      await api.teamPosts.withdraw(slug, item.id);
      onChanged();
    } catch (caught) {
      setError(friendlyMessage(caught, "We could not withdraw the request."));
      setBusy(false);
      setAsking(false);
    }
  }

  return (
    <li className={cn("glass-card flex flex-col gap-2 rounded-[20px] p-4", !live && "opacity-75")}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[11.5px] font-bold uppercase tracking-[0.08em] text-ink-muted">
            {KIND_LABEL[item.post.kind]} · {item.role.role_name}
          </p>
          <h3 className="text-[15.5px] font-bold leading-snug">
            <Link href={`/c/${slug}/collaborate/${item.post.id}`} className="hover:underline">
              {item.post.title}
            </Link>
          </h3>
        </div>
        <span
          className={cn("shrink-0 rounded-full px-2.5 py-1 text-[11.5px] font-bold", status.chip)}
        >
          {SHORT[item.status] ?? item.status}
        </span>
      </div>
      <p className="text-[13px] text-ink-muted">{status.words}</p>
      {item.decision_note ? (
        <p className="rounded-2xl bg-white/[0.05] px-3 py-2 text-[13.5px]">
          <span className="text-ink-muted">Note from the author: </span>
          {item.decision_note}
        </p>
      ) : null}
      {error ? <p className="text-[13px] text-danger">{error}</p> : null}
      {live ? (
        asking ? (
          <div className="flex flex-wrap items-center gap-2 text-[13px]">
            <span className="text-ink-muted">
              {item.status === "accepted" ? "Leave this team?" : "Withdraw this request?"}
            </span>
            <Button
              type="button"
              size="sm"
              variant="destructive"
              onClick={() => void withdraw()}
              disabled={busy}
            >
              {busy ? <Spinner /> : null} {item.status === "accepted" ? "Leave" : "Withdraw"}
            </Button>
            <Button type="button" size="sm" variant="ghost" onClick={() => setAsking(false)}>
              Keep it
            </Button>
          </div>
        ) : (
          <div>
            <Button type="button" size="sm" variant="outline" onClick={() => setAsking(true)}>
              {item.status === "accepted" ? "Leave the team" : "Withdraw"}
            </Button>
          </div>
        )
      ) : null}
    </li>
  );
}

/** Team requests: the people who asked to join my posts (answer them here), and the requests I sent. */
export function RequestsScreen() {
  const { slug } = useCollege();
  const [tab, setTab] = React.useState<"answer" | "sent">("answer");
  const [gone, setGone] = React.useState<Set<string>>(() => new Set());
  const [note, setNote] = React.useState<string | null>(null);

  // Every pending request on my open posts, fetched side by side (no waiting one post after another).
  const received = useLoad(async (): Promise<Incoming[]> => {
    const mine = await api.teamPosts.list(slug, { mine: true, status: "open", limit: 20 });
    const lists = await Promise.all(
      mine.data.map(async (post) => {
        const rows = await api.teamPosts.requests(slug, post.id, "pending");
        return rows.map((request) => ({ post: { id: post.id, title: post.title }, request }));
      }),
    );
    return lists.flat().sort((a, b) => b.request.created_at.localeCompare(a.request.created_at));
  }, [slug]);
  const sent = useLoad(() => api.teamPosts.myRequests(slug), [slug]);

  // New requests and answers show up on their own.
  const { reload: reloadReceived } = received;
  const { reload: reloadSent } = sent;
  React.useEffect(() => {
    const timer = window.setInterval(() => {
      if (document.visibilityState === "visible") {
        reloadReceived();
        reloadSent();
      }
    }, 15_000);
    return () => window.clearInterval(timer);
  }, [reloadReceived, reloadSent]);

  async function decide(
    item: Incoming,
    decision: "accepted" | "declined",
    note?: string,
  ): Promise<string | null> {
    try {
      await api.teamPosts.decide(slug, item.request.id, decision, note);
      setGone((old) => new Set(old).add(item.request.id));
      setNote(
        decision === "accepted"
          ? `${item.request.applicant.display_name} is on the team as ${item.request.role_name}.`
          : `You declined ${item.request.applicant.display_name}.`,
      );
      reloadReceived();
      return null;
    } catch (caught) {
      return caught instanceof ApiError && caught.code === "SLOTS_FULL"
        ? "That role is already full."
        : caught instanceof ApiError && caught.code === "CONFLICT"
          ? "This request was already decided or withdrawn."
          : friendlyMessage(caught, "We could not save your answer. Please try again.");
    }
  }

  const incoming =
    received.status === "ready" ? received.data.filter((i) => !gone.has(i.request.id)) : [];
  const mine = sent.status === "ready" ? sent.data : [];
  const sentOpen = mine.filter((r) => r.status === "pending" || r.status === "accepted").length;

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-4 px-4 pt-2 pb-2 md:px-8 md:py-8">
      <PageHeader title="Team requests" back={{ href: `/c/${slug}/collaborate`, label: "Plans" }} />
      <GlideTabs
        label="Team requests"
        value={tab}
        onChange={setTab}
        tabs={[
          {
            value: "answer",
            label: incoming.length ? `To answer (${incoming.length})` : "To answer",
          },
          { value: "sent", label: sentOpen ? `Sent (${sentOpen})` : "Sent" },
        ]}
      />
      {note ? (
        <p role="status" className="glass-clear rounded-2xl px-4 py-2.5 text-[13.5px]">
          {note}
        </p>
      ) : null}

      {tab === "answer" ? (
        received.status === "loading" ? (
          <div aria-busy="true" className="flex flex-col gap-3">
            <Skeleton className="h-40 w-full rounded-[20px]" />
            <Skeleton className="h-40 w-full rounded-[20px]" />
          </div>
        ) : received.status === "error" ? (
          <LoadError error={received.error} onRetry={received.reload} what="your posts" />
        ) : incoming.length === 0 ? (
          <div className="glass-card flex flex-col items-center gap-3 rounded-[24px] px-6 py-12 text-center">
            <span className="bg-brand inline-flex size-12 items-center justify-center rounded-2xl text-white">
              <InboxIcon aria-hidden="true" className="size-6" />
            </span>
            <p className="text-lg font-bold">Nothing to answer</p>
            <p className="max-w-[34ch] text-[14px] text-ink-muted">
              When someone asks to join one of your open posts, it shows up here and in your
              notifications.
            </p>
            <Button asChild className="mt-1">
              <Link href={`/c/${slug}/collaborate/new`}>Make a plan</Link>
            </Button>
          </div>
        ) : (
          <ul className="stagger flex flex-col gap-3">
            {incoming.map((item) => (
              <IncomingCard key={item.request.id} item={item} onDecide={decide} />
            ))}
          </ul>
        )
      ) : sent.status === "loading" ? (
        <div aria-busy="true" className="flex flex-col gap-3">
          <Skeleton className="h-28 w-full rounded-[20px]" />
          <Skeleton className="h-28 w-full rounded-[20px]" />
        </div>
      ) : sent.status === "error" ? (
        <LoadError error={sent.error} onRetry={sent.reload} what="your requests" />
      ) : mine.length === 0 ? (
        <div className="glass-card flex flex-col items-center gap-3 rounded-[24px] px-6 py-12 text-center">
          <span className="bg-brand inline-flex size-12 items-center justify-center rounded-2xl text-white">
            <SendIcon aria-hidden="true" className="size-6" />
          </span>
          <p className="text-lg font-bold">You have not asked to join anything</p>
          <p className="max-w-[34ch] text-[14px] text-ink-muted">
            Find a plan or a team that needs someone like you.
          </p>
          <Button asChild className="mt-1">
            <Link href={`/c/${slug}/collaborate`}>Look at open posts</Link>
          </Button>
        </div>
      ) : (
        <ul className="stagger flex flex-col gap-3">
          {[...mine]
            .sort(
              (a, b) =>
                Number(b.status === "pending" || b.status === "accepted") -
                Number(a.status === "pending" || a.status === "accepted"),
            )
            .map((item) => (
              <SentCard key={item.id} item={item} onChanged={sent.reload} />
            ))}
        </ul>
      )}
    </div>
  );
}
