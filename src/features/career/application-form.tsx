"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Banner } from "@/components/ui/banner";
import { Button } from "@/components/ui/button";
import { FormField } from "@/components/ui/form-field";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Spinner } from "@/components/app/spinner";
import { ApiError, friendlyMessage } from "@/lib/api-client";
import { api, type ApplicationDetail, type ApplicationStatus } from "@/lib/api/endpoints";
import { useAttempt } from "@/lib/use-attempt";
import { useCollege } from "@/features/college";
import { STATUSES, STATUS_LABEL } from "./format";

const httpsOk = (value: string) => !value.trim() || value.trim().startsWith("https://");

/** The form for a new application and for editing one. The status of an existing one is changed on its own page. */
export function ApplicationForm({ editing }: { editing?: ApplicationDetail }) {
  const { slug } = useCollege();
  const router = useRouter();
  const attempt = useAttempt();
  const [company, setCompany] = React.useState(editing?.company ?? "");
  const [role, setRole] = React.useState(editing?.role_title ?? "");
  const [link, setLink] = React.useState(editing?.source_url ?? "");
  const [status, setStatus] = React.useState<ApplicationStatus>("saved");
  const [deadline, setDeadline] = React.useState(editing?.deadline ?? "");
  const [appliedOn, setAppliedOn] = React.useState(editing?.applied_on ?? "");
  const [notes, setNotes] = React.useState(editing?.notes ?? "");
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [fields, setFields] = React.useState<Record<string, string>>({});

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (busy) return;
    const problems: Record<string, string> = {};
    if (!company.trim()) problems.company = "Enter the company or organisation.";
    if (!role.trim()) problems.role_title = "Enter the role, for example Frontend intern.";
    if (!httpsOk(link)) problems.source_url = "The link must start with https://";
    setFields(problems);
    if (Object.keys(problems).length) return;

    setBusy(true);
    setError(null);
    try {
      if (editing) {
        const patch: Record<string, unknown> = {};
        if (company.trim() !== editing.company) patch.company = company.trim();
        if (role.trim() !== editing.role_title) patch.role_title = role.trim();
        if ((link.trim() || null) !== editing.source_url) patch.source_url = link.trim() || null;
        if ((deadline || null) !== editing.deadline) patch.deadline = deadline || null;
        if ((appliedOn || null) !== editing.applied_on) patch.applied_on = appliedOn || null;
        if (notes.trim() !== editing.notes) patch.notes = notes.trim();
        if (Object.keys(patch).length)
          await api.applications.patch(editing.id, patch, editing.version);
        router.push(`/c/${slug}/career/tracker/${editing.id}`);
        return;
      }
      const created = await api.applications.create(
        {
          company: company.trim(),
          role_title: role.trim(),
          status,
          ...(link.trim() ? { source_url: link.trim() } : {}),
          ...(deadline ? { deadline } : {}),
          ...(appliedOn ? { applied_on: appliedOn } : {}),
          notes: notes.trim(),
        },
        attempt.get(),
      );
      attempt.reset();
      router.push(`/c/${slug}/career/tracker/${created.id}`);
    } catch (caught) {
      if (!(caught instanceof ApiError && caught.isOffline)) attempt.reset();
      if (caught instanceof ApiError && caught.code === "VALIDATION_FAILED")
        setFields(caught.fieldErrors);
      setError(
        caught instanceof ApiError && caught.code === "VERSION_CONFLICT"
          ? "You changed this on another screen. Go back and open it again to see the latest, then edit."
          : caught instanceof ApiError && caught.code === "RATE_LIMITED"
            ? "You have 200 applications, the most we keep. Remove some you no longer need."
            : friendlyMessage(caught, "We could not save it. Please try again."),
      );
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} className="flex max-w-2xl flex-col gap-6" noValidate>
      <div className="grid gap-6 sm:grid-cols-2">
        <FormField label="Company or organisation" error={fields.company} required>
          <Input
            value={company}
            onChange={(event) => setCompany(event.target.value)}
            maxLength={120}
            autoComplete="off"
            placeholder="Acme Robotics"
          />
        </FormField>
        <FormField label="Role" error={fields.role_title} required>
          <Input
            value={role}
            onChange={(event) => setRole(event.target.value)}
            maxLength={120}
            autoComplete="off"
            placeholder="Frontend intern"
          />
        </FormField>
      </div>
      <FormField
        label="Link to the listing"
        help="Optional. Where you found it, starting with https://"
        error={fields.source_url}
      >
        <Input
          type="url"
          value={link}
          onChange={(event) => setLink(event.target.value)}
          autoCapitalize="none"
          autoComplete="off"
          spellCheck={false}
          placeholder="https://"
        />
      </FormField>
      {editing ? null : (
        <FormField label="Where is it now?">
          <select
            value={status}
            onChange={(event) => setStatus(event.target.value as ApplicationStatus)}
            className="h-11 w-full rounded-input border border-border-strong bg-surface px-3 text-base focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring sm:w-64"
          >
            {STATUSES.map((s) => (
              <option key={s} value={s}>
                {STATUS_LABEL[s]}
              </option>
            ))}
          </select>
        </FormField>
      )}
      <div className="grid gap-6 sm:grid-cols-2">
        <FormField
          label="Deadline"
          help="Optional. A date in the past is fine."
          error={fields.deadline}
        >
          <Input
            type="date"
            value={deadline}
            onChange={(event) => setDeadline(event.target.value)}
          />
        </FormField>
        <FormField label="Applied on" help="Optional." error={fields.applied_on}>
          <Input
            type="date"
            value={appliedOn}
            onChange={(event) => setAppliedOn(event.target.value)}
          />
        </FormField>
      </div>
      <FormField label="Notes" help="Contacts, what to prepare, how it went." error={fields.notes}>
        <Textarea
          value={notes}
          onChange={(event) => setNotes(event.target.value)}
          maxLength={4000}
          rows={5}
        />
      </FormField>
      {error ? (
        <Banner variant="error">
          <p>{error}</p>
        </Banner>
      ) : null}
      <div className="flex flex-wrap items-center gap-3">
        <Button type="submit" size="lg" disabled={busy}>
          {busy ? (
            <>
              <Spinner /> Saving
            </>
          ) : editing ? (
            "Save changes"
          ) : (
            "Add to my tracker"
          )}
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="lg"
          onClick={() =>
            router.push(editing ? `/c/${slug}/career/tracker/${editing.id}` : `/c/${slug}/career`)
          }
        >
          Cancel
        </Button>
      </div>
    </form>
  );
}
