"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { PlusIcon, Trash2Icon } from "lucide-react";
import { Banner } from "@/components/ui/banner";
import { Button } from "@/components/ui/button";
import { FormField } from "@/components/ui/form-field";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { LoadError } from "@/components/app/load-error";
import { PageHeader } from "@/components/app/page-header";
import { Spinner } from "@/components/app/spinner";
import { ApiError, friendlyMessage } from "@/lib/api-client";
import { api, type MySkill, type SkillHit } from "@/lib/api/endpoints";
import { useLoad } from "@/lib/use-load";
import { useCollege } from "@/features/college";
import { LEVEL_LABELS } from "./skill-level";

const MAX_SKILLS = 50;

type Row = { skill_id: string; name: string; level: number; evidence_url: string };

const fromServer = (skills: MySkill[]): Row[] =>
  skills.map((s) => ({
    skill_id: s.skill_id,
    name: s.name,
    level: s.level,
    evidence_url: s.evidence_url ?? "",
  }));

/** The list the server expects: only links that start with https:// are sent, empty ones are left out. */
export function skillsPayload(rows: Row[]) {
  return rows.map((row) => ({
    skill_id: row.skill_id,
    level: row.level,
    ...(row.evidence_url.trim() ? { evidence_url: row.evidence_url.trim() } : {}),
  }));
}

