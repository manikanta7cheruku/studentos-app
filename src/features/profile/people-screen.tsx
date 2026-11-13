"use client";

import * as React from "react";
import Link from "next/link";
import { BanIcon, SearchIcon } from "lucide-react";
import { cn } from "cn";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Avatar } from "@/components/app/avatar";
import { LoadError } from "@/components/app/load-error";
import { PageHeader } from "@/components/app/page-header";
import { api } from "@/lib/api/endpoints";
import { useLoad } from "@/lib/use-load";
import { useCollege } from "@/features/college";
import { ReportMenu } from "@/features/admin-console/report-menu";
import { ProfileView } from "./profile-view";

// Quick filters. The search matches names and interests, so a chip is a ready made search.
const FILTERS = [
  "Football",
  "Cricket",
  "Badminton",
  "Gym",
  "Running",
  "Music",
  "Gaming",
  "Travel",
  "Photography",
  "Anime",
  "Design",
  "Coding",
];

type Person = Awaited<ReturnType<typeof api.people.list>>[number];

function PersonCard({ person, mine, slug }: { person: Person; mine: Set<string>; slug: string }) {
  const shared = person.interests.filter((interest) => mine.has(interest.toLowerCase()));
  const rest = person.interests.filter((interest) => !mine.has(interest.toLowerCase()));
  const shown = [...shared, ...rest].slice(0, 3);
  return (
    <li className="glass-card flex items-center gap-3 rounded-[22px] p-3.5 pr-3">
      <Link
        href={`/c/${slug}/people/${person.user_id}`}
        className="flex min-w-0 flex-1 items-center gap-3.5 rounded-2xl outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        <Avatar name={person.display_name} src={person.avatar_url} size="lg" />
        <span className="min-w-0 flex-1">
          <span className="block truncate text-[15.5px] font-bold leading-tight">
            {person.display_name}
            {person.handle ? (
              <span className="ml-1.5 text-[13px] font-normal text-ink-muted">
                @{person.handle}
              </span>
            ) : null}
          </span>
          <span className="mt-0.5 block truncate text-[13.5px] text-ink-muted">
            {person.headline ?? "No headline yet"}
          </span>
          {shown.length ? (
            <span className="mt-1.5 flex flex-wrap gap-1.5">
              {shown.map((interest) => (
                <span
                  key={interest}
                  className={cn(
                    "rounded-full border px-2.5 py-0.5 text-[12px] font-medium",
                    mine.has(interest.toLowerCase())
                      ? "border-[#8f86f0]/50 bg-[#8f86f0]/15 text-ink"
                      : "border-white/10 bg-white/[0.04] text-ink-muted",
                  )}
                >
                  {interest}
                </span>
              ))}
            </span>
          ) : null}
        </span>
      </Link>
      <Button asChild variant="outline" size="sm" className="shrink-0">
        <Link
          href={`/c/${slug}/messages/${person.user_id}`}
          aria-label={`Message ${person.display_name}`}
        >
          Message
        </Link>
      </Button>
    </li>
  );
}

