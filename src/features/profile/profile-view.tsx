import * as React from "react";
import { Avatar } from "@/components/app/avatar";
import { Chip, LevelDots } from "./skill-level";

export type ProfileViewData = {
  display_name: string;
  handle: string | null;
  headline: string | null;
  bio: string | null;
  avatar_url: string | null;
  interests: string[];
  career_goal: string | null;
  program?: string | null;
  grad_year?: number | null;
  skills: { name: string; level: number; evidence_url?: string | null }[];
};

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="grid gap-3 border-t border-border py-6 md:grid-cols-[11rem_minmax(0,1fr)] md:gap-8">
      <h2 className="text-[12px] font-semibold uppercase tracking-[0.08em] text-ink-muted md:pt-1">
        {title}
      </h2>
      <div className="min-w-0">{children}</div>
    </section>
  );
}

/** One profile, read only: the same layout for my own profile and for a classmate's. */
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
    <article className="flex flex-col">
      <header className="flex flex-col gap-5 pb-6 sm:flex-row sm:items-center sm:gap-6">
        <Avatar name={person.display_name} src={person.avatar_url} size="xl" />
        <div className="min-w-0 flex-1">
          <h1 className="text-balance text-3xl font-semibold leading-tight tracking-tight sm:text-4xl">
            {person.display_name}
          </h1>
          {person.handle ? <p className="text-[14px] text-ink-muted">@{person.handle}</p> : null}
          {person.headline ? (
            <p className="mt-2 text-pretty text-[16px] leading-snug text-ink">{person.headline}</p>
          ) : null}
          {meta.length ? (
            <p className="mt-1 text-[13.5px] text-ink-muted">{meta.join(" · ")}</p>
          ) : null}
        </div>
        {actions ? <div className="flex flex-wrap gap-3">{actions}</div> : null}
      </header>

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
      {person.interests.length ? (
        <Section title="Interests">
          <ul className="flex flex-wrap gap-2">
            {person.interests.map((interest) => (
              <li key={interest}>
                <Chip>{interest}</Chip>
              </li>
            ))}
          </ul>
        </Section>
      ) : null}
      {person.skills.length ? (
        <Section title="Skills">
          <ul className="divide-y divide-border border-y border-border">
            {person.skills.map((skill) => (
              <li
                key={skill.name}
                className="flex flex-wrap items-center justify-between gap-x-6 gap-y-1 py-3"
              >
                <span className="flex flex-wrap items-baseline gap-x-3">
                  <span className="text-[15px] font-medium">{skill.name}</span>
                  {skill.evidence_url ? (
                    <a
                      href={skill.evidence_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-[13px] font-medium text-primary underline underline-offset-4"
                    >
                      See my work
                    </a>
                  ) : null}
                </span>
                <LevelDots level={skill.level} />
              </li>
            ))}
          </ul>
        </Section>
      ) : null}
    </article>
  );
}
