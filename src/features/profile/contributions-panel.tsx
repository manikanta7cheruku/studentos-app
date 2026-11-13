import * as React from "react";
import {
  CalendarDaysIcon,
  FlameIcon,
  MedalIcon,
  MessageCircleHeartIcon,
  MessageCircleIcon,
  ScaleIcon,
  UserPlusIcon,
  UsersIcon,
} from "lucide-react";
import { cn } from "cn";
import { badgesFor, nextBadge, type Counts } from "./badges";

type Tile = { label: string; value: number; icon: React.ReactNode; tint: string };

function Tiles({ title, tiles, columns }: { title: string; tiles: Tile[]; columns: string }) {
  return (
    <div>
      <p className="mb-2 text-[11.5px] font-bold uppercase tracking-[0.12em] text-ink-muted">
        {title}
      </p>
      <ul className={cn("grid gap-2", columns)}>
        {tiles.map((tile) => (
          <li
            key={tile.label}
            className="relative overflow-hidden rounded-[18px] border border-white/[0.09] bg-white/[0.04] px-3 py-3"
          >
            <span
              aria-hidden="true"
              className={cn(
                "inline-flex size-7 items-center justify-center rounded-[10px] bg-gradient-to-br text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.35)] [&_svg]:size-3.5",
                tile.tint,
                tile.value === 0 && "opacity-40 saturate-50",
              )}
            >
              {tile.icon}
            </span>
            <p
              className={cn(
                "tabular mt-2 font-heading text-[1.55rem] font-extrabold leading-none",
                tile.value === 0 && "text-ink-muted/70",
              )}
            >
              {tile.value}
            </p>
            <p className="mt-1 text-[11.5px] text-ink-muted">{tile.label}</p>
          </li>
        ))}
      </ul>
    </div>
  );
}

/**
 * Everything a person gave, at the end of the profile: two small groups of numbers, the badges they earned as medals, and how far
 * they are from the next one. On my own page an empty panel says how to begin; on someone else's, zeros just show as zeros.
 */
export function ContributionsPanel({ counts, isSelf }: { counts: Counts; isSelf: boolean }) {
  const badges = badgesFor(counts);
  const next = nextBadge(counts);
  const empty = Object.values(counts).every((value) => value === 0);
  return (
    <section
      aria-labelledby="contributions"
      className="glass-card relative overflow-hidden rounded-[26px] p-5"
    >
      <span
        aria-hidden="true"
        className="bg-brand pointer-events-none absolute -left-12 -top-14 size-40 rounded-full opacity-25 blur-3xl"
      />
      <div className="relative flex items-end justify-between gap-3">
        <div>
          <h2
            id="contributions"
            className="font-heading text-[1.25rem] font-extrabold leading-tight"
          >
            Contributions
          </h2>
          <p className="text-[12.5px] text-ink-muted">
            {isSelf ? "What you have given back." : "What they have given back."}
          </p>
        </div>
        {badges.length ? (
          <span className="tabular inline-flex h-7 shrink-0 items-center gap-1.5 rounded-full border border-[#f0c36a]/40 bg-[#f0c36a]/10 px-3 text-[12px] font-bold text-[#f6dca0]">
            <MedalIcon aria-hidden="true" className="size-3.5" /> {badges.length}{" "}
            {badges.length === 1 ? "badge" : "badges"}
          </span>
        ) : null}
      </div>

      <div className="relative mt-4 flex flex-col gap-4">
        <Tiles
          title="Speaking up"
          columns="grid-cols-4"
          tiles={[
            {
              label: "Buzz",
              value: counts.buzz,
              icon: <MessageCircleHeartIcon />,
              tint: "from-[#d6549a] to-[#e0866a]",
            },
            {
              label: "Replies",
              value: counts.replies,
              icon: <MessageCircleIcon />,
              tint: "from-[#2f9fd0] to-[#4f6fe0]",
            },
            {
              label: "Debates",
              value: counts.debates,
              icon: <ScaleIcon />,
              tint: "from-[#d99a3a] to-[#e0566a]",
            },
            {
              label: "Upvotes",
              value: counts.upvotes,
              icon: <FlameIcon />,
              tint: "from-[#e0866a] to-[#d6549a]",
            },
          ]}
        />
        <Tiles
          title="Making things happen"
          columns="grid-cols-3"
          tiles={[
            {
              label: "Plans",
              value: counts.plans,
              icon: <UsersIcon />,
              tint: "from-[#5b54d6] to-[#8a5fd0]",
            },
            {
              label: "Events",
              value: counts.events,
              icon: <CalendarDaysIcon />,
              tint: "from-[#2fb98a] to-[#2f90b9]",
            },
            {
              label: "Friends invited",
              value: counts.invited,
              icon: <UserPlusIcon />,
              tint: "from-[#7a5fd6] to-[#4f6fe0]",
            },
          ]}
        />
      </div>

      {badges.length ? (
        <ul className="relative mt-4 flex flex-wrap gap-2" aria-label="Badges">
          {badges.map((badge) => (
            <li
              key={badge.key}
              title={badge.text}
              className="inline-flex h-9 items-center gap-1.5 rounded-full border border-[#f0c36a]/35 bg-gradient-to-br from-[#f0c36a]/20 to-[#e0866a]/15 pl-2.5 pr-3.5 text-[12.5px] font-bold shadow-[inset_0_1px_0_rgba(255,255,255,0.2)]"
            >
              <MedalIcon aria-hidden="true" className="size-4 text-[#f0c36a]" />
              {badge.label}
            </li>
          ))}
        </ul>
      ) : null}

      {next ? (
        <div className="relative mt-4 rounded-[18px] border border-white/[0.09] bg-white/[0.03] p-3.5">
          <div className="flex items-center justify-between gap-3 text-[13px]">
            <span className="min-w-0">
              <span className="text-ink-muted">Next badge · </span>
              <b>{next.label}</b>
            </span>
            <span className="tabular shrink-0 text-ink-muted">
              {next.have} / {next.need}
            </span>
          </div>
          <div
            role="progressbar"
            aria-label={`Progress to ${next.label}`}
            aria-valuemin={0}
            aria-valuemax={next.need}
            aria-valuenow={next.have}
            className="mt-2 h-2 overflow-hidden rounded-full bg-white/[0.08]"
          >
            <span
              className="bg-brand block h-full rounded-full transition-[width] duration-700 ease-out"
              style={{
                width: `${Math.max(next.have > 0 ? 6 : 0, Math.round((next.have / next.need) * 100))}%`,
              }}
            />
          </div>
          <p className="mt-2 text-[12.5px] text-ink-muted">
            {isSelf ? `${next.hint}` : `${next.remaining} to go.`}
          </p>
        </div>
      ) : null}

      {empty && isSelf ? (
        <p className="relative mt-4 text-[13.5px] leading-snug text-ink-muted">
          Nothing yet. Post a buzz, join a debate or start a plan, and it shows up here.
        </p>
      ) : null}
    </section>
  );
}
