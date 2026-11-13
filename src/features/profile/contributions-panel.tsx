import * as React from "react";
import { LockIcon, MedalIcon } from "lucide-react";
import { cn } from "cn";
import { badgesOf, standingOf, type Counts, type Standing } from "./standing";

/** The level as a ring that fills towards the next one, with the level number in the middle. */
function Emblem({ standing }: { standing: Standing }) {
  const id = React.useId();
  const size = 92;
  const stroke = 7;
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const [from, to] = standing.level.tint;
  return (
    <svg
      width={size}
      height={size}
      viewBox={`0 0 ${size} ${size}`}
      role="img"
      aria-label={`Level ${standing.level.n}, ${standing.level.name}`}
      className="shrink-0"
    >
      <defs>
        <linearGradient id={`${id}-g`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor={from} />
          <stop offset="100%" stopColor={to} />
        </linearGradient>
        <radialGradient id={`${id}-f`} cx="50%" cy="35%" r="70%">
          <stop offset="0%" stopColor={from} stopOpacity="0.32" />
          <stop offset="100%" stopColor={to} stopOpacity="0.06" />
        </radialGradient>
      </defs>
      <circle cx={size / 2} cy={size / 2} r={radius - stroke / 2 - 2} fill={`url(#${id}-f)`} />
      <circle
        cx={size / 2}
        cy={size / 2}
        r={radius}
        fill="none"
        stroke="rgba(255,255,255,0.1)"
        strokeWidth={stroke}
      />
      <circle
        cx={size / 2}
        cy={size / 2}
        r={radius}
        fill="none"
        stroke={`url(#${id}-g)`}
        strokeWidth={stroke}
        strokeLinecap="round"
        strokeDasharray={`${circumference * Math.max(standing.progress, standing.score > 0 ? 0.03 : 0)} ${circumference}`}
        transform={`rotate(-90 ${size / 2} ${size / 2})`}
        className="transition-[stroke-dasharray] duration-1000 ease-out"
      />
      <text
        x="50%"
        y="49%"
        textAnchor="middle"
        dominantBaseline="central"
        fill="white"
        fontSize="30"
        fontWeight="800"
        fontFamily="var(--font-bricolage), sans-serif"
      >
        {standing.level.n}
      </text>
      <text
        x="50%"
        y="72%"
        textAnchor="middle"
        fill="rgba(255,255,255,0.6)"
        fontSize="8.5"
        fontWeight="700"
        letterSpacing="1.6"
      >
        LEVEL
      </text>
    </svg>
  );
}

function nextLine(standing: Standing): string {
  const { next, pointsToNext, daysToNext } = standing;
  if (!next) return "The highest level. It stays with real contribution.";
  const parts: string[] = [];
  if (pointsToNext > 0)
    parts.push(`${pointsToNext} more ${pointsToNext === 1 ? "point" : "points"}`);
  if (daysToNext > 0)
    parts.push(`${daysToNext} more ${daysToNext === 1 ? "day" : "days"} as a member`);
  return `${next.name} needs ${parts.join(" and ")}.`;
}

/**
 * A person's standing at the end of the profile. It is earned, not handed out: the level comes from what other people got from
 * the person (and needs time as a member), and every badge is rare and shows exactly what it takes. Same panel for my own page
 * and for anyone else's.
 */
export function ContributionsPanel({ counts, isSelf }: { counts: Counts; isSelf: boolean }) {
  const standing = standingOf(counts);
  const badges = badgesOf(counts);
  const earned = badges.filter((badge) => badge.earned);
  const [from, to] = standing.level.tint;
  return (
    <section
      aria-labelledby="contributions"
      className="glass-card relative overflow-hidden rounded-[26px]"
    >
      <span
        aria-hidden="true"
        className="pointer-events-none absolute -left-16 -top-20 size-56 rounded-full opacity-25 blur-3xl"
        style={{ background: `linear-gradient(135deg, ${from}, ${to})` }}
      />

      <div className="relative flex items-center gap-4 px-5 pb-5 pt-5">
        <Emblem standing={standing} />
        <div className="min-w-0 flex-1">
          <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-ink-muted">
            Standing
          </p>
          <h2
            id="contributions"
            className="font-heading text-[1.55rem] font-extrabold leading-tight tracking-tight"
          >
            {standing.level.name}
          </h2>
          <p className="tabular text-[13px] text-ink-muted">
            <b className="text-ink">{standing.score}</b> points · {counts.member_days}{" "}
            {counts.member_days === 1 ? "day" : "days"} on StudentOS
          </p>
        </div>
      </div>

      <p className="relative border-t border-white/[0.07] px-5 py-3 text-[13px] leading-snug text-ink-muted">
        {isSelf ? nextLine(standing) : `Next: ${nextLine(standing)}`}
      </p>

      <div className="relative border-t border-white/[0.07] px-5 py-4">
        <h3 className="mb-1 text-[12px] font-bold uppercase tracking-[0.12em] text-ink-muted">
          How it is earned
        </h3>
        <ul className="divide-y divide-white/[0.06]">
          {standing.rows.map((row) => (
            <li key={row.key} className="flex items-center justify-between gap-4 py-2.5">
              <div className="min-w-0">
                <p className="text-[14px] font-semibold leading-tight">{row.label}</p>
                <p className="mt-0.5 text-[12.5px] leading-snug text-ink-muted">{row.detail}</p>
              </div>
              <span
                className={cn(
                  "tabular shrink-0 text-[15px] font-bold",
                  row.points === 0 && "text-ink-muted/60",
                )}
              >
                {row.points > 0 ? `+${row.points}` : "0"}
              </span>
            </li>
          ))}
        </ul>
      </div>

      <div className="relative border-t border-white/[0.07] px-5 py-4">
        <div className="mb-2.5 flex items-center justify-between">
          <h3 className="text-[12px] font-bold uppercase tracking-[0.12em] text-ink-muted">
            Badges
          </h3>
          <span className="tabular text-[12px] text-ink-muted">
            {earned.length} of {badges.length}
          </span>
        </div>
        <ul className="grid grid-cols-2 gap-2.5">
          {badges.map((badge) => (
            <li
              key={badge.key}
              className={cn(
                "rounded-[18px] p-px",
                badge.earned
                  ? "bg-gradient-to-br from-[#f6dca0] via-[#e0866a] to-[#d6549a]"
                  : "bg-white/[0.08]",
              )}
            >
              <div
                className={cn(
                  "flex h-full flex-col gap-2 rounded-[17px] p-3",
                  badge.earned ? "bg-[#17141f]" : "bg-[#121218]",
                )}
              >
                <span
                  aria-hidden="true"
                  className={cn(
                    "inline-flex size-9 items-center justify-center rounded-full",
                    badge.earned
                      ? "bg-gradient-to-br from-[#f6dca0] to-[#e0866a] text-[#3a2410] shadow-[inset_0_1px_0_rgba(255,255,255,0.5)]"
                      : "border border-dashed border-white/20 text-ink-muted/70",
                  )}
                >
                  {badge.earned ? (
                    <MedalIcon className="size-[18px]" />
                  ) : (
                    <LockIcon className="size-4" />
                  )}
                </span>
                <div className="min-w-0">
                  <p
                    className={cn(
                      "text-[13.5px] font-bold leading-tight",
                      !badge.earned && "text-ink/80",
                    )}
                  >
                    {badge.label}
                  </p>
                  <p className="mt-0.5 text-[11.5px] leading-snug text-ink-muted">{badge.text}</p>
                </div>
                {!badge.earned ? (
                  <div className="mt-auto">
                    <div
                      role="progressbar"
                      aria-label={`Progress to ${badge.label}`}
                      aria-valuemin={0}
                      aria-valuemax={100}
                      aria-valuenow={Math.round(badge.progress * 100)}
                      className="h-1 overflow-hidden rounded-full bg-white/[0.08]"
                    >
                      <span
                        className="block h-full rounded-full bg-white/40"
                        style={{ width: `${Math.round(badge.progress * 100)}%` }}
                      />
                    </div>
                    <p className="tabular mt-1 text-[11px] text-ink-muted">{badge.progressText}</p>
                  </div>
                ) : (
                  <p className="mt-auto text-[11px] font-semibold uppercase tracking-wide text-[#f0c36a]">
                    Earned
                  </p>
                )}
              </div>
            </li>
          ))}
        </ul>
      </div>

      <p className="relative border-t border-white/[0.07] px-5 py-3 text-[12px] leading-snug text-ink-muted">
        Standing comes from what other people got from you: their upvotes, debates and plans that
        drew a crowd, friends who joined. Posting a lot does not raise it, and higher levels take
        time.
      </p>
    </section>
  );
}
