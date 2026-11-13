"use client";

import * as React from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { cn } from "cn";
import { Skeleton } from "@/components/ui/skeleton";
import { Avatar } from "@/components/app/avatar";
import { LoadError } from "@/components/app/load-error";
import { PageHeader } from "@/components/app/page-header";
import { api } from "@/lib/api/endpoints";
import { useLoad } from "@/lib/use-load";
import { useCollege } from "@/features/college";

/** My followers, and the people I follow. Only I can see these lists: nobody else sees who follows whom. */
export function ConnectionsScreen() {
  const { slug } = useCollege();
  const params = useSearchParams();
  const kind = params.get("kind") === "following" ? "following" : "followers";
  const state = useLoad(() => api.follows.list(kind), [kind]);
  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-4 px-4 pt-2 pb-2 md:px-8 md:py-8">
      <PageHeader
        title="Followers"
        description="Only you can see these lists."
        back={{ href: `/c/${slug}/me`, label: "My profile" }}
      />
      <div
        role="tablist"
        aria-label="Which list"
        className="inline-flex w-fit rounded-full border border-white/10 bg-white/[0.04] p-1"
      >
        {(
          [
            ["followers", "Followers"],
            ["following", "Following"],
          ] as const
        ).map(([value, label]) => (
          <Link
            key={value}
            role="tab"
            aria-selected={kind === value}
            href={`/c/${slug}/me/connections?kind=${value}`}
            replace
            className={cn(
              "inline-flex h-8 items-center rounded-full px-5 text-[13px] font-semibold outline-none transition-[background-color,color] duration-200 focus-visible:ring-2 focus-visible:ring-ring",
              kind === value ? "bg-white/[0.16] text-ink" : "text-ink-muted hover:text-ink",
            )}
          >
            {label}
          </Link>
        ))}
      </div>
      {state.status === "loading" ? (
        <div aria-busy="true" className="flex flex-col gap-2.5">
          {[0, 1, 2].map((n) => (
            <Skeleton key={n} className="h-16 w-full rounded-[18px]" />
          ))}
        </div>
      ) : state.status === "error" ? (
        <LoadError error={state.error} onRetry={state.reload} what="this list" />
      ) : state.data.length === 0 ? (
        <p className="glass-card rounded-[22px] p-6 text-center text-[14px] text-ink-muted">
          {kind === "followers"
            ? "Nobody follows you yet. Take part in a debate or post a buzz and people will find you."
            : "You do not follow anyone yet. Open a profile and tap Follow."}
        </p>
      ) : (
        <ul className="stagger flex flex-col gap-2.5">
          {state.data.map((person) => (
            <li key={person.user_id}>
              <Link
                href={`/c/${slug}/people/${person.user_id}`}
                className="lift glass-card flex items-center gap-3.5 rounded-[18px] px-4 py-3 outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <Avatar name={person.display_name} src={person.avatar_url} size="md" />
                <span className="min-w-0">
                  <span className="block truncate text-[15px] font-semibold">
                    {person.display_name}
                  </span>
                  {person.headline ? (
                    <span className="block truncate text-[13px] text-ink-muted">
                      {person.headline}
                    </span>
                  ) : null}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
