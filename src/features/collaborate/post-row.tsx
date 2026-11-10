import Link from "next/link";
import { CalendarIcon } from "lucide-react";
import { cn } from "cn";
import type { TeamPost } from "@/lib/api/endpoints";
import { KIND_LABEL, formatDeadline, openSlots, statusLabel } from "./labels";

/** The little label for the state of a post. Words carry the meaning; the colour only helps. */
export function StatusPill({ status }: { status: TeamPost["status"] }) {
  return (
    <span
      className={cn(
        "inline-flex min-h-6 items-center rounded-full px-2.5 text-[12px] font-semibold",
        status === "open" ? "bg-accent-soft text-primary" : "bg-border/70 text-ink-muted",
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
            className="inline-flex min-h-8 items-center gap-2 rounded-full border border-border bg-surface px-3 text-[13px] text-ink"
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

/**
 * One post in the list. The title is the link, stretched over the whole row, so a screen reader hears just the title as
 * the link and a finger or mouse can use the whole row.
 */
export function PostRow({ post, slug }: { post: TeamPost; slug: string }) {
  const free = openSlots(post);
  return (
    <li className="group relative py-5 transition-colors focus-within:bg-accent-soft/40 hover:bg-accent-soft/40 sm:px-3">
      <article className="flex flex-col gap-3">
        <header className="flex flex-wrap items-center gap-x-3 gap-y-1.5 text-[13px] text-ink-muted">
          <span className="font-semibold uppercase tracking-[0.06em] text-ink">
            {KIND_LABEL[post.kind]}
          </span>
          <StatusPill status={post.status} />
          {post.is_owner ? <span className="font-medium text-primary">Your post</span> : null}
        </header>
        <h2 className="text-balance text-[1.35rem] font-semibold leading-snug text-ink">
          <Link
            href={`/c/${slug}/collaborate/${post.id}`}
            className="outline-none after:absolute after:inset-0 group-hover:underline group-hover:underline-offset-4 focus-visible:underline"
          >
            {post.title}
          </Link>
        </h2>
        {post.description ? (
          <p className="line-clamp-2 max-w-prose text-[14px] leading-relaxed text-ink-muted">
            {post.description}
          </p>
        ) : null}
        <RoleChips roles={post.roles} />
        <footer className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[13px] text-ink-muted">
          <span>by {post.author.display_name}</span>
          <span className="inline-flex items-center gap-1.5">
            <CalendarIcon aria-hidden="true" className="size-4" />
            {formatDeadline(post.deadline)}
          </span>
          {post.status === "open" ? (
            <span className="tabular">
              {free} {free === 1 ? "place" : "places"} free
            </span>
          ) : null}
          {post.my_requests.length ? (
            <span className="font-medium text-ink">
              You asked to join ({post.my_requests[0]!.status})
            </span>
          ) : null}
        </footer>
      </article>
    </li>
  );
}
