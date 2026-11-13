"use client";

import * as React from "react";
import { CheckIcon, SearchIcon, XIcon } from "lucide-react";
import { cn } from "cn";
import { Avatar } from "@/components/app/avatar";
import { Input } from "@/components/ui/input";
import { api } from "@/lib/api/endpoints";

export type Picked = { user_id: string; display_name: string; avatar_url: string | null };

export const MAX_INVITES = 50;

/**
 * Choose classmates to invite to a private debate: search by name, tap to add, tap again to remove.
 * `exclude` hides people who cannot be picked (yourself, people already invited).
 */
export function InvitePicker({
  slug,
  picked,
  onChange,
  exclude = [],
}: {
  slug: string;
  picked: Picked[];
  onChange: (next: Picked[]) => void;
  exclude?: string[];
}) {
  const [q, setQ] = React.useState("");
  const [results, setResults] = React.useState<Picked[]>([]);
  const [loadedFor, setLoadedFor] = React.useState<string | null>(null);
  const want = `${slug}|${q.trim()}`;
  const loading = loadedFor !== want;

  React.useEffect(() => {
    let live = true;
    const timer = window.setTimeout(() => {
      api.people
        .list(slug, q.trim() || undefined)
        .then((rows) => {
          if (live)
            setResults(
              rows.map((r) => ({
                user_id: r.user_id,
                display_name: r.display_name,
                avatar_url: r.avatar_url,
              })),
            );
        })
        .catch(() => {
          if (live) setResults([]);
        })
        .finally(() => {
          if (live) setLoadedFor(want);
        });
    }, 250);
    return () => {
      live = false;
      window.clearTimeout(timer);
    };
  }, [slug, q, want]);

  const ids = new Set(picked.map((p) => p.user_id));
  const visible = results.filter((r) => !exclude.includes(r.user_id)).slice(0, 30);
  const full = picked.length >= MAX_INVITES;

  function toggle(person: Picked) {
    if (ids.has(person.user_id)) onChange(picked.filter((p) => p.user_id !== person.user_id));
    else if (!full) onChange([...picked, person]);
  }

  return (
    <div className="flex flex-col gap-3">
      {picked.length > 0 ? (
        <ul className="flex flex-wrap gap-2" aria-label="Invited">
          {picked.map((p) => (
            <li key={p.user_id}>
              <button
                type="button"
                onClick={() => toggle(p)}
                aria-label={`Remove ${p.display_name}`}
                className="bg-brand inline-flex items-center gap-1.5 rounded-full py-1 pr-2 pl-3 text-[12.5px] font-semibold text-white outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                {p.display_name}
                <XIcon aria-hidden="true" className="size-3.5" />
              </button>
            </li>
          ))}
        </ul>
      ) : null}
      <div className="relative">
        <SearchIcon
          aria-hidden="true"
          className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-ink-muted"
        />
        <Input
          value={q}
          onChange={(event) => setQ(event.target.value)}
          placeholder="Search classmates by name"
          aria-label="Search classmates"
          className="pl-9"
        />
      </div>
      <ul className="flex max-h-56 flex-col gap-1 overflow-y-auto pr-1" aria-busy={loading}>
        {visible.length === 0 && !loading ? (
          <li className="px-2 py-3 text-[13px] text-ink-muted">No one found.</li>
        ) : null}
        {visible.map((p) => {
          const on = ids.has(p.user_id);
          return (
            <li key={p.user_id}>
              <button
                type="button"
                onClick={() => toggle(p)}
                aria-pressed={on}
                disabled={!on && full}
                className={cn(
                  "flex w-full items-center gap-3 rounded-xl px-2 py-1.5 text-left outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50",
                  on ? "bg-white/10" : "hover:bg-white/[0.06]",
                )}
              >
                <Avatar name={p.display_name} src={p.avatar_url} size="sm" />
                <span className="min-w-0 flex-1 truncate text-[14px] font-medium">
                  {p.display_name}
                </span>
                {on ? <CheckIcon aria-hidden="true" className="size-4 text-[#b9b4ee]" /> : null}
              </button>
            </li>
          );
        })}
      </ul>
      {full ? (
        <p className="text-[12px] text-ink-muted">You can invite up to {MAX_INVITES} people.</p>
      ) : null}
    </div>
  );
}
