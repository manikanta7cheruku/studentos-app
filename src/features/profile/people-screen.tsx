"use client";

import * as React from "react";
import Link from "next/link";
import {
  BanIcon,
  ChevronRightIcon,
  HourglassIcon,
  SearchIcon,
  SlidersHorizontalIcon,
} from "lucide-react";
import { cn } from "cn";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Avatar } from "@/components/app/avatar";
import { LoadError } from "@/components/app/load-error";
import { PageHeader } from "@/components/app/page-header";
import { api, type DmThreadItem } from "@/lib/api/endpoints";
import { Ring, SayHi, PeopleToMeet } from "@/features/home/network-card";
import { networkProgress } from "@/features/home/network-tiers";
import { useLoad } from "@/lib/use-load";
import { useCollege } from "@/features/college";
import { ReportMenu } from "@/features/admin-console/report-menu";
import { CASUAL_INTERESTS, TECH_INTERESTS } from "./about-fields";
import { ProfileView } from "./profile-view";

type Person = Awaited<ReturnType<typeof api.people.list>>[number];

const lower = (text: string) => text.toLowerCase();
// An older server (or sample data) may not send the tech interests: treat that as none.
const allInterests = (person: Person) => [
  ...(person.interests ?? []),
  ...(person.tech_interests ?? []),
];

type RowPerson = {
  user_id: string;
  display_name: string;
  avatar_url: string | null;
  headline: string | null;
  handle?: string | null;
  college_name: string | null;
  branch: string | null;
  grad_year: number | null;
  place?: string | null;
  interests?: string[];
  tech_interests?: string[];
};

/** How I stand with a person: connected, waiting for them, waiting for me, not available right now, or nothing yet. */
type Standing = "connected" | "sent" | "received" | "declined" | "none";

function standingOf(
  id: string,
  connected: Set<string>,
  threads: Map<string, DmThreadItem>,
  sentNow: Set<string>,
): Standing {
  if (connected.has(id)) return "connected";
  const thread = threads.get(id);
  if (thread?.kind === "chat") return "connected";
  if (thread?.kind === "request_received") return "received";
  if (thread?.kind === "request_sent" || sentNow.has(id)) return "sent";
  if (
    thread?.kind === "declined" &&
    thread.can_request_again_at &&
    new Date(thread.can_request_again_at).getTime() > Date.now()
  )
    return "declined";
  return "none";
}

function PersonRow({
  person,
  mine,
  slug,
  standing,
  onHi,
}: {
  person: RowPerson;
  mine: Set<string>;
  slug: string;
  standing: Standing;
  onHi: (person: RowPerson) => void;
}) {
  const shared = [...(person.interests ?? []), ...(person.tech_interests ?? [])].filter(
    (interest) => mine.has(lower(interest)),
  );
  const meta = [person.college_name, person.branch, person.grad_year, person.place]
    .filter(Boolean)
    .join(" · ");
  const chip =
    "inline-flex h-8 shrink-0 items-center gap-1.5 rounded-full px-3 text-[12.5px] font-semibold";
  return (
    <li className="glass-card flex items-center gap-3 rounded-[20px] p-3 pr-3">
      <Link
        href={`/c/${slug}/people/${person.user_id}`}
        className="flex min-w-0 flex-1 items-center gap-3 rounded-2xl outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        <Avatar name={person.display_name} src={person.avatar_url} size="md" />
        <span className="min-w-0 flex-1">
          <span className="block truncate text-[15px] font-bold leading-tight">
            {person.display_name}
          </span>
          <span className="block truncate text-[13px] text-ink-muted">
            {person.headline ?? (person.handle ? `@${person.handle}` : meta || "New on StudentOS")}
          </span>
          {person.headline && meta ? (
            <span className="block truncate text-[12px] text-ink-muted/80">{meta}</span>
          ) : null}
          {shared.length ? (
            <span className="mt-0.5 block truncate text-[12px]">
              <span className="font-semibold text-[#b9b4ee]">{shared.length} in common</span>
              <span className="text-ink-muted">
                {" · "}
                {shared.slice(0, 2).join(", ")}
                {shared.length > 2 ? ` +${shared.length - 2}` : ""}
              </span>
            </span>
          ) : null}
        </span>
      </Link>
      {standing === "connected" ? (
        <Button asChild variant="outline" size="sm" className="shrink-0">
          <Link
            href={`/c/${slug}/messages/${person.user_id}`}
            aria-label={`Message ${person.display_name}`}
          >
            Message
          </Link>
        </Button>
      ) : standing === "sent" ? (
        <span className={cn(chip, "bg-white/[0.06] text-ink-muted")}>
          <HourglassIcon aria-hidden="true" className="size-3.5" /> Requested
        </span>
      ) : standing === "received" ? (
        <Button asChild size="sm" className="shrink-0">
          <Link href={`/c/${slug}/messages/${person.user_id}`}>
            Respond <ChevronRightIcon aria-hidden="true" />
          </Link>
        </Button>
      ) : standing === "declined" ? (
        <span className={cn(chip, "bg-white/[0.06] text-ink-muted")}>Not now</span>
      ) : (
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="shrink-0"
          onClick={() => onHi(person)}
          aria-label={`Say hi to ${person.display_name}`}
        >
          Say hi
        </Button>
      )}
    </li>
  );
}

