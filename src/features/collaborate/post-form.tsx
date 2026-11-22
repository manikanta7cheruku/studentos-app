"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { PlusIcon, Trash2Icon } from "lucide-react";
import { Banner } from "@/components/ui/banner";
import { FormField } from "@/components/ui/form-field";
import { Input } from "@/components/ui/input";
import { ChoiceChips } from "@/components/ui/choice-chips";
import { Stepper } from "@/components/ui/stepper";
import { Textarea } from "@/components/ui/textarea";
import { DateTimeField } from "@/components/app/date-time-field";
import { FormSection, GlassChip } from "@/components/app/glass-parts";
import { ToggleRow } from "@/components/app/toggle-row";
import { Spinner } from "@/components/app/spinner";
import { ApiError, friendlyMessage } from "@/lib/api-client";
import { api, type TeamPostDetail, type TeamPostKind } from "@/lib/api/endpoints";
import { useAttempt } from "@/lib/use-attempt";
import { useCollege } from "@/features/college";
import { SpacePicker } from "@/features/college/space-picker";
import { useLoad } from "@/lib/use-load";
import {
  KIND_LABEL,
  PLAN_KINDS,
  isTimedKind,
  dateInputOffset,
  dateInputValue,
  dateTimeInputValue,
  deadlineFromDate,
} from "./labels";
import { SkillPicker, type PickedSkill } from "./skill-picker";

type RoleDraft = { key: string; name: string; slots: string; skills: PickedSkill[] };

let roleCounter = 0;
const newRole = (): RoleDraft => ({
  key: `role-${(roleCounter += 1)}`,
  name: "",
  slots: "1",
  skills: [],
});

/** A plan can be started from a booked slot: the link carries the kind, the place and the time. */
function readPreset(): { kind?: TeamPostKind; place?: string; when?: string } {
  if (typeof window === "undefined") return {};
  const params = new URLSearchParams(window.location.search);
  const kind = params.get("kind");
  const when = params.get("when");
  return {
    kind: PLAN_KINDS.includes(kind as TeamPostKind) ? (kind as TeamPostKind) : undefined,
    place: params.get("place")?.slice(0, 120) || undefined,
    when: when && !Number.isNaN(new Date(when).getTime()) ? when : undefined,
  };
}

const httpsOk = (value: string) => !value.trim() || value.trim().startsWith("https://");

/**
 * The one form for a new post and for editing one. Roles are chosen when the post is made and cannot be changed
 * afterwards (the server refuses it), so the edit form shows them read only.
 */
