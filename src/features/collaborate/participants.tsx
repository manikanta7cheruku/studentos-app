"use client";

import * as React from "react";
import Link from "next/link";
import { Avatar } from "@/components/app/avatar";
import { api, type TeamPostDetail } from "@/lib/api/endpoints";
import { useLoad } from "@/lib/use-load";
import { useCollege } from "@/features/college";

/**
 * Who is in. The host sees it, and so does everyone who joined ("this person joined"). Anyone else gets an empty
 * list from the server, so the section stays hidden for them.
 */
export function Participants({ post, version }: { post: TeamPostDetail; version: string }) {
  const { slug } = useCollege();
  const state = useLoad(() => api.teamPosts.participants(slug, post.id), [slug, post.id, version]);
  if (state.status !== "ready" || state.data.length === 0) return null;
  return (
    <section aria-labelledby="who-is-in" className="flex flex-col gap-3">
      <h2
        id="who-is-in"
        className="text-[12px] font-semibold uppercase tracking-[0.08em] text-ink-muted"
      >
        Who is in ({state.data.length})
      </h2>
      <ul className="flex flex-col gap-2">
        {state.data.map((person) => (
          <li
            key={person.user_id}
            className="flex items-center gap-3 rounded-2xl border border-white/[0.08] bg-white/[0.03] px-3.5 py-2.5"
          >
            <Avatar name={person.display_name} size="sm" />
            <div className="min-w-0 flex-1">
              <Link
                href={`/c/${slug}/people/${person.user_id}`}
                className="truncate text-[14.5px] font-semibold hover:underline"
              >
                {person.display_name}
              </Link>
              <p className="text-[12.5px] text-ink-muted">
                {person.is_host ? "Host" : person.role_name}
              </p>
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}
