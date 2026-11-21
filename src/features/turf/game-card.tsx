import Link from "next/link";
import { CalendarClockIcon, MapPinIcon, TrophyIcon } from "lucide-react";
import { cn } from "cn";
import { OutsideBadge } from "@/components/app/outside-badge";
import type { Game } from "@/lib/api/endpoints";
import { formatInr } from "@/lib/format";
import { statusOf, titleCase, whenParts } from "./game-format";

const TONE = {
  good: "border-[#8f86f0]/40 bg-[#8f86f0]/[0.16] text-[#dcd8ff]",
  quiet: "border-white/[0.12] bg-white/[0.06] text-ink/80",
  warn: "border-white/[0.12] bg-white/[0.04] text-ink-muted",
} as const;

/** The one short label: how many places are left, or where I stand. */
export function StatusPill({ game, className }: { game: Game; className?: string }) {
  const status = statusOf(game);
  return (
    <span
      className={cn(
        "inline-flex h-7 shrink-0 items-center rounded-full border px-3 text-[12px] font-semibold",
        TONE[status.tone],
        className,
      )}
    >
      {status.text}
    </span>
  );
}

/** A thin bar of how full the game is. */
export function FillBar({ game }: { game: Pick<Game, "joined_count" | "capacity"> }) {
  const share = Math.min(game.joined_count / game.capacity, 1);
  return (
    <span aria-hidden="true" className="block h-1 overflow-hidden rounded-full bg-white/[0.1]">
      <span
        className="block h-full rounded-full bg-[#9a92f2] transition-[width] duration-500"
        style={{ width: `${share * 100}%` }}
      />
    </span>
  );
}

export function priceText(game: Pick<Game, "price_inr">): string {
  return game.price_inr ? `${formatInr(game.price_inr)} each` : "Free";
}

/** One game in a list: the sport and the venue, when, how full it is, what it costs, and where I stand. */
export function GameCard({
  game,
  slug,
  outside = false,
}: {
  game: Game;
  slug: string;
  outside?: boolean;
}) {
  const when = whenParts(game);
  return (
    <li className="group lift glass-card relative rounded-[22px] focus-within:ring-2 focus-within:ring-ring">
      <article className="flex flex-col gap-3.5 p-4">
        <div className="flex items-start gap-3">
          <span
            aria-hidden="true"
            className="inline-flex size-11 shrink-0 items-center justify-center rounded-[14px] border border-white/[0.14] bg-white/[0.07] text-ink/80 shadow-[inset_0_1px_0_rgba(255,255,255,0.18)]"
          >
            <TrophyIcon className="size-5" />
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-ink-muted">
              {titleCase(game.sport)}
            </p>
            <h3 className="text-[16.5px] font-bold leading-snug">
              <Link
                href={`/c/${slug}/turf/${game.id}`}
                className="break-words outline-none after:absolute after:inset-0 after:rounded-[22px]"
              >
                {game.venue}
              </Link>
            </h3>
            {game.area ? (
              <p className="mt-0.5 flex items-center gap-1 text-[13px] text-ink-muted">
                <MapPinIcon aria-hidden="true" className="size-3.5 shrink-0" />
                <span className="truncate">{game.area}</span>
              </p>
            ) : null}
          </div>
          <div className="flex shrink-0 flex-col items-end gap-1.5">
            <StatusPill game={game} />
            {outside ? <OutsideBadge className="h-6 px-2.5 text-[11px]" /> : null}
          </div>
        </div>
        <p className="flex items-center gap-2 text-[14px] font-medium">
          <CalendarClockIcon aria-hidden="true" className="size-4 shrink-0 text-ink-muted" />
          <span>
            {when.day} <span className="text-ink-muted">· {when.time}</span>
          </span>
        </p>
        <div className="flex flex-col gap-2">
          <FillBar game={game} />
          <p className="tabular flex items-center justify-between text-[13px] text-ink-muted">
            <span>
              {game.joined_count} of {game.capacity} in
              {game.waitlist_count > 0 ? ` · ${game.waitlist_count} waiting` : ""}
            </span>
            <span className="font-semibold text-ink/90">{priceText(game)}</span>
          </p>
        </div>
      </article>
    </li>
  );
}