export function PostForm({ editing }: { editing?: TeamPostDetail }) {
  const { slug: currentSlug } = useCollege();
  const router = useRouter();
  const attempt = useAttempt();

  const [preset] = React.useState(readPreset);
  const [space, setSpace] = React.useState(currentSlug);
  const [kind, setKind] = React.useState<TeamPostKind>(editing?.kind ?? preset.kind ?? "project");
  const [title, setTitle] = React.useState(editing?.title ?? "");
  const [description, setDescription] = React.useState(editing?.description ?? "");
  const [deadline, setDeadline] = React.useState(dateInputValue(editing?.deadline ?? null));
  // A sport or an event has a start time and a place instead of a deadline and a list of roles.
  const [when, setWhen] = React.useState(
    dateTimeInputValue(editing?.deadline ?? preset.when ?? null),
  );
  const [place, setPlace] = React.useState(editing?.place ?? preset.place ?? "");
  const [players, setPlayers] = React.useState(
    String(editing?.roles.reduce((sum, role) => sum + role.slots, 0) || 10),
  );
  const timed = isTimedKind(kind);
  // The venues of the space, so the place can be picked with one tap (new plans with a time and a place only).
  const venues = useLoad(
    () => (timed && !editing ? api.venues.list(space) : Promise.resolve([])),
    [space, timed, Boolean(editing)],
  );
  const venueNames = venues.status === "ready" ? venues.data.slice(0, 4).map((v) => v.name) : [];
  const [showLinks, setShowLinks] = React.useState(
    Boolean(editing?.external_link || editing?.team_link),
  );
  // Open join: one tap and you are in, no asking. On by default for plans with a time and a place.
  const [openJoin, setOpenJoin] = React.useState(true);
  // The earliest start the picker allows: this minute (computed once when the form opens).
  const [minStart] = React.useState(() => dateTimeInputValue(new Date().toISOString()));
  const [maxStart] = React.useState(() =>
    dateTimeInputValue(new Date(Date.now() + 179 * 86_400_000).toISOString()),
  );
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
    if (timed) {
      const start = new Date(when);
      if (!when || Number.isNaN(start.getTime())) problems.when = "Pick the date and time.";
      else if (start.getTime() <= Date.now()) problems.when = "It has to start in the future.";
      else if (start.getTime() > Date.now() + 180 * 86_400_000)
        problems.when = "It can start at most 180 days from now.";
      const count = Number(players);
      if (!Number.isInteger(count) || count < 1 || count > 20)
        problems.players = "Between 1 and 20 people.";
    } else if (deadline) {
      if (deadline < dateInputOffset(0)) problems.deadline = "The deadline must be in the future.";
      else if (deadline > dateInputOffset(180))
        problems.deadline = "The deadline can be at most 180 days away.";
    }
    if (!httpsOk(externalLink)) problems.external_link = "The link must start with https://";
    if (!httpsOk(teamLink)) problems.team_link = "The link must start with https://";
    if (!editing && !timed) {
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
        if (timed) {
          const start = new Date(when).toISOString();
          if (dateTimeInputValue(editing.deadline) !== when) patch.deadline = start;
          if ((place.trim() || null) !== editing.place) patch.place = place.trim() || null;
        } else if (dateInputValue(editing.deadline) !== deadline) {
          patch.deadline = deadlineFromDate(deadline);
        }
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
          deadline: timed ? new Date(when).toISOString() : deadlineFromDate(deadline),
          ...(timed && place.trim() ? { place: place.trim() } : {}),
          ...(timed && openJoin ? { join_mode: "open" as const } : {}),
          ...(externalLink.trim() ? { external_link: externalLink.trim() } : {}),
          ...(teamLink.trim() ? { team_link: teamLink.trim() } : {}),
          roles: timed
            ? [
                {
                  role_name: kind === "sport" ? "Player" : kind === "hangout" ? "Friend" : "Guest",
                  slots: Number(players),
                  skill_ids: [],
                },
              ]
            : roles.map((role) => ({
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
    <form onSubmit={submit} className="flex max-w-2xl flex-col gap-4" noValidate>
      {!editing ? <SpacePicker value={space} onChange={setSpace} label="Post to" /> : null}

      <FormSection title="The plan">
        <div className="flex flex-col gap-2">
          <p className="text-[13px] font-semibold text-ink/90">What is it?</p>
          <ChoiceChips
            label="What kind of plan is it"
            value={kind}
            onChange={setKind}
            options={(PLAN_KINDS.includes(kind) ? PLAN_KINDS : [...PLAN_KINDS, kind]).map((k) => ({
              value: k,
              label: KIND_LABEL[k],
            }))}
          />
        </div>

        <FormField label="Title" error={fields.title} required>
          <Input
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            maxLength={120}
            placeholder="Smart campus bus tracker for the hackathon"
          />
        </FormField>

        <FormField
          label={timed ? "Anything to add?" : "What are you building?"}
          help={
            timed
              ? "Optional. Level, what to bring, how to find you."
              : "The idea, what you need help with, how you will work."
          }
          error={fields.description}
        >
          <Textarea
            value={description}
            onChange={(event) => setDescription(event.target.value)}
            maxLength={3000}
            rows={timed ? 3 : 5}
          />
        </FormField>
      </FormSection>

      {timed ? (
        <>
          <FormSection title="When and where">
            <FormField label="When does it start?" error={fields.when} required>
              <DateTimeField
                label="When does it start?"
                aria-label="When does it start?"
                value={when}
                onChange={setWhen}
                min={minStart}
                max={maxStart}
              />
            </FormField>
            <div className="flex flex-col gap-2">
              <FormField
                label="Where?"
                help="Optional. The turf, hall or room."
                error={fields.place}
              >
                <Input
                  value={place}
                  onChange={(event) => setPlace(event.target.value)}
                  maxLength={120}
                  placeholder="Greenfield Turf"
                />
              </FormField>
              {venueNames.length ? (
                <div role="group" aria-label="Venues" className="flex flex-wrap gap-2">
                  {venueNames.map((name) => (
                    <GlassChip key={name} pressed={place === name} onClick={() => setPlace(name)}>
                      {name}
                    </GlassChip>
                  ))}
                </div>
              ) : null}
            </div>
          </FormSection>
          {!editing ? (
            <FormSection title="Players">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-[13px] font-semibold text-ink/90">
                    {kind === "sport"
                      ? "Players needed"
                      : kind === "hangout"
                        ? "How many people?"
                        : "How many can come?"}
                  </p>
                  {fields.players ? (
                    <p className="text-[12.5px] font-medium text-danger">{fields.players}</p>
                  ) : null}
                </div>
                <Stepper label="Players" value={players} onChange={setPlayers} min={1} max={20} />
              </div>
              <ToggleRow
                checked={openJoin}
                onChange={setOpenJoin}
                title="Anyone can join with one tap"
                text="No asking and no waiting. You are told who joins, and joiners see who is in."
              />
            </FormSection>
          ) : null}
        </>
      ) : (
        <FormSection title="Deadline">
          <FormField
            label="Deadline"
            help="Optional. After this date the post closes by itself. Up to 180 days from today."
            error={fields.deadline}
          >
            <DateTimeField
              mode="date"
              clearable
              label="Deadline"
              aria-label="Deadline"
              value={deadline}
              onChange={setDeadline}
              min={dateInputOffset(1)}
              max={dateInputOffset(180)}
              placeholder="No deadline"
            />
          </FormField>
        </FormSection>
      )}

      <div className="flex flex-col gap-4 empty:hidden">
        {showLinks || fields.external_link || fields.team_link ? (
          <>
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
          </>
        ) : (
          <button type="button" onClick={() => setShowLinks(true)} className="profile-btn w-fit">
            <PlusIcon aria-hidden="true" className="size-4" /> Add links (optional)
          </button>
        )}
      </div>

      {timed ? null : (
        <section aria-labelledby="roles" className="flex flex-col gap-4">
          <div>
            <h2 id="roles" className="text-[16px] font-semibold">
              Roles you need
            </h2>
            <p className="text-[13.5px] text-ink-muted">
              {editing
                ? "Roles cannot be changed after posting. Close this post and make a new one to change them."
                : "Add one or more roles. Classmates ask to join a role."}
            </p>
          </div>
          {editing ? (
            <ul className="glass-card divide-y divide-white/[0.07] rounded-[22px] px-4">
              {editing.roles.map((role) => (
                <li
                  key={role.id}
                  className="flex flex-wrap items-center justify-between gap-2 py-3"
                >
                  <span className="font-medium">{role.role_name}</span>
                  <span className="tabular text-[13.5px] text-ink-muted">
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
                  className="flex flex-col gap-4 glass-card rounded-[22px] p-4 sm:p-5"
                >
                  <div className="flex items-start justify-between gap-3">
                    <p className="text-[13px] font-semibold uppercase tracking-[0.06em] text-ink-muted">
                      Role {index + 1}
                    </p>
                    {roles.length > 1 ? (
                      <button
                        type="button"
                        onClick={() =>
                          setRoles((current) => current.filter((r) => r.key !== role.key))
                        }
                        className="inline-flex min-h-11 items-center gap-1.5 rounded-input px-2 text-[13.5px] font-medium text-ink-muted hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                      >
                        <Trash2Icon aria-hidden="true" className="size-4" /> Remove role {index + 1}
                      </button>
                    ) : null}
                  </div>
                  <div className="grid gap-4 sm:grid-cols-[1fr_auto]">
                    <FormField label="Role" error={fields[`role-${index}-name`]} required>
                      <Input
                        value={role.name}
                        onChange={(event) => updateRole(role.key, { name: event.target.value })}
                        maxLength={60}
                        placeholder="Frontend developer"
                      />
                    </FormField>
                    <FormField label="Places" error={fields[`role-${index}-slots`]} required>
                      <Stepper
                        label={`Places for role ${index + 1}`}
                        value={role.slots}
                        onChange={(slots) => updateRole(role.key, { slots })}
                        min={1}
                        max={20}
                      />
                    </FormField>
                  </div>
                  <div className="flex flex-col gap-2">
                    <span className="text-[13.5px] font-medium text-ink">
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
                  <button
                    type="button"
                    className="profile-btn"
                    onClick={() => setRoles((current) => [...current, newRole()])}
                  >
                    <PlusIcon aria-hidden="true" /> Add another role
                  </button>
                </div>
              ) : null}
            </>
          )}
        </section>
      )}

      {error ? (
        <Banner variant="error">
          <p>{error}</p>
        </Banner>
      ) : null}

      <div className="flex gap-2.5">
        <button
          type="button"
          className="profile-btn flex-1 sm:min-w-32 sm:flex-none"
          onClick={() =>
            router.push(
              editing
                ? `/c/${currentSlug}/collaborate/${editing.id}`
                : `/c/${currentSlug}/collaborate`,
            )
          }
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={busy}
          className="profile-btn profile-btn-primary flex-[2] disabled:opacity-60 sm:min-w-44 sm:flex-none"
        >
          {busy ? (
            <>
              <Spinner /> {editing ? "Saving" : "Posting"}
            </>
          ) : editing ? (
            "Save changes"
          ) : (
            "Post plan"
          )}
        </button>
      </div>
    </form>
  );
}
