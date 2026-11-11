"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Banner } from "@/components/ui/banner";
import { Button } from "@/components/ui/button";
import { FormField } from "@/components/ui/form-field";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
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
  const [capacity, setCapacity] = React.useState("");
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
  // The earliest start the picker allows: this minute (computed once when the page opens).
  const [minStart] = React.useState(() => dateTimeInputValue(new Date().toISOString()));

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
    if (capacity && !(Number(capacity) >= 1 && Number(capacity) <= 5000))
      problems.capacity = "Between 1 and 5000, or leave it empty.";
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
          ...(capacity ? { capacity: Number(capacity) } : {}),
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
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-6 px-5 pt-2 md:px-8 md:py-8">
      <PageHeader title="New event" back={{ href: `/c/${slug}/events`, label: "Events" }} />
      <form onSubmit={submit} className="flex flex-col gap-5" noValidate>
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
        <FormField label="Title" error={fields.title} required>
          <Input
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            maxLength={120}
            placeholder="Open mic night"
            autoFocus
          />
        </FormField>
        <div className="grid gap-5 sm:grid-cols-2">
          <FormField label="When does it start?" error={fields.starts_at} required>
            <Input
              type="datetime-local"
              value={when}
              min={minStart}
              onChange={(event) => setWhen(event.target.value)}
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
        </div>
        <FormField
          label="About it"
          help="Optional. What happens and who it is for."
          error={fields.description}
        >
          <Textarea
            value={description}
            onChange={(event) => setDescription(event.target.value)}
            maxLength={2000}
            rows={5}
          />
        </FormField>
        <FormField
          label="How many can come?"
          help="Optional. Leave empty for no limit."
          error={fields.capacity}
        >
          <Input
            inputMode="numeric"
            value={capacity}
            onChange={(event) => setCapacity(event.target.value.replace(/\D/g, "").slice(0, 4))}
            className="sm:w-40"
          />
        </FormField>
        <label className="flex cursor-pointer items-start gap-3 rounded-2xl border border-white/10 bg-white/[0.03] p-3.5">
          <input
            type="checkbox"
            checked={inviteOnly}
            onChange={(event) => setInviteOnly(event.target.checked)}
            className="mt-0.5 size-5 accent-[var(--primary)]"
          />
          <span>
            <span className="block text-[14px] font-semibold">Invite only</span>
            <span className="block text-[13px] text-ink-muted">
              It stays out of the lists. Only people with your link can open it and say they are
              going.
            </span>
          </span>
        </label>
        {error ? (
          <Banner variant="error">
            <p>{error}</p>
          </Banner>
        ) : null}
        <div className="flex items-center gap-3">
          <Button type="submit" size="lg" disabled={busy || !canHost}>
            {busy ? (
              <>
                <Spinner /> Saving
              </>
            ) : (
              "Create event"
            )}
          </Button>
          <Button type="button" variant="ghost" size="lg" onClick={() => router.back()}>
            Cancel
          </Button>
        </div>
      </form>
    </div>
  );
}
