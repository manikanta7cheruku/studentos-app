import Link from "next/link";
import { ClockIcon, MapPinIcon } from "lucide-react";
import { cn } from "cn";
import { Poster } from "@/components/app/poster";
import { Avatar } from "@/components/app/avatar";
import type { TeamPost } from "@/lib/api/endpoints";
import { KIND_LABEL, formatDeadline, isTimedKind, openSlots, statusLabel } from "./labels";

/** The little label for the state of a post. Words carry the meaning; the colour only helps. */
export function StatusPill({ status }: { status: TeamPost["status"] }) {
  return (
    <span
      className={cn(
        "inline-flex h-6 items-center rounded-full px-2.5 text-[12px] font-semibold",
        status === "open" ? "bg-accent-soft text-[#b9b4ee]" : "bg-white/[0.07] text-ink-muted",
      )}
    >
      {statusLabel(status)}
    </span>
  );
}

/** Roles as plain chips: the name and how many places are free. */
export function RoleChips({ roles }: { roles: TeamPost["roles"] }) {
  return (
    <ul className="flex flex-wrap gap-2" aria-label="Roles">
      {roles.map((role) => {
        const free = Math.max(0, role.slots - role.filled);
        return (
          <li
            key={role.id}
            className="inline-flex h-8 items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] px-3 text-[13px] text-ink"
          >
            <span className="font-medium">{role.role_name}</span>
            <span className="tabular text-ink-muted">
              {free === 0 ? "full" : `${free} of ${role.slots} free`}
            </span>
          </li>
        );
      })}
    </ul>
  );
}

/** The big word on a plan's cover: the team size for a sport, a short word for the rest. */
export function coverWord(post: Pick<TeamPost, "kind" | "roles">): string {
  const slots = post.roles.reduce((sum, role) => sum + role.slots, 0);
  if (post.kind === "sport") return slots > 1 ? `${slots}` : "Play";
  if (post.kind === "event") return "Live";
  if (post.kind === "hangout") return "Hang";
  if (post.kind === "hackathon") return "Hack";
  if (post.kind === "competition") return "Win";
  if (post.kind === "startup") return "Build";
  return "Team";
}

function whenLabel(deadline: string | null): string | null {
  if (!deadline) return null;
  const date = new Date(deadline);
  if (Number.isNaN(date.getTime())) return null;
  return date.toLocaleString(undefined, {
    weekday: "short",
    day: "numeric",
    month: "short",
    hour: "numeric",
    minute: "2-digit",
  });
}

/**
 * One plan as a card with a gradient cover. The whole card is the link (the title is the link text, stretched over the
 * card), so a screen reader hears just the title and a finger or mouse can use the whole card.
 */
export function PostRow({ post, slug }: { post: TeamPost; slug: string }) {
  const free = openSlots(post);
  const joinedCount = post.roles.reduce((sum, role) => sum + role.filled, 0);
  const when = isTimedKind(post.kind) ? whenLabel(post.deadline) : null;
  return (
    <li className="group lift glass-card relative overflow-hidden rounded-[24px] focus-within:ring-2 focus-within:ring-ring">
      <article>
        <Poster seed={post.id} big={coverWord(post)} className="h-36 p-3.5">
          <div className="flex h-full flex-col justify-between">
            <div className="flex items-center gap-2">
              <span className="glass inline-flex h-7 items-center rounded-full px-3 text-[12px] font-semibold">
                {KIND_LABEL[post.kind]}
              </span>
              {post.status !== "open" ? <StatusPill status={post.status} /> : null}
              {post.is_owner ? (
                <span className="glass inline-flex h-7 items-center rounded-full px-3 text-[12px] font-semibold">
                  Yours
                </span>
              ) : null}
            </div>
            <div className="flex flex-wrap gap-2 text-[12px] font-medium">
              {when ? (
                <span className="glass inline-flex h-7 items-center gap-1.5 rounded-full px-3">
                  <ClockIcon aria-hidden="true" className="size-3.5" />
                  {when}
                </span>
              ) : null}
              {post.place ? (
                <span className="glass inline-flex h-7 max-w-full items-center gap-1.5 rounded-full px-3">
                  <MapPinIcon aria-hidden="true" className="size-3.5 shrink-0" />
                  <span className="truncate">{post.place}</span>
                </span>
              ) : null}
            </div>
          </div>
        </Poster>
        <div className="flex flex-col gap-3 p-4">
          <h2 className="text-balance text-[1.15rem] font-bold leading-snug">
            <Link
              href={`/c/${slug}/collaborate/${post.id}`}
              className="outline-none after:absolute after:inset-0"
            >
              {post.title}
            </Link>
          </h2>
          {post.description ? (
            <p className="line-clamp-2 text-[14px] leading-relaxed text-ink-muted">
              {post.description}
            </p>
          ) : null}
          {!isTimedKind(post.kind) ? <RoleChips roles={post.roles} /> : null}
          <footer className="flex items-center justify-between gap-3 pt-1 text-[13px]">
            <span className="flex min-w-0 items-center gap-2 text-ink-muted">
              <span className="flex -space-x-1.5">
                <Avatar
                  name={post.author.display_name}
                  size="xs"
                  className="ring-2 ring-[#15151d]"
                />
                {Array.from({ length: Math.min(3, joinedCount) }).map((_, n) => (
                  <span
                    key={n}
                    aria-hidden="true"
                    className="bg-brand inline-block size-6 rounded-full opacity-80 ring-2 ring-[#15151d]"
                    style={{ filter: `hue-rotate(${n * 40}deg)` }}
                  />
                ))}
              </span>
              <span className="truncate">
                {joinedCount > 0
                  ? `${post.author.display_name} +${joinedCount} in`
                  : post.author.display_name}
              </span>
            </span>
            {post.my_requests.length ? (
              <span className="shrink-0 font-semibold text-[#b9b4ee]">
                {post.my_requests[0]!.status === "accepted" ? "You are in" : "Requested"}
              </span>
            ) : post.status === "open" && free > 0 ? (
              <span className="tabular shrink-0 font-semibold text-[#b9b4ee]">
                {free} {free === 1 ? "spot" : "spots"} left
              </span>
            ) : (
              <span className="shrink-0 text-ink-muted">{formatDeadline(post.deadline)}</span>
            )}
          </footer>
        </div>
      </article>
    </li>
  );
}
