import Link from "next/link";
import { CalendarClockIcon, MapPinIcon, UsersRoundIcon } from "lucide-react";
import { Avatar } from "@/components/app/avatar";
import { GlassPill, GlassTile } from "@/components/app/glass-parts";
import { OutsideBadge } from "@/components/app/outside-badge";
import type { TeamPost } from "@/lib/api/endpoints";
import { KIND_LABEL, formatDeadline, isTimedKind, openSlots, statusLabel } from "./labels";

/** The little label for the state of a post. Words carry the meaning; the colour only helps. */
export function StatusPill({ status }: { status: TeamPost["status"] }) {
  return (
    <GlassPill tone={status === "open" ? "good" : "warn"} className="h-6 px-2.5 text-[11.5px]">
      {statusLabel(status)}
    </GlassPill>
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
            className="inline-flex h-8 items-center gap-2 rounded-full border border-white/10 bg-white/[0.05] px-3 text-[13px] text-ink"
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
 * One plan as a glass card. The whole card is the link (the title is the link text, stretched over the card), so a screen
 * reader hears just the title and a finger or mouse can use the whole card.
 */
export function PostRow({
  post,
  slug,
  outside = false,
}: {
  post: TeamPost;
  slug: string;
  /** It came from the public space while I am looking at my college. */
  outside?: boolean;
}) {
  const free = openSlots(post);
  const joinedCount = post.roles.reduce((sum, role) => sum + role.filled, 0);
  const when = isTimedKind(post.kind) ? whenLabel(post.deadline) : null;
  return (
    <li className="group lift glass-card relative rounded-[22px] focus-within:ring-2 focus-within:ring-ring">
      <article className="flex flex-col gap-3 p-4">
        <div className="flex items-start gap-3">
          <GlassTile>
            <UsersRoundIcon />
          </GlassTile>
          <div className="min-w-0 flex-1">
            <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-ink-muted">
              {KIND_LABEL[post.kind]}
            </p>
            <h2 className="text-balance text-[16px] font-bold leading-snug [overflow-wrap:anywhere]">
              <Link
                href={`/c/${slug}/collaborate/${post.id}`}
                className="outline-none after:absolute after:inset-0 after:rounded-[22px]"
              >
                {post.title}
              </Link>
            </h2>
          </div>
          <div className="flex shrink-0 flex-col items-end gap-1.5">
            {post.status !== "open" ? <StatusPill status={post.status} /> : null}
            {post.is_owner ? (
              <GlassPill tone="quiet" className="h-6 px-2.5 text-[11.5px]">
                Yours
              </GlassPill>
            ) : null}
            {outside ? <OutsideBadge className="h-6 px-2.5 text-[11px]" /> : null}
          </div>
        </div>

        {when || post.place ? (
          <p className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[13.5px] font-medium">
            {when ? (
              <span className="flex items-center gap-2">
                <CalendarClockIcon aria-hidden="true" className="size-4 shrink-0 text-ink-muted" />
                {when}
              </span>
            ) : null}
            {post.place ? (
              <span className="flex min-w-0 items-center gap-2">
                <MapPinIcon aria-hidden="true" className="size-4 shrink-0 text-ink-muted" />
                <span className="truncate">{post.place}</span>
              </span>
            ) : null}
          </p>
        ) : null}

        {post.description ? (
          <p className="line-clamp-2 text-[13.5px] leading-relaxed text-ink-muted">
            {post.description}
          </p>
        ) : null}
        {!isTimedKind(post.kind) ? <RoleChips roles={post.roles} /> : null}

        <footer className="flex items-center justify-between gap-3 border-t border-white/[0.07] pt-3 text-[13px]">
          <span className="flex min-w-0 items-center gap-2 text-ink-muted">
            <Avatar name={post.author.display_name} size="xs" />
            <span className="truncate">
              {joinedCount > 0
                ? `${post.author.display_name} +${joinedCount} in`
                : post.author.display_name}
            </span>
          </span>
          {post.my_requests.length ? (
            <GlassPill
              tone={post.my_requests[0]!.status === "accepted" ? "good" : "quiet"}
              className="h-6 px-2.5 text-[11.5px]"
            >
              {post.my_requests[0]!.status === "accepted" ? "You are in" : "Requested"}
            </GlassPill>
          ) : post.status === "open" && free > 0 ? (
            <span className="tabular shrink-0 font-semibold text-ink/90">
              {free} {free === 1 ? "spot" : "spots"} left
            </span>
          ) : (
            <span className="shrink-0 text-ink-muted">{formatDeadline(post.deadline)}</span>
          )}
        </footer>
      </article>
    </li>
  );
}
