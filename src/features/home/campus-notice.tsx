"use client";

import Link from "next/link";
import { MegaphoneIcon, PinIcon } from "lucide-react";
import { GLOBAL_SLUG } from "@/lib/home-path";
import { api } from "@/lib/api/endpoints";
import { useLoad } from "@/lib/use-load";
import { useCollege } from "@/features/college";

/**
 * The latest notice from the college at the top of Home, so official news is not missed now that Campus is not in the
 * bottom bar. Pinned notices come first. It is hidden in Global, in a college that switched Campus off, and when there is
 * nothing to show (or the notices cannot be loaded: Home does not need to complain about that).
 */
export function CampusNotice() {
  const { slug, college } = useCollege();
  const off = slug === GLOBAL_SLUG || !college.modules.campus;
  const state = useLoad(
    () => (off ? Promise.resolve(null) : api.announcements.list(slug)),
    [slug, off],
  );
  if (off || state.status !== "ready" || !state.data) return null;
  const latest = state.data.data[0];
  if (!latest) return null;
  const when = new Date(latest.publish_at).toLocaleDateString(undefined, {
    day: "numeric",
    month: "short",
  });
  return (
    <Link
      href={`/c/${slug}/campus`}
      className="lift glass-card group relative flex min-h-[84px] w-[84%] max-w-[340px] shrink-0 items-center gap-3 overflow-hidden rounded-[20px] px-3.5 py-3 outline-none focus-visible:ring-2 focus-visible:ring-ring"
    >
      <span className="bg-brand inline-flex size-10 shrink-0 items-center justify-center rounded-xl text-white">
        <MegaphoneIcon aria-hidden="true" className="size-5" />
      </span>
      <span className="min-w-0 flex-1">
        <span className="flex items-center gap-1.5 text-[10.5px] font-bold uppercase tracking-[0.1em] text-ink-muted">
          {latest.pinned ? <PinIcon aria-hidden="true" className="size-3" /> : null}
          <span className="truncate">
            {college.short_name || college.name} notice · {when}
          </span>
        </span>
        <span className="block truncate text-[14.5px] font-bold leading-snug">{latest.title}</span>
        <span className="block truncate text-[12.5px] text-ink-muted">{latest.body}</span>
      </span>
    </Link>
  );
}
