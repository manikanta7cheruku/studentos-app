"use client";

import * as React from "react";
import { PlusIcon } from "lucide-react";
import { Banner } from "@/components/ui/banner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { FormField } from "@/components/ui/form-field";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { LoadError } from "@/components/app/load-error";
import { Spinner } from "@/components/app/spinner";
import { ApiError, friendlyMessage } from "@/lib/api-client";
import { api, type AdminOpportunity, type OpportunityKind } from "@/lib/api/endpoints";
import { useAttempt } from "@/lib/use-attempt";
import { usePaged } from "@/lib/use-paged";
import { useCollege } from "@/features/college";
import { dateInputValue, deadlineFromDate } from "@/features/collaborate/labels";
import { KIND_LABEL, MODE_LABEL } from "@/features/career/format";
import { ConsolePage, EmptyNote, ListSkeleton } from "./admin-shell";
import { PagedFooter } from "./paged-footer";

const KINDS: OpportunityKind[] = ["internship", "job", "hackathon", "competition", "scholarship"];
const select =
  "h-11 w-full rounded-input border border-border-strong bg-surface px-3 text-base focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring";

/** Rupees a month typed by a person, to the paise the API stores. Empty means not given. */
export function rupeesToPaise(value: string): number | null {
  const digits = value.replace(/[^\d]/g, "");
  return digits ? Number(digits) * 100 : null;
}

