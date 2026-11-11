"use client";

import * as React from "react";
import { Switch } from "@/components/ui/switch";
import { Banner } from "@/components/ui/banner";
import { Button } from "@/components/ui/button";
import { LoadError } from "@/components/app/load-error";
import { Spinner } from "@/components/app/spinner";
import { friendlyMessage } from "@/lib/api-client";
import { api, type AdminSettings } from "@/lib/api/endpoints";
import { GLOBAL_SLUG } from "@/lib/home-path";
import { usePaged } from "@/lib/use-paged";
import { useLoad } from "@/lib/use-load";
import { useCollege } from "@/features/college";
import { ConsolePage, EmptyNote, ListSkeleton } from "./admin-shell";
import { PagedFooter } from "./paged-footer";

const METHODS: { value: "email_domain" | "invite_code" | "manual"; label: string; help: string }[] =
  [
    {
      value: "email_domain",
      label: "College email",
      help: "A code to an address ending in your college domain. Verified at once.",
    },
    { value: "invite_code", label: "Invite code", help: "A code you give to a batch or club." },
    { value: "manual", label: "Ask to join", help: "Students send their details and you decide." },
  ];
const TABS = [
  { key: "campus", label: "Campus", help: "Notices from the college." },
  { key: "collaborate", label: "Collaborate", help: "Team Finder." },
  { key: "career", label: "Career", help: "The tracker and opportunities." },
];

function Check({
  checked,
  onChange,
  label,
  help,
  disabled,
}: {
  checked: boolean;
  onChange: (next: boolean) => void;
  label: string;
  help: string;
  disabled?: boolean;
}) {
  const id = React.useId();
  return (
    <div className="flex min-h-11 items-center justify-between gap-4 py-1.5">
      <label htmlFor={id} className="min-w-0 flex-1">
        <span className="block text-[14px] font-medium text-ink">{label}</span>
        <span className="block text-[13px] text-ink-muted">{help}</span>
      </label>
      <Switch
        id={id}
        checked={checked}
        disabled={disabled}
        onCheckedChange={(v) => onChange(v === true)}
      />
    </div>
  );
}

