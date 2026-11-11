"use client";

import * as React from "react";
import { Banner } from "@/components/ui/banner";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/app/spinner";
import { friendlyMessage } from "@/lib/api-client";
import { api, type TeamPostDetail } from "@/lib/api/endpoints";
import { useCollege } from "@/features/college";
import { RequestDialog } from "./request-dialog";

type Role = TeamPostDetail["roles"][number];

const REQUEST_WORDS: Record<string, string> = {
  pending: "You asked to join. Waiting for the author.",
  accepted: "You are in.",
  declined: "The author said no this time.",
  cancelled: "This request was cancelled.",
  withdrawn: "You withdrew this request.",
};

/** The roles of a post, with what a person can do about each one. */
export function RoleList({ post, onChanged }: { post: TeamPostDetail; onChanged: () => void }) {
  const { slug } = useCollege();
  const [asking, setAsking] = React.useState<Role | null>(null);
  const [withdrawing, setWithdrawing] = React.useState<string | null>(null);
  const [joining, setJoining] = React.useState<string | null>(null);
  const [error, setError] = React.useState<string | null>(null);

  // A person can have one live request (waiting or accepted) in a post.
  const live = post.my_requests.find((r) => r.status === "pending" || r.status === "accepted");

  // One tap: no message, no waiting. The host is told and you are in at once.
  async function joinNow(roleId: string) {
    if (joining) return;
    setJoining(roleId);
    setError(null);
    try {
      await api.teamPosts.join(slug, post.id, roleId);
      onChanged();
    } catch (caught) {
      setError(friendlyMessage(caught, "We could not add you. Please try again."));
    } finally {
      setJoining(null);
    }
  }

  async function withdraw(requestId: string) {
    setWithdrawing(requestId);
    setError(null);
    try {
      await api.teamPosts.withdraw(slug, requestId);
      onChanged();
    } catch (caught) {
      setError(friendlyMessage(caught, "We could not withdraw the request. Please try again."));
    } finally {
      setWithdrawing(null);
    }
  }

  return (
    <section aria-labelledby="roles" className="flex flex-col gap-3">
      <h2
        id="roles"
        className="text-[12px] font-semibold uppercase tracking-[0.08em] text-ink-muted"
      >
        Roles
      </h2>
      {error ? (
        <Banner variant="error">
          <p>{error}</p>
        </Banner>
      ) : null}
      <ul className="divide-y divide-border border-y border-border">
        {post.roles.map((role) => {
          const free = Math.max(0, role.slots - role.filled);
          const mine = post.my_requests.filter((r) => r.role_id === role.id);
          const latest = mine[0];
          const canAsk =
            !post.is_owner &&
            post.status === "open" &&
            free > 0 &&
            !live &&
            !mine.some((r) => r.status === "pending");
          return (
            <li
              key={role.id}
              className="flex flex-col gap-3 py-4 sm:flex-row sm:items-start sm:justify-between sm:gap-6"
            >
              <div className="min-w-0">
                <h3 className="text-[16px] font-semibold">{role.role_name}</h3>
                {role.skills.length ? (
                  <p className="mt-1 text-[13.5px] text-ink-muted">
                    Helps if you know: {role.skills.join(", ")}
                  </p>
                ) : null}
                {latest ? (
                  <p className="mt-2 text-[13.5px] font-medium text-ink">
                    {REQUEST_WORDS[latest.status] ?? latest.status}
                  </p>
                ) : null}
              </div>
              <div className="flex flex-col items-start gap-2 sm:items-end">
                <p className="tabular text-[13.5px] text-ink-muted">
                  {free === 0 ? "No places left" : `${free} of ${role.slots} places free`}
                </p>
                {canAsk && post.join_mode === "open" ? (
                  <Button onClick={() => void joinNow(role.id)} disabled={joining !== null}>
                    {joining === role.id ? <Spinner /> : null} Join
                  </Button>
                ) : canAsk ? (
                  <Button onClick={() => setAsking(role)}>Ask to join</Button>
                ) : null}
                {latest && (latest.status === "pending" || latest.status === "accepted") ? (
                  <Button
                    variant="outline"
                    onClick={() => void withdraw(latest.id)}
                    disabled={withdrawing === latest.id}
                  >
                    {withdrawing === latest.id ? <Spinner /> : null}
                    {latest.status === "accepted" ? "Leave the team" : "Withdraw request"}
                  </Button>
                ) : null}
              </div>
            </li>
          );
        })}
      </ul>
      {asking ? (
        <RequestDialog
          postId={post.id}
          postTitle={post.title}
          role={asking}
          open
          onOpenChange={(next) => !next && setAsking(null)}
          onSent={() => {
            setAsking(null);
            onChanged();
          }}
        />
      ) : null}
    </section>
  );
}
