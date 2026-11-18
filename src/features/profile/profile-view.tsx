import * as React from "react";
import Link from "next/link";
import { CheckIcon, ExternalLinkIcon } from "lucide-react";
import { Avatar } from "@/components/app/avatar";
import { cn } from "cn";
import type { Counts } from "./standing";
import { ContributionsPanel } from "./contributions-panel";
import { Chip, levelLabel } from "./skill-level";

export type ProfileViewData = {
  display_name: string;
  handle: string | null;
  headline: string | null;
  bio: string | null;
  avatar_url: string | null;
  interests: string[];
  tech_interests?: string[];
  excited_by?: string | null;
  /** Only set when the person chose to show it. */
  gender?: string | null;
  /** Age in years. Only set when the person chose to show it. */
  age?: number | null;
  career_goal: string | null;
  college_name?: string | null;
  program?: string | null;
  grad_year?: number | null;
  place?: string | null;
  /** Only my own page has these (nobody else sees who follows whom). */
  followers?: number;
  following?: number;
  contributions?: Counts | null;
  skills: { name: string; level: number; evidence_url?: string | null }[];
};

function Section({
  title,
  count,
  children,
}: {
  title: string;
  count?: number;
  children: React.ReactNode;
}) {
  return (
    <section className="px-5 py-5 sm:px-6">
      <h2 className="mb-3.5 flex items-center justify-between gap-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-ink-muted">
        {title}
        {count !== undefined ? (
          <span className="tabular inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-white/[0.08] px-1.5 text-[11px] font-semibold tracking-normal text-ink/75">
            {count}
          </span>
        ) : null}
      </h2>
      <div className="min-w-0">{children}</div>
    </section>
  );
}

const GENDER_LABEL: Record<string, string> = {
  woman: "Woman",
  man: "Man",
  non_binary: "Non-binary",
};

function StrengthChip({
  skill,
}: {
  skill: { name: string; level: number; evidence_url?: string | null };
}) {
  const body = (
    <>
      <span className="text-[13.5px] font-semibold">{skill.name}</span>
      <span aria-hidden="true" className="flex gap-[3px]">
        {[1, 2, 3, 4, 5].map((n) => (
          <span
            key={n}
            className={cn(
              "size-1.5 rounded-full",
              n <= skill.level ? "bg-[#a9a2f5]" : "bg-white/[0.14]",
            )}
          />
        ))}
      </span>
      <span className="sr-only">{levelLabel(skill.level)}</span>
      {skill.evidence_url ? (
        <ExternalLinkIcon aria-hidden="true" className="size-3 text-ink-muted" />
      ) : null}
    </>
  );
  const cls =
    "inline-flex h-9 items-center gap-2.5 rounded-full border border-white/10 bg-white/[0.05] px-3.5 outline-none";
  return skill.evidence_url ? (
    <a
      href={skill.evidence_url}
      target="_blank"
      rel="noopener noreferrer"
      aria-label={`${skill.name}, ${levelLabel(skill.level)}. See my work`}
      className={cn(
        cls,
        "transition-colors hover:bg-white/[0.1] focus-visible:ring-2 focus-visible:ring-ring",
      )}
    >
      {body}
    </a>
  ) : (
    <span title={levelLabel(skill.level)} className={cls}>
      {body}
    </span>
  );
}

/** An interest. One you share with the person looking is lit in the app's violet with a tick. */
function InterestChip({ name, shared }: { name: string; shared: boolean }) {
  return (
    <Chip
      className={cn(
        "h-[30px] min-h-0 gap-1.5 px-3 text-[12.5px] text-ink/90",
        shared && "border-[#a99fff]/40 bg-[#7a6ef0]/20 text-[#e4e0ff]",
      )}
    >
      {shared ? <CheckIcon aria-hidden="true" className="size-3" /> : null}
      {name}
    </Chip>
  );
}

/** One profile, read only: the same layout for my own profile and for a classmate's. A glass hero, then cards. */
/**
 * A username-like name with no spaces ("manikantathadigoppula26") cannot wrap nicely, so it is sized to fit the card on one
 * line: the width of the screen less the page and card padding, divided by about 0.58 em per letter. Names with spaces wrap
 * normally and keep the usual size.
 */
function longWordSize(name: string): React.CSSProperties | undefined {
  const word = name.trim();
  if (/\s/.test(word) || word.length <= 13) return undefined;
  return {
    fontSize: `min(1.9rem, max(1.05rem, calc((100vw - 4.5rem) / ${(word.length * 0.58).toFixed(2)})))`,
  };
}

