"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { GlobeIcon, PlusIcon, Trash2Icon } from "lucide-react";
import { cn } from "cn";
import { Banner } from "@/components/ui/banner";
import { Button } from "@/components/ui/button";
import { FormField } from "@/components/ui/form-field";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Spinner } from "@/components/app/spinner";
import { ApiError, friendlyMessage } from "@/lib/api-client";
import { api, type TeamPostDetail, type TeamPostKind } from "@/lib/api/endpoints";
import { GLOBAL_SLUG } from "@/lib/home-path";
import { useAttempt } from "@/lib/use-attempt";
import { useCollege } from "@/features/college";
import { useSession } from "@/features/session/session-provider";
import { KINDS, KIND_LABEL, dateInputOffset, dateInputValue, deadlineFromDate } from "./labels";
import { SkillPicker, type PickedSkill } from "./skill-picker";

type RoleDraft = { key: string; name: string; slots: string; skills: PickedSkill[] };

let roleCounter = 0;
const newRole = (): RoleDraft => ({
  key: `role-${(roleCounter += 1)}`,
  name: "",
  slots: "1",
  skills: [],
});

const httpsOk = (value: string) => !value.trim() || value.trim().startsWith("https://");

/**
 * The one form for a new post and for editing one. Roles are chosen when the post is made and cannot be changed
 * afterwards (the server refuses it), so the edit form shows them read only.
 */
