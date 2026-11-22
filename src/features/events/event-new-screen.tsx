"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Banner } from "@/components/ui/banner";
import { FormField } from "@/components/ui/form-field";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { DateTimeField } from "@/components/app/date-time-field";
import { FormSection } from "@/components/app/glass-parts";
import { NumberStepper } from "@/components/app/number-stepper";
import { ToggleRow } from "@/components/app/toggle-row";
import { PageHeader } from "@/components/app/page-header";
import { Spinner } from "@/components/app/spinner";
import { ApiError, friendlyMessage } from "@/lib/api-client";
import { api } from "@/lib/api/endpoints";
import { useAttempt } from "@/lib/use-attempt";
import { useCollege } from "@/features/college";
import { SpacePicker } from "@/features/college/space-picker";
import { useSession } from "@/features/session/session-provider";
import { GLOBAL_SLUG } from "@/lib/home-path";
import { dateTimeInputValue } from "@/features/collaborate/labels";

/** The page for a new event: a title, when, where, how many can come. */
export function EventNewScreen() {
  const { slug } = useCollege();
  const session = useSession();
  const router = useRouter();
  const attempt = useAttempt();
  const [title, setTitle] = React.useState("");
  const [description, setDescription] = React.useState("");
  const [when, setWhen] = React.useState("");
  const [place, setPlace] = React.useState("");
  const [limited, setLimited] = React.useState(false);
  const [capacity, setCapacity] = React.useState(50);
  const [inviteOnly, setInviteOnly] = React.useState(false);
  // Inside a college only its admins and moderators make events (official). In Global anyone can (personal).
  const [space, setSpace] = React.useState(slug);
  const mine = session.colleges.find((item) => item.college.slug === space);
  const canHost =
    space === GLOBAL_SLUG ||
    mine?.membership.role === "college_admin" ||
    mine?.membership.role === "moderator";
  const hasGlobal = session.colleges.some(
    (item) => item.college.slug === GLOBAL_SLUG && item.membership.status === "active",
  );
  const [fields, setFields] = React.useState<Record<string, string>>({});
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  // The earliest and the latest start the picker allows (computed once when the page opens).
  const [minStart] = React.useState(() => dateTimeInputValue(new Date().toISOString()));
  const [maxStart] = React.useState(() =>
    dateTimeInputValue(new Date(Date.now() + 364 * 86_400_000).toISOString()),
  );

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (busy) return;
    const problems: Record<string, string> = {};
    if (title.trim().length < 5) problems.title = "Give it a title of at least 5 characters.";
    const start = new Date(when);
    if (!when || Number.isNaN(start.getTime())) problems.starts_at = "Pick the date and time.";
    else if (start.getTime() <= Date.now()) problems.starts_at = "It has to start in the future.";
    else if (start.getTime() > Date.now() + 365 * 86_400_000)
      problems.starts_at = "It can start at most a year from now.";
    setFields(problems);
    if (Object.keys(problems).length) return;

    setBusy(true);
    setError(null);
    try {
      const made = await api.events.create(
        space,
        {
          title: title.trim(),
          description: description.trim(),
          starts_at: start.toISOString(),
          ...(place.trim() ? { place: place.trim() } : {}),
          ...(limited ? { capacity } : {}),
          ...(inviteOnly ? { invite_only: true } : {}),
        },
        attempt.get(),
      );
      attempt.reset();
      router.push(`/c/${space}/events/${made.id}`);
    } catch (caught) {
      if (!(caught instanceof ApiError && caught.isOffline)) attempt.reset();
      if (caught instanceof ApiError && caught.code === "VALIDATION_FAILED")
        setFields(caught.fieldErrors);
      setError(friendlyMessage(caught, "We could not save the event. Please try again."));
      setBusy(false);
    }
  }

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-5 px-5 pt-4 pb-2 md:px-8 md:py-8">
      <PageHeader
        title="New event"
        description="A talk, a fest, a meetup. People say they are going and you see who is coming."
        back={{ href: `/c/${slug}/events`, label: "Events" }}
      />
      <form onSubmit={submit} className="flex flex-col gap-4" noValidate>
        <SpacePicker value={space} onChange={setSpace} label="Where should it appear" />
        {!canHost ? (
          <Banner variant="info" title="Official events are made by your college admins">
            <p>
              {hasGlobal ? (
                <>
                  Only your college admins can post events inside your college. Switch to Global
                  above to make a personal event, or ask an admin.
                </>
              ) : (
                <>
                  Only your college admins can post events inside your college. Ask an admin, or
                  join Global to make a personal event.
                </>
              )}
            </p>
          </Banner>
        ) : (
          <p className="text-[13px] text-ink-muted">
            {space === GLOBAL_SLUG
              ? "This will show as a Personal event."
              : "This will show as an Official event of your college."}
          </p>
        )}

        <FormSection title="The event">
          <FormField label="Title" error={fields.title} required>
            <Input
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              maxLength={120}
              placeholder="Open mic night"
              autoFocus
            />
          </FormField>
          <FormField
            label="About it"
            help="Optional. What happens and who it is for."
            error={fields.description}
          >
            <Textarea
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              maxLength={2000}
              rows={4}
            />
          </FormField>
        </FormSection>

        <FormSection title="When and where">
          <FormField label="When does it start?" error={fields.starts_at} required>
            <DateTimeField
              label="When does it start?"
              aria-label="When does it start?"
              value={when}
              onChange={setWhen}
              min={minStart}
              max={maxStart}
            />
          </FormField>
          <FormField label="Where?" help="Optional." error={fields.place}>
            <Input
              value={place}
              onChange={(event) => setPlace(event.target.value)}
              maxLength={120}
              placeholder="Main auditorium"
            />
          </FormField>
        </FormSection>

        <FormSection title="Who can come">
          <ToggleRow
            checked={limited}
            onChange={setLimited}
            title="Limit the places"
            text="Off means anyone can say they are going."
          />
          {limited ? (
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-[13px] font-semibold text-ink/90">How many can come</p>
                <p className="text-[12.5px] text-ink-muted">
                  When it is full, nobody else can join.
                </p>
              </div>
              <NumberStepper
                label="Places"
                value={capacity}
                min={1}
                max={5000}
                step={capacity >= 100 ? 10 : 1}
                onChange={setCapacity}
              />
            </div>
          ) : null}
          <ToggleRow
            checked={inviteOnly}
            onChange={setInviteOnly}
            title="Invite only"
            text="Kept out of the lists. Only people with your link can open it and say they are going."
          />
        </FormSection>

        {error ? (
          <Banner variant="error">
            <p>{error}</p>
          </Banner>
        ) : null}
        <div className="flex gap-2.5">
          <button
            type="button"
            onClick={() => router.back()}
            className="profile-btn flex-1 sm:min-w-32 sm:flex-none"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={busy || !canHost}
            className="profile-btn profile-btn-primary flex-[2] disabled:opacity-50 sm:min-w-44 sm:flex-none"
          >
            {busy ? <Spinner /> : null} Post event
          </button>
        </div>
      </form>
    </div>
  );
}