export function ProfileView({
  person,
  actions,
  isSelf = false,
  connectionsHref,
  campus,
  commonWith,
}: {
  person: ProfileViewData;
  actions?: React.ReactNode;
  /** My own page: the Contributions section is always there, and says how to start when it is empty. */
  isSelf?: boolean;
  /** Where the followers and following lists are (my own page only). */
  connectionsHref?: string;
  /** The Campus part (college, students from it). It sits first in the details card. */
  campus?: React.ReactNode;
  /** The viewer's own interests, in lower case: the ones this person shares are lit up. Not given on my own page. */
  commonWith?: string[];
}) {
  const meta = [
    person.gender ? GENDER_LABEL[person.gender] : null,
    person.age ? `${person.age} years` : null,
  ].filter(Boolean);
  const common = new Set(commonWith ?? []);
  const isCommon = (interest: string) => common.has(interest.trim().toLowerCase());
  const shared = [...person.interests, ...(person.tech_interests ?? [])].filter(isCommon).length;
  const interestCount = person.interests.length + (person.tech_interests?.length ?? 0);
  const counts = person.contributions ?? null;
  return (
    <article className="flex flex-col gap-4">
      <header className="glass-card relative overflow-hidden rounded-[28px]">
        <div className="relative flex flex-col items-center gap-3 px-5 pt-8 pb-5 text-center sm:items-start sm:text-left">
          <span className="rounded-full p-1 ring-4 ring-[#0b0b10]/60">
            <Avatar name={person.display_name} src={person.avatar_url} size="xl" />
          </span>
          <div className="w-full min-w-0 max-w-full">
            {/* A long name or username with no spaces has to break rather than run off the card, and it gets a little smaller on
                a narrow phone so most names still fit on one line. */}
            <h1
              className="text-balance text-[clamp(1.45rem,6.6vw,1.9rem)] font-extrabold leading-tight tracking-tight [overflow-wrap:anywhere]"
              style={longWordSize(person.display_name)}
            >
              {person.display_name}
            </h1>
            {person.handle ? (
              <p className="mt-0.5 text-[14px] text-ink-muted [overflow-wrap:anywhere]">
                @{person.handle}
              </p>
            ) : null}
            {person.headline ? (
              <p className="mt-2 text-pretty text-[15.5px] leading-snug text-ink [overflow-wrap:anywhere]">
                {person.headline}
              </p>
            ) : null}
            {meta.length ? (
              <p className="mt-0.5 text-balance text-[13px] text-ink-muted [overflow-wrap:anywhere]">
                {meta.join(" · ")}
              </p>
            ) : null}
            {person.followers !== undefined && connectionsHref ? (
              <p className="tabular mt-2 text-[13px] text-ink-muted">
                <Link
                  href={`${connectionsHref}?kind=followers`}
                  className="rounded outline-none hover:underline focus-visible:ring-2 focus-visible:ring-ring"
                >
                  <b className="text-ink">{person.followers}</b> followers
                </Link>{" "}
                ·{" "}
                <Link
                  href={`${connectionsHref}?kind=following`}
                  className="rounded outline-none hover:underline focus-visible:ring-2 focus-visible:ring-ring"
                >
                  <b className="text-ink">{person.following ?? 0}</b> following
                </Link>
              </p>
            ) : null}
          </div>
          {actions ? (
            <div className="mt-1 flex w-full flex-wrap justify-center gap-2 sm:justify-start [&>*]:!h-8 [&>*]:min-w-[5.25rem] [&>*]:flex-none [&>*]:!rounded-[10px] [&>*]:!text-[13px]">
              {actions}
            </div>
          ) : null}
        </div>
      </header>

      <div className="glass-card divide-y divide-white/[0.07] overflow-hidden rounded-[24px]">
        {campus ? <section className="px-5 py-5 sm:px-6">{campus}</section> : null}
        {person.excited_by ? (
          <Section title="What excites me">
            <p className="max-w-prose text-pretty text-[16px] leading-relaxed">
              {person.excited_by}
            </p>
          </Section>
        ) : null}
        {person.bio ? (
          <Section title="About">
            <p className="max-w-prose whitespace-pre-line text-[15px] leading-relaxed">
              {person.bio}
            </p>
          </Section>
        ) : null}
        {person.career_goal ? (
          <Section title="Career goal">
            <p className="max-w-prose text-[15px] leading-relaxed">{person.career_goal}</p>
          </Section>
        ) : null}
        {person.skills.length ? (
          <Section title="Strengths" count={person.skills.length}>
            <ul className="flex flex-wrap gap-2">
              {[...person.skills]
                .sort((x, y) => y.level - x.level)
                .map((skill) => (
                  <li key={skill.name}>
                    <StrengthChip skill={skill} />
                  </li>
                ))}
            </ul>
          </Section>
        ) : null}
        {interestCount ? (
          <Section title="Interests" count={interestCount}>
            {shared > 0 ? (
              <p className="mb-3.5 inline-flex items-center gap-1.5 text-[12.5px] font-semibold text-[#cfcaff]">
                <CheckIcon aria-hidden="true" className="size-3.5" />
                {shared} in common with you
              </p>
            ) : null}
            <div className="flex flex-col gap-4">
              {person.interests.length ? (
                <div>
                  <p className="mb-2 text-[12px] text-ink-muted">For fun</p>
                  <ul className="flex flex-wrap gap-2">
                    {person.interests.map((interest) => (
                      <li key={interest}>
                        <InterestChip name={interest} shared={isCommon(interest)} />
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null}
              {person.tech_interests?.length ? (
                <div>
                  <p className="mb-2 text-[12px] text-ink-muted">Tech and career</p>
                  <ul className="flex flex-wrap gap-2">
                    {person.tech_interests.map((interest) => (
                      <li key={interest}>
                        <InterestChip name={interest} shared={isCommon(interest)} />
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null}
            </div>
          </Section>
        ) : null}
      </div>
      {counts ? <ContributionsPanel counts={counts} isSelf={isSelf} /> : null}
    </article>
  );
}