function Editor({
  editing,
  onClose,
  onSaved,
}: {
  editing: AdminOpportunity | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const { slug } = useCollege();
  const attempt = useAttempt();
  const [title, setTitle] = React.useState(editing?.title ?? "");
  const [org, setOrg] = React.useState(editing?.org ?? "");
  const [kind, setKind] = React.useState<OpportunityKind>(editing?.kind ?? "internship");
  const [mode, setMode] = React.useState<"onsite" | "remote" | "hybrid">(editing?.mode ?? "onsite");
  const [location, setLocation] = React.useState(editing?.location ?? "");
  const [min, setMin] = React.useState(
    editing?.stipend_min ? String(editing.stipend_min / 100) : "",
  );
  const [max, setMax] = React.useState(
    editing?.stipend_max ? String(editing.stipend_max / 100) : "",
  );
  const [eligibility, setEligibility] = React.useState(editing?.eligibility ?? "");
  const [skills, setSkills] = React.useState((editing?.skills ?? []).join(", "));
  const [deadline, setDeadline] = React.useState(dateInputValue(editing?.deadline ?? null));
  const [url, setUrl] = React.useState(editing?.apply_url ?? "");
  const [draft, setDraft] = React.useState(editing?.raw_status === "draft");
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [fields, setFields] = React.useState<Record<string, string>>({});

  async function save() {
    if (busy) return;
    const problems: Record<string, string> = {};
    if (title.trim().length < 3) problems.title = "Give it a title of at least 3 characters.";
    if (!org.trim()) problems.org = "Enter the company or organisation.";
    if (!url.trim().startsWith("https://"))
      problems.apply_url = "The link must start with https://";
    const lo = rupeesToPaise(min);
    const hi = rupeesToPaise(max);
    if (lo !== null && hi !== null && hi < lo)
      problems.stipend_max = "The maximum must not be below the minimum.";
    setFields(problems);
    if (Object.keys(problems).length) return;

    const body = {
      title: title.trim(),
      org: org.trim(),
      kind,
      mode,
      location: location.trim(),
      stipend_min: lo,
      stipend_max: hi,
      eligibility: eligibility.trim(),
      skills: skills
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean)
        .slice(0, 10),
      deadline: deadlineFromDate(deadline),
      apply_url: url.trim(),
      status: draft ? ("draft" as const) : ("published" as const),
    };
    setBusy(true);
    setError(null);
    try {
      if (editing) await api.admin.patchOpportunity(slug, editing.id, body);
      else {
        await api.admin.createOpportunity(slug, body, attempt.get());
        attempt.reset();
      }
      onSaved();
      onClose();
    } catch (caught) {
      if (!(caught instanceof ApiError && caught.isOffline)) attempt.reset();
      if (caught instanceof ApiError && caught.code === "VALIDATION_FAILED")
        setFields(caught.fieldErrors);
      setError(friendlyMessage(caught, "We could not save it. Please try again."));
    } finally {
      setBusy(false);
    }
  }

  return (
    <Dialog open onOpenChange={(open) => !open && !busy && onClose()}>
      <DialogContent className="max-h-[90dvh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{editing ? "Edit the opportunity" : "New opportunity"}</DialogTitle>
          <DialogDescription>
            Only post what you have checked yourself. Students see who posted it and when it was
            checked.
          </DialogDescription>
        </DialogHeader>
        <FormField label="Title" error={fields.title} required>
          <Input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            maxLength={120}
            placeholder="Frontend developer intern"
          />
        </FormField>
        <FormField label="Company or organisation" error={fields.org} required>
          <Input value={org} onChange={(e) => setOrg(e.target.value)} maxLength={120} />
        </FormField>
        <div className="grid gap-4 sm:grid-cols-2">
          <FormField label="Kind">
            <select
              value={kind}
              onChange={(e) => setKind(e.target.value as OpportunityKind)}
              className={select}
            >
              {KINDS.map((k) => (
                <option key={k} value={k}>
                  {KIND_LABEL[k]}
                </option>
              ))}
            </select>
          </FormField>
          <FormField label="Where">
            <select
              value={mode}
              onChange={(e) => setMode(e.target.value as "onsite" | "remote" | "hybrid")}
              className={select}
            >
              {Object.entries(MODE_LABEL).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </FormField>
        </div>
        <FormField label="City" help="Optional.">
          <Input value={location} onChange={(e) => setLocation(e.target.value)} maxLength={120} />
        </FormField>
        <div className="grid gap-4 sm:grid-cols-2">
          <FormField label="Stipend from (₹ a month)" help="Optional.">
            <Input inputMode="numeric" value={min} onChange={(e) => setMin(e.target.value)} />
          </FormField>
          <FormField label="Stipend up to (₹ a month)" error={fields.stipend_max} help="Optional.">
            <Input inputMode="numeric" value={max} onChange={(e) => setMax(e.target.value)} />
          </FormField>
        </div>
        <FormField label="Who can apply" help="Optional.">
          <Textarea
            value={eligibility}
            onChange={(e) => setEligibility(e.target.value)}
            maxLength={2000}
            rows={3}
          />
        </FormField>
        <FormField label="Skills" help="Optional. Separate with commas, up to 10.">
          <Input
            value={skills}
            onChange={(e) => setSkills(e.target.value)}
            placeholder="React, SQL"
          />
        </FormField>
        <FormField label="Deadline" help="Optional.">
          <Input type="date" value={deadline} onChange={(e) => setDeadline(e.target.value)} />
        </FormField>
        <FormField label="Link to apply" error={fields.apply_url} required>
          <Input
            type="url"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="https://"
            autoCapitalize="none"
          />
        </FormField>
        <label className="flex min-h-11 items-center gap-3 text-[16px]">
          <input
            type="checkbox"
            className="size-5 accent-[var(--primary)]"
            checked={draft}
            onChange={(e) => setDraft(e.target.checked)}
          />
          Keep it as a draft (students do not see it yet)
        </label>
        {error ? (
          <Banner variant="error">
            <p>{error}</p>
          </Banner>
        ) : null}
        <DialogFooter>
          <Button variant="ghost" onClick={onClose} disabled={busy}>
            Cancel
          </Button>
          <Button onClick={() => void save()} disabled={busy}>
            {busy ? <Spinner /> : null} {editing ? "Save" : draft ? "Save draft" : "Publish"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function Row({
  item,
  onEdit,
  onChanged,
}: {
  item: AdminOpportunity;
  onEdit: () => void;
  onChanged: () => void;
}) {
  const { slug } = useCollege();
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  async function run(call: () => Promise<unknown>) {
    setBusy(true);
    setError(null);
    try {
      await call();
      onChanged();
    } catch (caught) {
      setError(friendlyMessage(caught, "We could not do that. Please try again."));
    } finally {
      setBusy(false);
    }
  }
  const removed = item.raw_status === "removed";
  return (
    <li className="flex flex-col gap-2 py-4">
      <div className="flex flex-wrap items-center gap-x-3 text-[14px] text-ink-muted">
        <span className="font-semibold uppercase tracking-[0.06em] text-ink">
          {KIND_LABEL[item.kind]}
        </span>
        <span>
          {item.raw_status === "draft"
            ? "Draft"
            : item.status === "expired"
              ? "Closed"
              : removed
                ? "Removed"
                : "Published"}
        </span>
        <span>
          checked{" "}
          {new Date(item.last_verified_at).toLocaleDateString(undefined, {
            day: "numeric",
            month: "short",
          })}
        </span>
      </div>
      <h2 className="text-[18px] font-semibold leading-snug">{item.title}</h2>
      <p className="text-[16px] text-ink-muted">{item.org}</p>
      {error ? <p className="text-[15px] text-danger">{error}</p> : null}
      {removed ? null : (
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" size="sm" onClick={onEdit} disabled={busy}>
            Edit
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() =>
              void run(() => api.admin.patchOpportunity(slug, item.id, { verified: true }))
            }
            disabled={busy}
          >
            I checked it today
          </Button>
          {item.raw_status === "draft" ? (
            <Button
              size="sm"
              onClick={() =>
                void run(() => api.admin.patchOpportunity(slug, item.id, { status: "published" }))
              }
              disabled={busy}
            >
              Publish
            </Button>
          ) : null}
          <Button
            variant="ghost"
            size="sm"
            onClick={() => void run(() => api.admin.removeOpportunity(slug, item.id))}
            disabled={busy}
          >
            Remove
          </Button>
        </div>
      )}
    </li>
  );
}

/** The list a college posts for its students: internships, jobs, hackathons. */
export function OpportunitiesAdminScreen() {
  const { slug } = useCollege();
  const list = usePaged((cursor) => api.admin.opportunities(slug, undefined, cursor), [slug]);
  const [editor, setEditor] = React.useState<{ item: AdminOpportunity | null } | null>(null);
  return (
    <ConsolePage
      title="Opportunities"
      description="Internships, jobs and hackathons for your students. They save them and add them to their tracker."
      actions={
        <Button size="lg" onClick={() => setEditor({ item: null })}>
          <PlusIcon aria-hidden="true" /> New opportunity
        </Button>
      }
    >
      {list.state.status === "loading" ? (
        <ListSkeleton />
      ) : list.state.status === "error" ? (
        <LoadError error={list.state.error} onRetry={list.state.reload} what="the opportunities" />
      ) : list.items.length === 0 ? (
        <EmptyNote>Nothing posted yet. Add the first one: students see it under Career.</EmptyNote>
      ) : (
        <>
          <ul className="glass-card divide-y divide-white/[0.07] rounded-[22px] px-4">
            {list.items.map((item) => (
              <Row
                key={item.id}
                item={item}
                onEdit={() => setEditor({ item })}
                onChanged={list.state.reload}
              />
            ))}
          </ul>
          <PagedFooter
            hasMore={list.hasMore}
            loadingMore={list.loadingMore}
            moreError={list.moreError}
            onMore={list.more}
            count={list.items.length}
          />
        </>
      )}
      {editor ? (
        <Editor editing={editor.item} onClose={() => setEditor(null)} onSaved={list.state.reload} />
      ) : null}
    </ConsolePage>
  );
}
