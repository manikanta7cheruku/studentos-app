"use client";

import * as React from "react";
import Link from "next/link";
import { SearchIcon } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Avatar } from "@/components/app/avatar";
import { LoadError } from "@/components/app/load-error";
import { PageHeader } from "@/components/app/page-header";
import { api } from "@/lib/api/endpoints";
import { useLoad } from "@/lib/use-load";
import { useCollege } from "@/features/college";
import { ReportButton } from "@/features/admin-console/report-button";
import { ProfileView } from "./profile-view";

/** The people of this college who chose to be visible, with a search by name or interest. */
export function PeopleScreen() {
  const { slug, college } = useCollege();
  const [query, setQuery] = React.useState("");
  const [term, setTerm] = React.useState("");

  React.useEffect(() => {
    const timer = window.setTimeout(() => setTerm(query.trim()), 300);
    return () => window.clearTimeout(timer);
  }, [query]);

  const state = useLoad(() => api.people.list(slug, term || undefined), [slug, term]);

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-6 px-5 pt-3 md:px-8 md:py-8">
      <PageHeader
        eyebrow={college.name}
        title="People"
        description="Classmates who chose to show their profile."
      />
      <div className="relative">
        <SearchIcon
          aria-hidden="true"
          className="pointer-events-none absolute left-3.5 top-1/2 size-5 -translate-y-1/2 text-ink-muted"
        />
        <Input
          type="search"
          aria-label="Search people"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Search by name or interest"
          className="pl-11"
          autoComplete="off"
        />
      </div>
      <div aria-live="polite">
        {state.status === "loading" ? (
          <div aria-busy="true" className="flex flex-col gap-3">
            {[0, 1, 2, 3].map((n) => (
              <div key={n} className="flex items-center gap-4 py-3">
                <Skeleton className="size-11 rounded-full" />
                <div className="flex-1">
                  <Skeleton className="h-5 w-1/3" />
                  <Skeleton className="mt-2 h-4 w-2/3" />
                </div>
              </div>
            ))}
          </div>
        ) : state.status === "error" ? (
          <LoadError error={state.error} onRetry={state.reload} what="the people list" />
        ) : state.data.length === 0 ? (
          <div className="glass-card rounded-[22px] p-8">
            <p className="text-lg font-semibold">
              {term ? `Nobody found for “${term}”.` : "Nobody is visible yet."}
            </p>
            <p className="mt-1 text-ink-muted">
              {term
                ? "Try a different name or interest."
                : "Profiles show up here when classmates choose to be visible."}
            </p>
          </div>
        ) : (
          <ul className="glass-card divide-y divide-white/[0.07] rounded-[22px] px-4">
            {state.data.map((person) => (
              <li key={person.user_id}>
                <Link
                  href={`/c/${slug}/people/${person.user_id}`}
                  className="flex min-h-[4.5rem] items-center gap-4 py-3 pr-2 transition-colors hover:bg-accent-soft/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring"
                >
                  <Avatar name={person.display_name} src={person.avatar_url} size="md" />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[15px] font-semibold">
                      {person.display_name}
                      {person.handle ? (
                        <span className="ml-2 text-[13.5px] font-normal text-ink-muted">
                          @{person.handle}
                        </span>
                      ) : null}
                    </span>
                    <span className="block truncate text-[13.5px] text-ink-muted">
                      {person.headline ??
                        (person.interests.slice(0, 3).join(", ") || "No headline yet")}
                    </span>
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

export function PersonScreen({ userId }: { userId: string }) {
  const { slug } = useCollege();
  const state = useLoad(() => api.people.one(slug, userId), [slug, userId]);
  return (
    <div className="mx-auto flex w-full max-w-4xl flex-col gap-6 px-5 pt-3 md:px-8 md:py-8">
      <Link
        href={`/c/${slug}/people`}
        className="-ml-1 inline-flex min-h-11 w-fit items-center rounded-input px-1 text-[13.5px] font-medium text-ink-muted hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        ← People
      </Link>
      {state.status === "loading" ? (
        <div aria-busy="true" className="flex items-center gap-6">
          <Skeleton className="size-24 rounded-full" />
          <Skeleton className="h-9 w-1/2" />
        </div>
      ) : state.status === "error" ? (
        state.error instanceof Error && "status" in state.error && state.error.status === 404 ? (
          <div className="rounded-card border border-border p-8">
            <p className="text-lg font-semibold">This profile is not available.</p>
            <p className="mt-1 text-ink-muted">
              The person may have hidden it or left the college.
            </p>
          </div>
        ) : (
          <LoadError error={state.error} onRetry={state.reload} what="this profile" />
        )
      ) : (
        <ProfileView
          person={state.data}
          actions={
            state.data.is_self ? undefined : (
              <ReportButton
                targetType="profile"
                targetId={state.data.user_id}
                what="this profile"
              />
            )
          }
        />
      )}
    </div>
  );
}
