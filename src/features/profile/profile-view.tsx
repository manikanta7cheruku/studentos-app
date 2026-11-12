import * as React from "react";
import { ExternalLinkIcon } from "lucide-react";
import { Avatar } from "@/components/app/avatar";
import { Chip, LevelDots } from "./skill-level";

export type ProfileViewData = {
  display_name: string;
  handle: string | null;
  headline: string | null;
  bio: string | null;
  avatar_url: string | null;
  interests: string[];
  tech_interests?: string[];
  excited_by?: string | null;
  career_goal: string | null;
  program?: string | null;
  grad_year?: number | null;
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
    <section className="glass-card rounded-[24px] p-5">
      <h2 className="mb-3.5 flex items-center gap-2 text-[12px] font-bold uppercase tracking-[0.12em] text-ink-muted">
        {title}
        {count !== undefined ? (
          <span className="tabular rounded-full bg-white/[0.08] px-2 py-0.5 text-[11px] text-ink">
            {count}
          </span>
        ) : null}
      </h2>
      <div className="min-w-0">{children}</div>
    </section>
  );
}

/** One profile, read only: the same layout for my own profile and for a classmate's. A glass hero, then cards. */
export function ProfileView({
  person,
  actions,
}: {
  person: ProfileViewData;
  actions?: React.ReactNode;
}) {
  const meta = [person.program, person.grad_year ? `Class of ${person.grad_year}` : null].filter(
    Boolean,
  );
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
            {meta.length ? (
              <p className="mt-1.5 text-[13.5px] text-ink-muted">{meta.join(" · ")}</p>
            ) : null}
          </div>
          {actions ? (
            <div className="mt-2 flex w-full flex-wrap justify-center gap-2 sm:justify-start [&>*]:min-w-[7.5rem] [&>*]:flex-1 sm:[&>*]:flex-none">
              {actions}
            </div>
          ) : null}
        </div>
      </header>

      {person.excited_by ? (
        <Section title="What excites me">
          <p className="max-w-prose text-pretty text-[17px] font-medium leading-snug">
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
        <Section title="Skills" count={person.skills.length}>
          <ul className="grid gap-2.5 sm:grid-cols-2">
            {person.skills.map((skill) => (
              <li
                key={skill.name}
                className="flex flex-col gap-2 rounded-2xl border border-white/[0.08] bg-white/[0.04] px-3.5 py-3"
              >
                <span className="flex items-start justify-between gap-2">
                  <span className="text-[15px] font-semibold leading-snug">{skill.name}</span>
                  {skill.evidence_url ? (
                    <a
                      href={skill.evidence_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      aria-label={`See my work for ${skill.name}`}
                      className="inline-flex size-7 shrink-0 items-center justify-center rounded-full bg-white/[0.08] text-ink-muted outline-none transition-colors hover:bg-white/[0.15] hover:text-ink focus-visible:ring-2 focus-visible:ring-ring"
                    >
                      <ExternalLinkIcon aria-hidden="true" className="size-3.5" />
                    </a>
                  ) : null}
                </span>
                <LevelDots level={skill.level} />
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
    </article>
  );
}
