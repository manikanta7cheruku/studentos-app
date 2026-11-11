"use client";

import * as React from "react";
import Link from "next/link";
import { Banner } from "@/components/ui/banner";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { LoadError } from "@/components/app/load-error";
import { PageHeader } from "@/components/app/page-header";
import { Spinner } from "@/components/app/spinner";
import { friendlyMessage } from "@/lib/api-client";
import { api, type MyJoinRequest } from "@/lib/api/endpoints";
import { useLoad } from "@/lib/use-load";
import { useCollege } from "@/features/college";
import { KIND_LABEL } from "./labels";

const STATUS_WORDS: Record<string, string> = {
  pending: "Waiting for the author",
  accepted: "Accepted. You are on the team",
  declined: "The author said no this time",
  withdrawn: "You withdrew it",
  cancelled: "Cancelled because the post closed or filled",
};

function MyRequestRow({ item, onChanged }: { item: MyJoinRequest; onChanged: () => void }) {
  const { slug } = useCollege();
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const live = item.status === "pending" || item.status === "accepted";

  async function withdraw() {
    setBusy(true);
    setError(null);
    try {
      await api.teamPosts.withdraw(slug, item.id);
      onChanged();
    } catch (caught) {
      setError(friendlyMessage(caught, "We could not withdraw the request."));
      setBusy(false);
    }
  }

  return (
    <li className="flex flex-col gap-2 py-4 sm:flex-row sm:items-start sm:justify-between sm:gap-6">
      <div className="min-w-0">
        <p className="text-[13px] font-semibold uppercase tracking-[0.06em] text-ink-muted">
          {KIND_LABEL[item.post.kind]} · {item.role.role_name}
        </p>
        <h3 className="text-[16px] font-semibold leading-snug">
          <Link
            href={`/c/${slug}/collaborate/${item.post.id}`}
            className="underline-offset-4 hover:underline"
          >
            {item.post.title}
          </Link>
        </h3>
        <p className="mt-1 text-[13.5px] text-ink-muted">
          {STATUS_WORDS[item.status] ?? item.status}
        </p>
        {item.decision_note ? (
          <p className="mt-1 text-[13.5px] text-ink">Note from the author: {item.decision_note}</p>
        ) : null}
        {error ? <p className="mt-1 text-[13.5px] text-danger">{error}</p> : null}
      </div>
      {live ? (
        <Button variant="outline" onClick={() => void withdraw()} disabled={busy}>
          {busy ? <Spinner /> : null} {item.status === "accepted" ? "Leave the team" : "Withdraw"}
        </Button>
      ) : null}
    </li>
  );
}

/** Two lists: posts of mine that people asked to join, and the requests I sent. */
export function RequestsScreen() {
  const { slug } = useCollege();
  const received = useLoad(async () => {
    const mine = await api.teamPosts.list(slug, { mine: true, status: "open", limit: 20 });
    const details = await Promise.all(mine.data.map((post) => api.teamPosts.one(slug, post.id)));
    return details.filter((post) => (post.pending_requests ?? 0) > 0);
  }, [slug]);
  const sent = useLoad(() => api.teamPosts.myRequests(slug), [slug]);

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-10 px-5 py-8 md:px-8 md:py-12">
      <PageHeader
        title="Requests"
        description="People who asked to join your posts, and the requests you sent."
        back={{ href: `/c/${slug}/collaborate`, label: "Plans" }}
      />

      <section aria-labelledby="received" className="flex flex-col gap-3">
        <h2
          id="received"
          className="text-[12px] font-semibold uppercase tracking-[0.08em] text-ink-muted"
        >
          Waiting for your answer
        </h2>
        {received.status === "loading" ? (
          <Skeleton className="h-20 w-full" />
        ) : received.status === "error" ? (
          <LoadError error={received.error} onRetry={received.reload} what="your posts" />
        ) : received.data.length === 0 ? (
          <p className="glass-card rounded-[22px] p-5 text-[14px] text-ink-muted">
            Nothing is waiting. When someone asks to join one of your open posts, it shows up here
            and in your notifications.
          </p>
        ) : (
          <ul className="glass-card divide-y divide-white/[0.07] rounded-[22px] px-4">
            {received.data.map((post) => (
              <li key={post.id} className="flex items-center justify-between gap-4 py-4">
                <div className="min-w-0">
                  <h3 className="text-[16px] font-semibold leading-snug">
                    <Link
                      href={`/c/${slug}/collaborate/${post.id}`}
                      className="underline-offset-4 hover:underline"
                    >
                      {post.title}
                    </Link>
                  </h3>
                  <p className="tabular text-[13.5px] text-ink-muted">
                    {post.pending_requests} {post.pending_requests === 1 ? "request" : "requests"}{" "}
                    waiting
                  </p>
                </div>
                <Button asChild variant="outline">
                  <Link href={`/c/${slug}/collaborate/${post.id}`}>Answer</Link>
                </Button>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section aria-labelledby="sent" className="flex flex-col gap-3">
        <h2
          id="sent"
          className="text-[12px] font-semibold uppercase tracking-[0.08em] text-ink-muted"
        >
          Requests I sent
        </h2>
        {sent.status === "loading" ? (
          <Skeleton className="h-20 w-full" />
        ) : sent.status === "error" ? (
          <LoadError error={sent.error} onRetry={sent.reload} what="your requests" />
        ) : sent.data.length === 0 ? (
          <Banner variant="info">
            <p>
              You have not asked to join anything yet.{" "}
              <Link
                href={`/c/${slug}/collaborate`}
                className="font-medium text-primary underline underline-offset-4"
              >
                Look at the open posts
              </Link>
              .
            </p>
          </Banner>
        ) : (
          <ul className="glass-card divide-y divide-white/[0.07] rounded-[22px] px-4">
            {sent.data.map((item) => (
              <MyRequestRow key={item.id} item={item} onChanged={sent.reload} />
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