function SkillSearch({ taken, onAdd }: { taken: Set<string>; onAdd: (skill: SkillHit) => void }) {
  const [query, setQuery] = React.useState("");
  const [hits, setHits] = React.useState<{ query: string; items: SkillHit[] } | null>(null);
  const [failed, setFailed] = React.useState(false);
  const trimmed = query.trim();

  React.useEffect(() => {
    if (!trimmed) return;
    const controller = new AbortController();
    const timer = window.setTimeout(() => {
      api.profile
        .searchSkills(trimmed, controller.signal)
        .then((items) => {
          setFailed(false);
          setHits({ query: trimmed, items });
        })
        .catch(() => {
          if (!controller.signal.aborted) setFailed(true);
        });
    }, 250);
    return () => {
      window.clearTimeout(timer);
      controller.abort();
    };
  }, [trimmed]);

  const results = hits && hits.query === trimmed ? hits.items.filter((i) => !taken.has(i.id)) : [];
  const settled = hits?.query === trimmed;

  return (
    <div className="flex flex-col gap-3">
      <FormField label="Add a skill" help="Search the list, for example Python or Figma.">
        <Input
          type="search"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          autoComplete="off"
          spellCheck={false}
          placeholder="Search skills"
        />
      </FormField>
      {trimmed ? (
        <div aria-live="polite">
          {failed ? (
            <p className="text-[13.5px] text-danger">We could not search just now. Try again.</p>
          ) : !settled ? (
            <p className="text-[13.5px] text-ink-muted">Searching…</p>
          ) : results.length === 0 ? (
            <p className="text-[13.5px] text-ink-muted">
              No skill found for &ldquo;{trimmed}&rdquo;. Try another word.
            </p>
          ) : (
            <ul className="divide-y divide-border rounded-card border border-border bg-surface">
              {results.slice(0, 8).map((hit) => (
                <li key={hit.id}>
                  <button
                    type="button"
                    onClick={() => {
                      onAdd(hit);
                      setQuery("");
                    }}
                    className="flex min-h-12 w-full items-center justify-between gap-3 px-4 text-left hover:bg-accent-soft focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring"
                  >
                    <span>
                      <span className="text-[14px] font-medium">{hit.name}</span>
                      {hit.category ? (
                        <span className="ml-2 text-[13px] text-ink-muted">{hit.category}</span>
                      ) : null}
                    </span>
                    <span className="inline-flex items-center gap-1 text-[13px] font-semibold text-primary">
                      <PlusIcon aria-hidden="true" className="size-4" /> Add
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      ) : null}
    </div>
  );
}

function SkillsEditor({ initial }: { initial: MySkill[] }) {
  const { slug } = useCollege();
  const router = useRouter();
  const [rows, setRows] = React.useState<Row[]>(() => fromServer(initial));
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [fields, setFields] = React.useState<Record<string, string>>({});
  const [saved, setSaved] = React.useState(false);

  const taken = React.useMemo(() => new Set(rows.map((r) => r.skill_id)), [rows]);
  const dirty =
    JSON.stringify(skillsPayload(rows)) !== JSON.stringify(skillsPayload(fromServer(initial)));

  function update(id: string, patch: Partial<Row>) {
    setSaved(false);
    setRows((current) => current.map((r) => (r.skill_id === id ? { ...r, ...patch } : r)));
  }

  async function save() {
    if (busy) return;
    const problems: Record<string, string> = {};
    for (const row of rows) {
      const link = row.evidence_url.trim();
      if (link && !link.startsWith("https://"))
        problems[row.skill_id] = "The link must start with https://";
    }
    setFields(problems);
    if (Object.keys(problems).length) return;
    setBusy(true);
    setError(null);
    try {
      await api.profile.putSkills(skillsPayload(rows));
      setSaved(true);
      router.push(`/c/${slug}/me`);
    } catch (caught) {
      if (caught instanceof ApiError && caught.code === "VALIDATION_FAILED") {
        setError("One of the skills or links is not valid. Check the links and try again.");
      } else {
        setError(friendlyMessage(caught, "We could not save your skills. Please try again."));
      }
      setBusy(false);
    }
  }

  return (
    <div className="flex max-w-2xl flex-col gap-8">
      {rows.length < MAX_SKILLS ? (
        <SkillSearch
          taken={taken}
          onAdd={(hit) => {
            setSaved(false);
            setRows((current) => [
              ...current,
              { skill_id: hit.id, name: hit.name, level: 3, evidence_url: "" },
            ]);
          }}
        />
      ) : (
        <Banner variant="info">
          <p>You have reached the limit of {MAX_SKILLS} skills.</p>
        </Banner>
      )}

      <section aria-labelledby="my-skills" className="flex flex-col gap-3">
        <h2
          id="my-skills"
          className="text-[12px] font-semibold uppercase tracking-[0.08em] text-ink-muted"
        >
          Your skills ({rows.length})
        </h2>
        {rows.length === 0 ? (
          <p className="rounded-card border border-dashed border-border-strong p-6 text-[15px] text-ink-muted">
            No skills yet. Search above and add the ones you want classmates to find you by.
          </p>
        ) : (
          <ul className="flex flex-col divide-y divide-border border-y border-border">
            {rows.map((row) => (
              <li
                key={row.skill_id}
                className="grid gap-3 py-4 sm:grid-cols-[1fr_12rem] sm:items-start"
              >
                <div className="flex flex-col gap-3">
                  <p className="text-[15px] font-semibold">{row.name}</p>
                  <FormField
                    label="Link to your work"
                    help="Optional. A link starting with https://"
                    error={fields[row.skill_id]}
                  >
                    <Input
                      type="url"
                      value={row.evidence_url}
                      onChange={(event) =>
                        update(row.skill_id, { evidence_url: event.target.value })
                      }
                      autoCapitalize="none"
                      autoComplete="off"
                      spellCheck={false}
                      placeholder="https://github.com/you/project"
                    />
                  </FormField>
                </div>
                <div className="flex items-end gap-2 sm:flex-col sm:items-stretch">
                  <label className="flex flex-1 flex-col gap-1.5 text-[13.5px] font-medium">
                    Level
                    <select
                      value={row.level}
                      onChange={(event) =>
                        update(row.skill_id, { level: Number(event.target.value) })
                      }
                      className="h-11 rounded-input border border-border-strong bg-surface px-3 text-base focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    >
                      {LEVEL_LABELS.map((label, index) => (
                        <option key={label} value={index + 1}>
                          {index + 1} · {label}
                        </option>
                      ))}
                    </select>
                  </label>
                  <Button
                    type="button"
                    variant="ghost"
                    onClick={() => {
                      setSaved(false);
                      setRows((current) => current.filter((r) => r.skill_id !== row.skill_id));
                    }}
                    aria-label={`Remove ${row.name}`}
                  >
                    <Trash2Icon aria-hidden="true" /> Remove
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      {error ? (
        <Banner variant="error">
          <p>{error}</p>
        </Banner>
      ) : null}
      <div className="flex flex-wrap items-center gap-3">
        <Button size="lg" onClick={() => void save()} disabled={busy || !dirty}>
          {busy ? (
            <>
              <Spinner /> Saving
            </>
          ) : (
            "Save skills"
          )}
        </Button>
        <Button variant="ghost" size="lg" onClick={() => router.push(`/c/${slug}/me`)}>
          {dirty ? "Cancel" : "Back"}
        </Button>
        <span role="status" className="text-[13.5px] text-ink-muted">
          {saved ? "Saved." : dirty ? "You have changes that are not saved." : ""}
        </span>
      </div>
    </div>
  );
}

export function SkillsScreen() {
  const { slug } = useCollege();
  const state = useLoad(() => api.profile.skills(), [slug]);
  return (
    <div className="mx-auto flex w-full max-w-4xl flex-col gap-8 px-5 py-8 md:px-8 md:py-12">
      <PageHeader
        title="Your skills"
        description="Classmates looking for a teammate can find you by these."
        back={{ href: `/c/${slug}/me`, label: "My profile" }}
      />
      {state.status === "loading" ? (
        <div aria-busy="true" className="flex max-w-2xl flex-col gap-4">
          <Skeleton className="h-11 w-full" />
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-24 w-full" />
        </div>
      ) : state.status === "error" ? (
        <LoadError error={state.error} onRetry={state.reload} what="your skills" />
      ) : (
        <SkillsEditor initial={state.data.skills} />
      )}
    </div>
  );
}