/** The people of this college who chose to be visible, with quick interest filters, a search, and a Message button. */
export function PeopleScreen() {
  const { slug, college } = useCollege();
  const [query, setQuery] = React.useState("");
  const [term, setTerm] = React.useState("");

  React.useEffect(() => {
    const timer = window.setTimeout(() => setTerm(query.trim()), 300);
    return () => window.clearTimeout(timer);
  }, [query]);

  const state = useLoad(() => api.people.list(slug, term || undefined), [slug, term]);
  const me = useLoad(() => api.profile.get(), []);
  const mine = React.useMemo(
    () =>
      new Set(
        me.status === "ready" ? me.data.interests.map((interest) => interest.toLowerCase()) : [],
      ),
    [me],
  );
  const filter = FILTERS.find((name) => name.toLowerCase() === query.trim().toLowerCase());

  // With no search, people who share my interests come first, with a heading of their own.
  const people = state.status === "ready" ? state.data : [];
  const overlap = (person: Person) =>
    person.interests.filter((interest) => mine.has(interest.toLowerCase())).length;
  const split = !term && mine.size > 0;
  const similar = split
    ? people
        .filter((person) => overlap(person) > 0)
        .sort((x, y) => overlap(y) - overlap(x))
        .slice(0, 6)
    : [];
  const others = split ? people.filter((person) => !similar.includes(person)) : people;

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-5 px-4 pt-2 pb-2 md:px-8 md:py-8">
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
      <div
        role="group"
        aria-label="Filter by interest"
        data-no-swipe
        className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-0.5 [scrollbar-width:none] md:mx-0 md:flex-wrap md:px-0"
      >
        {FILTERS.map((name) => {
          const on = filter === name;
          return (
            <button
              key={name}
              type="button"
              aria-pressed={on}
              onClick={() => setQuery(on ? "" : name)}
              className={cn(
                "inline-flex h-9 shrink-0 items-center rounded-full border px-3.5 text-[13px] font-semibold outline-none transition-[background-color,border-color,color,transform] duration-200 focus-visible:ring-2 focus-visible:ring-ring active:scale-95",
                on
                  ? "bg-brand border-transparent text-white"
                  : "border-white/10 bg-white/[0.04] text-ink-muted hover:border-white/25 hover:text-ink",
              )}
            >
              {name}
            </button>
          );
        })}
      </div>
      <div aria-live="polite" className="flex flex-col gap-5">
        {state.status === "loading" ? (
          <div aria-busy="true" className="flex flex-col gap-3">
            {[0, 1, 2, 3].map((n) => (
              <div key={n} className="glass-card flex items-center gap-4 rounded-[22px] p-4">
                <Skeleton className="size-12 rounded-full" />
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
          <>
            {similar.length ? (
              <section aria-labelledby="similar" className="flex flex-col gap-2.5">
                <h2
                  id="similar"
                  className="px-1 text-[12px] font-bold uppercase tracking-[0.12em] text-ink-muted"
                >
                  Share your interests
                </h2>
                <ul className="stagger flex flex-col gap-2.5">
                  {similar.map((person) => (
                    <PersonCard key={person.user_id} person={person} mine={mine} slug={slug} />
                  ))}
                </ul>
              </section>
            ) : null}
            {others.length ? (
              <section aria-labelledby="everyone" className="flex flex-col gap-2.5">
                {similar.length || term ? (
                  <h2
                    id="everyone"
                    className="px-1 text-[12px] font-bold uppercase tracking-[0.12em] text-ink-muted"
                  >
                    {term ? `${others.length} found` : "Everyone"}
                  </h2>
                ) : null}
                <ul className="stagger flex flex-col gap-2.5">
                  {others.map((person) => (
                    <PersonCard key={person.user_id} person={person} mine={mine} slug={slug} />
                  ))}
                </ul>
              </section>
            ) : null}
          </>
        )}
      </div>
    </div>
  );
}

async function blockThem(userId: string, say: (text: string) => void) {
  try {
    await api.blocks.block(userId);
    say("Blocked. You can unblock them in Settings.");
  } catch {
    say("We could not block them. Please try again.");
  }
}

function FollowButton({ userId, initial }: { userId: string; initial: boolean }) {
  const [following, setFollowing] = React.useState(initial);
  const [busy, setBusy] = React.useState(false);
  async function toggle() {
    if (busy) return;
    const next = !following;
    setBusy(true);
    setFollowing(next);
    try {
      await api.follows.set(userId, next);
    } catch {
      setFollowing(!next);
    } finally {
      setBusy(false);
    }
  }
  return (
    <Button
      variant={following ? "outline" : "default"}
      onClick={() => void toggle()}
      aria-pressed={following}
    >
      {following ? "Following" : "Follow"}
    </Button>
  );
}

export function PersonScreen({ userId }: { userId: string }) {
  const { slug } = useCollege();
  const state = useLoad(() => api.people.one(slug, userId), [slug, userId]);
  const [note, setNote] = React.useState("");
  return (
    <div className="mx-auto flex w-full max-w-4xl flex-col gap-6 px-5 pt-4 pb-2 md:px-8 md:py-8">
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
        <>
          {note ? (
            <p role="status" className="glass-card rounded-2xl px-4 py-3 text-[14px]">
              {note}
            </p>
          ) : null}
          <ProfileView
            person={state.data}
            actions={
              state.data.is_self ? undefined : (
                <>
                  <FollowButton userId={state.data.user_id} initial={state.data.i_follow} />
                  <Button asChild variant="outline">
                    <Link href={`/c/${slug}/messages/${state.data.user_id}`}>Message</Link>
                  </Button>
                  <ReportMenu
                    targetType="profile"
                    targetId={state.data.user_id}
                    what="profile"
                    className="size-10 shrink-0 !min-w-0 !flex-none border border-white/10"
                    extra={[
                      {
                        label: "Block " + state.data.display_name,
                        icon: <BanIcon aria-hidden="true" />,
                        danger: true,
                        onSelect: () => void blockThem(state.data.user_id, setNote),
                      },
                    ]}
                  />
                </>
              )
            }
          />
        </>
      )}
    </div>
  );
}