export function PostForm({ editing }: { editing?: TeamPostDetail }) {
  const { slug: currentSlug } = useCollege();
  const session = useSession();
  const router = useRouter();
  const attempt = useAttempt();

  const spaces = session.colleges.filter((item) => item.membership.status === "active");
  const inGlobal = spaces.some((item) => item.college.slug === GLOBAL_SLUG);

  const [space, setSpace] = React.useState(currentSlug);
  const [kind, setKind] = React.useState<TeamPostKind>(editing?.kind ?? "project");
  const [title, setTitle] = React.useState(editing?.title ?? "");
  const [description, setDescription] = React.useState(editing?.description ?? "");
  const [deadline, setDeadline] = React.useState(dateInputValue(editing?.deadline ?? null));
  const [externalLink, setExternalLink] = React.useState(editing?.external_link ?? "");
  const [teamLink, setTeamLink] = React.useState(editing?.team_link ?? "");
  const [roles, setRoles] = React.useState<RoleDraft[]>(() => [newRole()]);
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [fields, setFields] = React.useState<Record<string, string>>({});

  const updateRole = (key: string, patch: Partial<RoleDraft>) =>
    setRoles((current) => current.map((r) => (r.key === key ? { ...r, ...patch } : r)));

  function validate(): Record<string, string> {
    const problems: Record<string, string> = {};
    if (title.trim().length < 5) problems.title = "Give it a title of at least 5 characters.";
    if (deadline) {
      if (deadline < dateInputOffset(0)) problems.deadline = "The deadline must be in the future.";
      else if (deadline > dateInputOffset(180))
        problems.deadline = "The deadline can be at most 180 days away.";
    }
    if (!httpsOk(externalLink)) problems.external_link = "The link must start with https://";
    if (!httpsOk(teamLink)) problems.team_link = "The link must start with https://";
    if (!editing) {
      roles.forEach((role, index) => {
        if (!role.name.trim())
          problems[`role-${index}-name`] = "Name the role, for example Designer.";
        const slots = Number(role.slots);
        if (!Number.isInteger(slots) || slots < 1 || slots > 20)
          problems[`role-${index}-slots`] = "Between 1 and 20 places.";
      });
    }
    return problems;
  }

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (busy) return;
    const problems = validate();
    setFields(problems);
    if (Object.keys(problems).length) return;

    setBusy(true);
    setError(null);
    try {
      if (editing) {
        const patch: Record<string, unknown> = {};
        if (kind !== editing.kind) patch.kind = kind;
        if (title.trim() !== editing.title) patch.title = title.trim();
        if (description.trim() !== editing.description) patch.description = description.trim();
        const newDeadline = deadlineFromDate(deadline);
        if (dateInputValue(editing.deadline) !== deadline) patch.deadline = newDeadline;
        if ((externalLink.trim() || null) !== editing.external_link)
          patch.external_link = externalLink.trim() || null;
        if ((teamLink.trim() || null) !== editing.team_link)
          patch.team_link = teamLink.trim() || null;
        if (Object.keys(patch).length) await api.teamPosts.patch(currentSlug, editing.id, patch);
        router.push(`/c/${currentSlug}/collaborate/${editing.id}`);
        return;
      }
      const post = await api.teamPosts.create(
        space,
        {
          kind,
          title: title.trim(),
          description: description.trim(),
          deadline: deadlineFromDate(deadline),
          ...(externalLink.trim() ? { external_link: externalLink.trim() } : {}),
          ...(teamLink.trim() ? { team_link: teamLink.trim() } : {}),
          roles: roles.map((role) => ({
            role_name: role.name.trim(),
            slots: Number(role.slots),
            skill_ids: role.skills.map((s) => s.id),
          })),
        },
        attempt.get(),
      );
      attempt.reset();
      router.push(`/c/${space}/collaborate/${post.id}`);
    } catch (caught) {
      if (!(caught instanceof ApiError && caught.isOffline)) attempt.reset();
      if (caught instanceof ApiError && caught.code === "VALIDATION_FAILED") {
        setFields(caught.fieldErrors);
      }
      setError(friendlyMessage(caught, "We could not save the post. Please try again."));
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} className="flex max-w-2xl flex-col gap-7" noValidate>
      {!editing ? (
        <fieldset className="flex flex-col gap-3">
          <legend className="text-[15px] font-medium text-ink">Post to</legend>
          <div className="flex flex-col gap-2 sm:flex-row">
            {spaces.map((item) => {
              const selected = space === item.college.slug;
              return (
                <label
                  key={item.college.slug}
                  className={cn(
                    "flex min-h-14 flex-1 cursor-pointer items-center gap-3 rounded-card border px-4 py-2.5 transition-colors focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-2 focus-within:ring-offset-background",
                    selected
                      ? "border-primary bg-primary/5"
                      : "border-border bg-surface hover:border-border-strong",
                  )}
                >
                  <input
                    type="radio"
                    name="space"
                    value={item.college.slug}
                    checked={selected}
                    onChange={() => setSpace(item.college.slug)}
                    className="size-5 accent-[var(--primary)]"
                  />
                  <span className="flex flex-col">
                    <span className="flex items-center gap-2 text-[16px] font-semibold text-ink">
                      {item.college.slug === GLOBAL_SLUG ? (
                        <GlobeIcon aria-hidden="true" className="size-4" />
                      ) : null}
                      {item.college.slug === GLOBAL_SLUG ? "Global" : item.college.name}
                    </span>
                    <span className="text-[14px] text-ink-muted">
                      {item.college.slug === GLOBAL_SLUG
                        ? "Open to every student"
                        : "Only members of this college"}
                    </span>
                  </span>
                </label>
              );
            })}
          </div>
          {!inGlobal ? (
            <p className="text-[15px] text-ink-muted">
              Want students from other colleges to see it too?{" "}
              <Link
                href={`/c/${GLOBAL_SLUG}/join`}
                className="font-medium text-primary underline underline-offset-4"
              >
                Join Global
              </Link>{" "}
              to post there.
            </p>
          ) : null}
        </fieldset>
      ) : null}

      <FormField label="What kind of team is it?" required>
        <select
          value={kind}
          onChange={(event) => setKind(event.target.value as TeamPostKind)}
          className="h-11 w-full rounded-input border border-border-strong bg-surface px-3 text-base focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring sm:w-64"
        >
          {KINDS.map((k) => (
            <option key={k} value={k}>
              {KIND_LABEL[k]}
            </option>
          ))}
        </select>
      </FormField>

      <FormField label="Title" error={fields.title} required>
        <Input
          value={title}
          onChange={(event) => setTitle(event.target.value)}
          maxLength={120}
          placeholder="Smart campus bus tracker for the hackathon"
        />
      </FormField>

      <FormField
        label="What are you building?"
        help="The idea, what you need help with, how you will work."
        error={fields.description}
      >
        <Textarea
          value={description}
          onChange={(event) => setDescription(event.target.value)}
          maxLength={3000}
          rows={6}
        />
      </FormField>

      <FormField
        label="Deadline"
        help="Optional. After this date the post closes by itself. Up to 180 days from today."
        error={fields.deadline}
      >
        <Input
          type="date"
          value={deadline}
          onChange={(event) => setDeadline(event.target.value)}
          min={dateInputOffset(1)}
          max={dateInputOffset(180)}
          className="sm:w-56"
        />
      </FormField>

      <FormField
        label="Link with more details"
        help="Optional. For example the hackathon page. Starts with https://"
        error={fields.external_link}
      >
        <Input
          type="url"
          value={externalLink}
          onChange={(event) => setExternalLink(event.target.value)}
          autoCapitalize="none"
          autoComplete="off"
          spellCheck={false}
          placeholder="https://"
        />
      </FormField>

      <FormField
        label="Team chat link"
        help="Optional. A WhatsApp or Discord invite. Only you and people you accept can see it."
        error={fields.team_link}
      >
        <Input
          type="url"
          value={teamLink}
          onChange={(event) => setTeamLink(event.target.value)}
          autoCapitalize="none"
          autoComplete="off"
          spellCheck={false}
          placeholder="https://"
        />
      </FormField>

      <section aria-labelledby="roles" className="flex flex-col gap-4">
        <div>
          <h2 id="roles" className="text-[18px] font-semibold">
            Roles you need
          </h2>
          <p className="text-[15px] text-ink-muted">
            {editing
              ? "Roles cannot be changed after posting. Close this post and make a new one to change them."
              : "Add one or more roles. Classmates ask to join a role."}
          </p>
        </div>
        {editing ? (
          <ul className="divide-y divide-border border-y border-border">
            {editing.roles.map((role) => (
              <li key={role.id} className="flex flex-wrap items-center justify-between gap-2 py-3">
                <span className="font-medium">{role.role_name}</span>
                <span className="tabular text-[15px] text-ink-muted">
                  {role.filled} of {role.slots} filled
                  {role.skills.length ? ` · ${role.skills.join(", ")}` : ""}
                </span>
              </li>
            ))}
          </ul>
        ) : (
          <>
            {roles.map((role, index) => (
              <div
                key={role.key}
                className="flex flex-col gap-4 rounded-card border border-border bg-surface p-4 sm:p-5"
              >
                <div className="flex items-start justify-between gap-3">
                  <p className="text-[14px] font-semibold uppercase tracking-[0.06em] text-ink-muted">
                    Role {index + 1}
                  </p>
                  {roles.length > 1 ? (
                    <button
                      type="button"
                      onClick={() =>
                        setRoles((current) => current.filter((r) => r.key !== role.key))
                      }
                      className="inline-flex min-h-11 items-center gap-1.5 rounded-input px-2 text-[15px] font-medium text-ink-muted hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    >
                      <Trash2Icon aria-hidden="true" className="size-4" /> Remove role {index + 1}
                    </button>
                  ) : null}
                </div>
                <div className="grid gap-4 sm:grid-cols-[1fr_8rem]">
                  <FormField label="Role" error={fields[`role-${index}-name`]} required>
                    <Input
                      value={role.name}
                      onChange={(event) => updateRole(role.key, { name: event.target.value })}
                      maxLength={60}
                      placeholder="Frontend developer"
                    />
                  </FormField>
                  <FormField label="Places" error={fields[`role-${index}-slots`]} required>
                    <Input
                      inputMode="numeric"
                      value={role.slots}
                      onChange={(event) =>
                        updateRole(role.key, {
                          slots: event.target.value.replace(/\D/g, "").slice(0, 2),
                        })
                      }
                    />
                  </FormField>
                </div>
                <div className="flex flex-col gap-2">
                  <span className="text-[15px] font-medium text-ink">
                    Skills that help (optional)
                  </span>
                  <SkillPicker
                    label={`Skills for role ${index + 1}`}
                    value={role.skills}
                    onChange={(skills) => updateRole(role.key, { skills })}
                  />
                </div>
              </div>
            ))}
            {roles.length < 8 ? (
              <div>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setRoles((current) => [...current, newRole()])}
                >
                  <PlusIcon aria-hidden="true" /> Add another role
                </Button>
              </div>
            ) : null}
          </>
        )}
      </section>

      {error ? (
        <Banner variant="error">
          <p>{error}</p>
        </Banner>
      ) : null}

      <div className="flex flex-wrap items-center gap-3">
        <Button type="submit" size="lg" disabled={busy}>
          {busy ? (
            <>
              <Spinner /> {editing ? "Saving" : "Posting"}
            </>
          ) : editing ? (
            "Save changes"
          ) : (
            "Post to the team finder"
          )}
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="lg"
          onClick={() =>
            router.push(
              editing
                ? `/c/${currentSlug}/collaborate/${editing.id}`
                : `/c/${currentSlug}/collaborate`,
            )
          }
        >
          Cancel
        </Button>
      </div>
    </form>
  );
}
