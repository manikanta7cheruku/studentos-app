import * as React from "react";
import Link from "next/link";
import { ExternalLinkIcon } from "lucide-react";
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
      <h2 className="mb-2.5 flex items-center gap-2 text-[12px] font-semibold uppercase tracking-[0.1em] text-ink-muted">
        {title}
        {count !== undefined ? <span className="tabular text-ink-muted/80">{count}</span> : null}
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

/** One profile, read only: the same layout for my own profile and for a classmate's. A glass hero, then cards. */
export function ProfileView({
  person,
  actions,
  isSelf = false,
  connectionsHref,
}: {
  person: ProfileViewData;
  actions?: React.ReactNode;
  /** My own page: the Contributions section is always there, and says how to start when it is empty. */
  isSelf?: boolean;
  /** Where the followers and following lists are (my own page only). */
  connectionsHref?: string;
}) {
  const education = [
    person.college_name,
    person.program,
    person.grad_year ? `Class of ${person.grad_year}` : null,
  ].filter(Boolean);
  const meta = [
    person.gender ? GENDER_LABEL[person.gender] : null,
    person.age ? `${person.age} years` : null,
  ].filter(Boolean);
  const counts = person.contributions ?? null;
  return (
    <article className="flex flex-col gap-4">
      <header className="glass-card relative overflow-hidden rounded-[28px]">
        {/* A soft colour behind the picture, so the top is not flat. */}
        <div
          aria-hidden="true"
          className="bg-brand h-24 opacity-70 [mask-image:linear-gradient(to_bottom,black,transparent)]"
        />
        <div className="-mt-12 flex flex-col items-center gap-3 px-5 pb-6 text-center sm:items-start sm:text-left">
          <span className="rounded-full p-1 ring-4 ring-[#0b0b10]/60">
            <Avatar name={person.display_name} src={person.avatar_url} size="xl" />
          </span>
          <div className="min-w-0">
            <h1 className="text-balance text-[1.9rem] font-extrabold leading-tight tracking-tight">
              {person.display_name}
            </h1>
            {person.handle ? <p className="text-[14px] text-ink-muted">@{person.handle}</p> : null}
            {person.headline ? (
              <p className="mt-2 text-pretty text-[15.5px] leading-snug text-ink">
                {person.headline}
              </p>
            ) : null}
            {education.length ? (
              <p className="mt-1.5 text-[13.5px] font-medium text-ink/85">
                {education.join(" · ")}
              </p>
            ) : null}
            {meta.length ? (
              <p className="mt-0.5 text-[13px] text-ink-muted">{meta.join(" · ")}</p>
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
            <div className="mt-2 flex w-full flex-wrap justify-center gap-2 sm:justify-start [&>*]:min-w-[7.5rem] [&>*]:flex-1 sm:[&>*]:flex-none">
              {actions}
            </div>
          ) : null}
        </div>
      </header>

      <div className="glass-card divide-y divide-white/[0.07] overflow-hidden rounded-[24px]">
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
        {person.interests.length || person.tech_interests?.length ? (
          <Section title="Interests">
            <div className="flex flex-col gap-4">
              {person.interests.length ? (
                <div>
                  <p className="mb-2 text-[13px] font-semibold text-ink/90">For fun</p>
                  <ul className="flex flex-wrap gap-2">
                    {person.interests.map((interest) => (
                      <li key={interest}>
                        <Chip>{interest}</Chip>
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null}
              {person.tech_interests?.length ? (
                <div>
                  <p className="mb-2 text-[13px] font-semibold text-ink/90">Tech and career</p>
                  <ul className="flex flex-wrap gap-2">
                    {person.tech_interests.map((interest) => (
                      <li key={interest}>
                        <Chip>{interest}</Chip>
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
