"use client";

import * as React from "react";
import { PlusIcon, XIcon } from "lucide-react";
import { Input } from "@/components/ui/input";
import { api, type SkillHit } from "@/lib/api/endpoints";

export type PickedSkill = { id: string; name: string };

/** Search the skill list and pick a few. Used for the skills a role asks for. */
export function SkillPicker({
  value,
  onChange,
  max = 10,
  label,
}: {
  value: PickedSkill[];
  onChange: (next: PickedSkill[]) => void;
  max?: number;
  label: string;
}) {
  const [query, setQuery] = React.useState("");
  const [hits, setHits] = React.useState<{ query: string; items: SkillHit[] } | null>(null);
  const trimmed = query.trim();

  React.useEffect(() => {
    if (!trimmed) return;
    const controller = new AbortController();
    const timer = window.setTimeout(() => {
      api.profile
        .searchSkills(trimmed, controller.signal)
        .then((items) => setHits({ query: trimmed, items }))
        .catch(() => undefined);
    }, 250);
    return () => {
      window.clearTimeout(timer);
      controller.abort();
    };
  }, [trimmed]);

  const taken = new Set(value.map((s) => s.id));
  const results = hits && hits.query === trimmed ? hits.items.filter((i) => !taken.has(i.id)) : [];

  return (
    <div className="flex flex-col gap-2">
      {value.length ? (
        <ul className="flex flex-wrap gap-2" aria-label={`${label}, chosen`}>
          {value.map((skill) => (
            <li key={skill.id}>
              <span className="inline-flex min-h-9 items-center gap-1 rounded-full border border-border bg-surface pl-3 text-[15px]">
                {skill.name}
                <button
                  type="button"
                  onClick={() => onChange(value.filter((s) => s.id !== skill.id))}
                  aria-label={`Remove ${skill.name}`}
                  className="inline-flex size-9 items-center justify-center rounded-full text-ink-muted hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  <XIcon aria-hidden="true" className="size-4" />
                </button>
              </span>
            </li>
          ))}
        </ul>
      ) : null}
      {value.length < max ? (
        <>
          <Input
            type="search"
            aria-label={label}
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search skills, for example Python"
            autoComplete="off"
            spellCheck={false}
          />
          {trimmed && results.length ? (
            <ul className="divide-y divide-border rounded-card border border-border bg-surface">
              {results.slice(0, 6).map((hit) => (
                <li key={hit.id}>
                  <button
                    type="button"
                    onClick={() => {
                      onChange([...value, { id: hit.id, name: hit.name }]);
                      setQuery("");
                    }}
                    className="flex min-h-11 w-full items-center justify-between gap-3 px-4 text-left hover:bg-accent-soft focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring"
                  >
                    <span className="text-[15px] font-medium">{hit.name}</span>
                    <PlusIcon aria-hidden="true" className="size-4 text-primary" />
                  </button>
                </li>
              ))}
            </ul>
          ) : null}
        </>
      ) : (
        <p className="text-[14px] text-ink-muted">That is the most skills for one role.</p>
      )}
    </div>
  );
}