/** A choice of interests in a sheet, so the page itself stays clean. */
function InterestFilter({
  selected,
  onChange,
}: {
  selected: string[];
  onChange: (next: string[]) => void;
}) {
  const [open, setOpen] = React.useState(false);
  const [draft, setDraft] = React.useState<string[]>(selected);
  const toggle = (name: string) =>
    setDraft((current) =>
      current.includes(name) ? current.filter((item) => item !== name) : [...current, name],
    );
  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (next) setDraft(selected);
        setOpen(next);
      }}
    >
      <Button
        type="button"
        variant="outline"
        onClick={() => setOpen(true)}
        className="h-11 shrink-0 rounded-[14px]"
        aria-label={
          selected.length ? `Interests, ${selected.length} chosen` : "Filter by interests"
        }
      >
        <SlidersHorizontalIcon aria-hidden="true" />
        <span className="hidden sm:inline">Interests</span>
        {selected.length ? (
          <span className="bg-brand tabular inline-flex min-w-5 items-center justify-center rounded-full px-1.5 text-[11px] font-bold text-white">
            {selected.length}
          </span>
        ) : null}
      </Button>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Filter by interests</DialogTitle>
          <DialogDescription>Show people who share at least one of these.</DialogDescription>
        </DialogHeader>
        <div className="flex max-h-[55vh] flex-col gap-5 overflow-y-auto pr-1">
          {(
            [
              ["For fun", CASUAL_INTERESTS],
              ["Tech and career", TECH_INTERESTS],
            ] as const
          ).map(([title, list]) => (
            <div key={title} className="flex flex-col gap-2">
              <p className="text-[12px] font-bold uppercase tracking-[0.12em] text-ink-muted">
                {title}
              </p>
              <div className="flex flex-wrap gap-2">
                {list.map((name) => {
                  const on = draft.includes(name);
                  return (
                    <button
                      key={name}
                      type="button"
                      aria-pressed={on}
                      onClick={() => toggle(name)}
                      className={cn(
                        "inline-flex h-9 items-center rounded-full border px-3.5 text-[13px] font-semibold outline-none transition-[background-color,border-color,color,transform] duration-200 focus-visible:ring-2 focus-visible:ring-ring active:scale-95",
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
            </div>
          ))}
        </div>
        <DialogFooter>
          <Button type="button" variant="ghost" onClick={() => setDraft([])}>
            Clear
          </Button>
          <Button
            type="button"
            onClick={() => {
              onChange(draft);
              setOpen(false);
            }}
          >
            Show people
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

type Tab = "all" | "similar" | "college" | "connections";

/**
 * The Network: how strong mine is, the people I am connected to, and everyone who chose to be visible. Search, tabs with a gliding
 * highlight, an interests filter in a sheet, and one clear action on each person (Say hi, Requested, Respond, Message).
 */
export function PeopleScreen() {
  const { slug, college } = useCollege();
  const [query, setQuery] = React.useState("");
  const [term, setTerm] = React.useState("");
  const [tab, setTab] = React.useState<Tab>("all");
  const [interests, setInterests] = React.useState<string[]>([]);
  const [hi, setHi] = React.useState<RowPerson | null>(null);
  const [sentNow, setSentNow] = React.useState<Set<string>>(() => new Set());

  React.useEffect(() => {
    const timer = window.setTimeout(() => setTerm(query.trim()), 300);
    return () => window.clearTimeout(timer);
  }, [query]);

  const state = useLoad(() => api.people.list(slug, term || undefined), [slug, term]);
  const me = useLoad(() => api.profile.get(), []);
  const stats = useLoad(() => api.network.mine(), []);
  const links = useLoad(() => api.network.connections(slug), [slug]);
  const threads = useLoad(() => api.messages.threads(slug), [slug]);
  const mine = React.useMemo(
    () =>
      new Set(
        me.status === "ready"
          ? [...me.data.interests, ...(me.data.tech_interests ?? [])].map(lower)
          : [],
      ),
    [me],
  );
  const myCollege = me.status === "ready" ? (me.data.college_name ?? "") : "";

  // Keep the last list on screen while a new search loads, so the page does not flash.
  const [last, setLast] = React.useState<Person[] | null>(null);
  if (state.status === "ready" && last !== state.data) setLast(state.data);
  const myId = me.status === "ready" ? me.data.user_id : null;
  const everyone = (state.status === "ready" ? state.data : (last ?? [])).filter(
    (person) => person.user_id !== myId,
  );
  const refreshing = state.status === "loading" && last !== null;

  const connected = React.useMemo(
    () => new Set(links.status === "ready" ? links.data.map((p) => p.user_id) : []),
    [links],
  );
  const threadMap = React.useMemo(
    () =>
      new Map((threads.status === "ready" ? threads.data : []).map((t) => [t.user_id, t] as const)),
    [threads],
  );

  const overlap = (person: Person) => allInterests(person).filter((i) => mine.has(lower(i))).length;
  const picked = interests.map(lower);
  const fromConnections: RowPerson[] =
    links.status === "ready"
      ? links.data
          .filter(
            (p) =>
              !term ||
              [p.display_name, p.headline, p.college_name, p.branch, p.place]
                .filter(Boolean)
                .join(" ")
                .toLowerCase()
                .includes(term.toLowerCase()),
          )
          .map((p) => everyone.find((x) => x.user_id === p.user_id) ?? p)
      : [];
  const shown: RowPerson[] =
    tab === "connections"
      ? fromConnections
      : everyone
          .filter((person) => {
            if (picked.length && !allInterests(person).some((i) => picked.includes(lower(i))))
              return false;
            if (tab === "similar") return overlap(person) > 0;
            if (tab === "college")
              return Boolean(myCollege) && lower(person.college_name ?? "") === lower(myCollege);
            return true;
          })
          .sort((x, y) => (tab === "similar" ? overlap(y) - overlap(x) : 0));

  const count = stats.status === "ready" ? stats.data.connections : (connected.size ?? 0);
  const progress = networkProgress(count);
  const tabs: [Tab, string][] = [
    ["all", "Everyone"],
    ["connections", "Connected"],
    ["similar", "Similar"],
    ...(myCollege ? ([["college", "College"]] as [Tab, string][]) : []),
  ];
  const index = Math.max(
    0,
    tabs.findIndex(([value]) => value === tab),
  );
  const loading =
    tab === "connections" ? links.status === "loading" : state.status === "loading" && !last;
  const failed =
    tab === "connections"
      ? links.status === "error"
        ? links.error
        : null
      : state.status === "error"
        ? state.error
        : null;
  const reloadAll = () => {
    threads.reload();
    stats.reload();
    links.reload();
  };

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-4 px-4 pt-2 pb-2 md:px-8 md:py-8">
      <PageHeader eyebrow={college.name} title="Network" />

      {stats.status === "ready" ? (
        <section
          aria-label="Network strength"
          className="glass-card flex items-center gap-3.5 rounded-[20px] px-4 py-3"
        >
          <Ring fraction={progress.fraction} size={48}>
            {count}
          </Ring>
          <div className="min-w-0 flex-1">
            <p className="text-[11px] font-bold uppercase tracking-[0.1em] text-ink-muted">
              Network strength
            </p>
            <p className="truncate text-[15px] font-bold leading-snug">
              {progress.tier ? progress.tier.name : "Just getting started"}
            </p>
            <p className="truncate text-[12.5px] text-ink-muted">
              {progress.next
                ? `Meet ${progress.left} more ${progress.left === 1 ? "person" : "people"} to reach ${progress.next.name}`
                : "You are at the top. Keep it going."}
            </p>
          </div>
          {stats.data.requests_received > 0 ? (
            <Link
              href={`/c/${slug}/messages`}
              className="bg-brand shrink-0 rounded-full px-3 py-1.5 text-[12px] font-bold text-white"
            >
              {stats.data.requests_received} waiting
            </Link>
          ) : null}
        </section>
      ) : null}

      <div className="flex gap-2">
        <div className="relative flex-1">
          <SearchIcon
            aria-hidden="true"
            className="pointer-events-none absolute left-3.5 top-1/2 size-5 -translate-y-1/2 text-ink-muted"
          />
          <Input
            type="search"
            aria-label="Search the network"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search name, branch, interest"
            className="pl-11"
            autoComplete="off"
          />
        </div>
        <InterestFilter selected={interests} onChange={setInterests} />
      </div>

      <div className="flex flex-col gap-2">
        <div
          role="tablist"
          aria-label="Who to show"
          className="no-scrollbar relative grid overflow-x-auto rounded-full border border-white/10 bg-white/[0.04] p-1"
          style={{ gridTemplateColumns: `repeat(${tabs.length}, minmax(0, 1fr))` }}
        >
          <span
            aria-hidden="true"
            className="absolute inset-y-1 left-1 rounded-full bg-white/[0.16] shadow-[inset_0_1px_0_rgba(255,255,255,0.14)] transition-transform duration-[380ms] ease-[cubic-bezier(0.3,1.2,0.4,1)] motion-reduce:transition-none"
            style={{
              width: `calc((100% - 0.5rem) / ${tabs.length})`,
              transform: `translateX(${index * 100}%)`,
            }}
          />
          {tabs.map(([value, label]) => (
            <button
              key={value}
              type="button"
              role="tab"
              aria-selected={tab === value}
              onClick={() => setTab(value)}
              className={cn(
                "relative z-10 h-8 whitespace-nowrap rounded-full px-3 text-[13px] font-semibold outline-none transition-colors duration-300 focus-visible:ring-2 focus-visible:ring-ring",
                tab === value ? "text-ink" : "text-ink-muted hover:text-ink",
              )}
            >
              {label}
            </button>
          ))}
        </div>
        <p className="tabular min-h-[1.1rem] text-[12.5px] text-ink-muted" aria-live="polite">
          {!loading && !failed ? (
            <>
              {shown.length} {shown.length === 1 ? "person" : "people"}
              {interests.length ? (
                <>
                  {" · "}
                  <button
                    type="button"
                    onClick={() => setInterests([])}
                    className="rounded font-semibold text-[#b9b4ee] underline-offset-2 outline-none hover:underline focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    Clear interests
                  </button>
                </>
              ) : null}
            </>
          ) : null}
        </p>
      </div>

      <div aria-live="polite">
        {loading ? (
          <div aria-busy="true" className="flex flex-col gap-3">
            {[0, 1, 2, 3].map((n) => (
              <div key={n} className="glass-card flex items-center gap-4 rounded-[20px] p-4">
                <Skeleton className="size-11 rounded-full" />
                <div className="flex-1">
                  <Skeleton className="h-5 w-1/3" />
                  <Skeleton className="mt-2 h-4 w-2/3" />
                </div>
              </div>
            ))}
          </div>
        ) : failed ? (
          <LoadError
            error={failed}
            onRetry={
              tab === "connections" ? links.reload : (state as { reload: () => void }).reload
            }
            what="the network"
          />
        ) : (
          <>
            {tab === "all" && !term && !interests.length && everyone.length > 8 ? (
              <div className="mb-4">
                <PeopleToMeet onSent={reloadAll} />
              </div>
            ) : null}
            {shown.length === 0 ? (
              <div className="glass-card rounded-[22px] p-8">
                <p className="text-lg font-semibold">
                  {term
                    ? `Nobody found for \u201c${term}\u201d.`
                    : tab === "connections"
                      ? "No connections yet."
                      : "Nobody to show here yet."}
                </p>
                <p className="mt-1 text-ink-muted">
                  {tab === "connections"
                    ? "Say hi to someone. When they reply, they appear here."
                    : tab === "similar"
                      ? "Add more interests to your profile and similar people will appear."
                      : term || interests.length
                        ? "Try a different search, or clear the interests."
                        : "People show up here when they choose to be visible."}
                </p>
              </div>
            ) : (
              <ul
                key={tab}
                className={cn(
                  "stagger flex flex-col gap-2.5 transition-opacity duration-200",
                  refreshing && "opacity-60",
                )}
              >
                {shown.map((person) => (
                  <PersonRow
                    key={person.user_id}
                    person={person}
                    mine={mine}
                    slug={slug}
                    standing={standingOf(person.user_id, connected, threadMap, sentNow)}
                    onHi={setHi}
                  />
                ))}
              </ul>
            )}
          </>
        )}
      </div>

      <SayHi
        key={hi?.user_id ?? "none"}
        person={
          hi
            ? {
                user_id: hi.user_id,
                display_name: hi.display_name,
                shared_interests: [...(hi.interests ?? []), ...(hi.tech_interests ?? [])].filter(
                  (i) => mine.has(lower(i)),
                ),
              }
            : null
        }
        slug={slug}
        onClose={() => setHi(null)}
        onSent={(id) => {
          setSentNow((old) => new Set(old).add(id));
          setHi(null);
          reloadAll();
        }}
      />
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
        ← Network
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