function SettingsForm({ initial, onSaved }: { initial: AdminSettings; onSaved: () => void }) {
  const { slug } = useCollege();
  const isGlobal = slug === GLOBAL_SLUG;
  const [methods, setMethods] = React.useState(() =>
    initial.allowed_methods.filter((m) => m !== "open" && m !== "roster"),
  );
  const [approval, setApproval] = React.useState(initial.require_admin_approval);
  const [level, setLevel] = React.useState(String(initial.min_level_to_post));
  const [features, setFeatures] = React.useState<Record<string, boolean>>(initial.features);
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [saved, setSaved] = React.useState(false);

  async function save() {
    if (busy) return;
    if (!isGlobal && methods.length === 0) {
      setError("Keep at least one way to join, or nobody can.");
      return;
    }
    setBusy(true);
    setError(null);
    setSaved(false);
    try {
      await api.admin.patchSettings(slug, {
        ...(isGlobal ? {} : { allowed_methods: methods }),
        require_admin_approval: approval,
        min_level_to_post: Number(level),
        features: { ...features },
      });
      setSaved(true);
      onSaved();
    } catch (caught) {
      setError(friendlyMessage(caught, "We could not save the settings. Please try again."));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex max-w-2xl flex-col gap-8">
      <section aria-labelledby="how" className="flex flex-col gap-1">
        <h2
          id="how"
          className="text-[13px] font-semibold uppercase tracking-[0.08em] text-ink-muted"
        >
          How people can join
        </h2>
        {isGlobal ? (
          <p className="text-[16px] text-ink-muted">
            Global is open to every signed in student. This cannot be changed.
          </p>
        ) : (
          METHODS.map((m) => (
            <Check
              key={m.value}
              label={m.label}
              help={m.help}
              checked={methods.includes(m.value)}
              onChange={(on) =>
                setMethods((current) =>
                  on ? [...current, m.value] : current.filter((x) => x !== m.value),
                )
              }
            />
          ))
        )}
        {isGlobal ? null : (
          <Check
            label="An admin approves every new member"
            help="Even those who prove their college email or use an invite code."
            checked={approval}
            onChange={setApproval}
          />
        )}
      </section>

      <section aria-labelledby="tabs" className="flex flex-col gap-1">
        <h2
          id="tabs"
          className="text-[13px] font-semibold uppercase tracking-[0.08em] text-ink-muted"
        >
          Which parts students see
        </h2>
        {TABS.map((tab) => (
          <Check
            key={tab.key}
            label={tab.label}
            help={tab.help}
            checked={features[tab.key] !== false}
            onChange={(on) => setFeatures((f) => ({ ...f, [tab.key]: on }))}
          />
        ))}
      </section>

      <section aria-labelledby="post" className="flex max-w-sm flex-col gap-2">
        <h2
          id="post"
          className="text-[13px] font-semibold uppercase tracking-[0.08em] text-ink-muted"
        >
          Who can post teams
        </h2>
        <select
          value={level}
          onChange={(event) => setLevel(event.target.value)}
          aria-label="Who can post teams"
          className="h-11 rounded-input border border-border-strong bg-surface px-3 text-base focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <option value="0">Anyone who joined</option>
          <option value="1">Anyone who joined and was accepted</option>
          <option value="2">Only members the college verified</option>
        </select>
      </section>

      {error ? (
        <Banner variant="error">
          <p>{error}</p>
        </Banner>
      ) : null}
      <div className="flex flex-wrap items-center gap-3">
        <Button size="lg" onClick={() => void save()} disabled={busy}>
          {busy ? <Spinner /> : null} Save settings
        </Button>
        <span role="status" className="text-[15px] text-ink-muted">
          {saved ? "Saved." : ""}
        </span>
      </div>
    </div>
  );
}

export function SettingsAdminScreen() {
  const { slug } = useCollege();
  const state = useLoad(() => api.admin.settings(slug), [slug]);
  return (
    <ConsolePage
      title="Settings"
      description="How people join, and which parts of the college are on."
    >
      {state.status === "loading" ? (
        <ListSkeleton />
      ) : state.status === "error" ? (
        <LoadError error={state.error} onRetry={state.reload} what="the settings" />
      ) : (
        <SettingsForm initial={state.data} onSaved={state.reload} />
      )}
    </ConsolePage>
  );
}

const ACTION_WORDS: Record<string, string> = {
  "member.joined": "joined",
  "member.join_requested": "asked to join",
  "member.approved": "was approved",
  "member.rejected": "was rejected",
  "member.suspended": "was suspended",
  "member.role_changed": "got a new role",
  "invite.created": "created an invite code",
  "invite.revoked": "revoked an invite code",
  "settings.updated": "changed the settings",
  "announcement.created": "posted a notice",
  "opportunity.created": "posted an opportunity",
  "report.actioned": "handled a report",
};

/** Who did what in the college, newest first. Kept by the system, nobody can edit it. */
export function AuditScreen() {
  const { slug } = useCollege();
  const list = usePaged((cursor) => api.admin.audit(slug, { cursor }), [slug]);
  return (
    <ConsolePage
      title="Audit log"
      description="A record of changes in your college. It cannot be edited."
    >
      {list.state.status === "loading" ? (
        <ListSkeleton />
      ) : list.state.status === "error" ? (
        <LoadError error={list.state.error} onRetry={list.state.reload} what="the audit log" />
      ) : list.items.length === 0 ? (
        <EmptyNote>Nothing recorded yet.</EmptyNote>
      ) : (
        <>
          <ol className="divide-y divide-border border-y border-border">
            {list.items.map((entry) => (
              <li
                key={entry.id}
                className="flex flex-col gap-0.5 py-3 sm:flex-row sm:justify-between sm:gap-6"
              >
                <p className="text-[16px]">
                  <strong className="font-semibold">{entry.actor_name ?? "The system"}</strong>{" "}
                  {ACTION_WORDS[entry.action] ?? entry.action}
                  <span className="text-ink-muted"> ({entry.actor_role})</span>
                </p>
                <time dateTime={entry.created_at} className="tabular text-[14px] text-ink-muted">
                  {new Date(entry.created_at).toLocaleString(undefined, {
                    day: "numeric",
                    month: "short",
                    hour: "numeric",
                    minute: "2-digit",
                  })}
                </time>
              </li>
            ))}
          </ol>
          <PagedFooter
            hasMore={list.hasMore}
            loadingMore={list.loadingMore}
            moreError={list.moreError}
            onMore={list.more}
            count={list.items.length}
          />
        </>
      )}
    </ConsolePage>
  );
}
