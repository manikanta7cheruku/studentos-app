"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { cn } from "cn";
import { Banner } from "@/components/ui/banner";
import { DateTimeField } from "@/components/app/date-time-field";
import { FormSection } from "@/components/app/glass-parts";
import { NumberStepper } from "@/components/app/number-stepper";
import { ChoiceChips, ToggleChips } from "@/components/ui/choice-chips";
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
import { SPORTS, titleCase } from "./game-format";

const pad = (n: number) => String(n).padStart(2, "0");
/** 2026-11-20T18:00 in the person's own time. */
const localValue = (date: Date) =>
  `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;

/** Set up a game: the sport, where, when, how many players, what each person pays, and who can join. */
export function GameNewScreen() {
  const { slug } = useCollege();
  const router = useRouter();
  const attempt = useAttempt();
  const [space, setSpace] = React.useState(slug);
  const [sports, setSports] = React.useState<string[]>([]);
  const [otherOn, setOtherOn] = React.useState(false);
  const [other, setOther] = React.useState("");
  const [venue, setVenue] = React.useState("");
  const [area, setArea] = React.useState("");
  const [minStart] = React.useState(() => localValue(new Date()));
  const [maxStart] = React.useState(() => localValue(new Date(Date.now() + 89 * 86_400_000)));
  const [when, setWhen] = React.useState(() => {
    const tomorrow = new Date(Date.now() + 86_400_000);
    return `${localValue(tomorrow).slice(0, 10)}T18:00`;
  });
  const [hours, setHours] = React.useState(1);
  const [capacity, setCapacity] = React.useState(10);
  const [price, setPrice] = React.useState("");
  const [mode, setMode] = React.useState<"open" | "approval">("open");
  const [note, setNote] = React.useState("");
  const [fields, setFields] = React.useState<Record<string, string>>({});
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const sport = otherOn ? other.trim().toLowerCase().replace(/\s+/g, " ") : (sports[0] ?? "");

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (busy) return;
    const problems: Record<string, string> = {};
    if (sport.length < 2) problems.sport = "Pick a sport, or name your own.";
    if (venue.trim().length < 3) problems.venue = "Give the turf or court a name.";
    const start = new Date(when);
    if (Number.isNaN(start.getTime()) || start.getTime() < Date.now() + 5 * 60_000)
      problems.when = "Pick a day and time that is still ahead.";
    else if (start.getTime() > Date.now() + 89 * 86_400_000)
      problems.when = "Games can be set up up to 3 months ahead.";
    if (price && Number(price) > 100000) problems.price = "That is too much for one person.";
    setFields(problems);
    if (Object.keys(problems).length) return;

    setBusy(true);
    setError(null);
    try {
      const made = await api.games.create(
        space,
        {
          sport,
          venue: venue.trim(),
          ...(area.trim() ? { area: area.trim() } : {}),
          starts_at: start.toISOString(),
          hours,
          capacity,
          ...(price ? { price_inr: Number(price) } : {}),
          join_mode: mode,
          note: note.trim(),
        },
        attempt.get(),
      );
      attempt.reset();
      router.push(`/c/${space}/turf/${made.id}`);
    } catch (caught) {
      if (!(caught instanceof ApiError && caught.isOffline)) attempt.reset();
      if (caught instanceof ApiError && caught.code === "VALIDATION_FAILED")
        setFields(caught.fieldErrors);
      setError(
        caught instanceof ApiError && caught.code === "RATE_LIMITED"
          ? "You already have 8 games coming up. Cancel one or wait until it is played."
          : friendlyMessage(caught, "We could not set up the game. Please try again."),
      );
      setBusy(false);
    }
  }

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-5 px-5 pt-4 pb-2 md:px-8 md:py-8">
      <PageHeader
        title="Set up a game"
        description="Tell people where and when. They join, and you see who is coming."
        back={{ href: `/c/${slug}/turf`, label: "Turf and courts" }}
      />
      <form onSubmit={submit} className="flex flex-col gap-4" noValidate>
        <SpacePicker value={space} onChange={setSpace} label="Who can see it" />

        <FormSection title="The game">
          <div className="flex flex-col gap-2">
            <p className="text-[13px] font-semibold text-ink/90">Sport</p>
            <ToggleChips
              label="Sport"
              options={[
                ...SPORTS.map((value) => ({ value, label: titleCase(value) })),
                { value: "__other", label: "Other" },
              ]}
              values={otherOn ? ["__other"] : sports}
              onToggle={(value) => {
                if (value === "__other") {
                  setOtherOn(true);
                  setSports([]);
                } else {
                  setOtherOn(false);
                  setSports([value]);
                }
              }}
            />
            {otherOn ? (
              <Input
                aria-label="Name of the sport"
                value={other}
                onChange={(event) => setOther(event.target.value)}
                maxLength={24}
                placeholder="Name the sport, for example squash"
                autoFocus
              />
            ) : null}
            {fields.sport ? <p className="text-[13px] text-danger">{fields.sport}</p> : null}
          </div>
        </FormSection>

        <FormSection title="Where">
          <FormField label="Turf or court" error={fields.venue} required>
            <Input
              value={venue}
              onChange={(event) => setVenue(event.target.value)}
              maxLength={80}
              placeholder="Greenfield Turf"
            />
          </FormField>
          <FormField label="Area or landmark" help="Optional. So people can find it.">
            <Input
              value={area}
              onChange={(event) => setArea(event.target.value)}
              maxLength={120}
              placeholder="Near gate 2, Gachibowli"
            />
          </FormField>
        </FormSection>

        <FormSection title="When">
          <FormField label="Day and time" error={fields.when} required>
            <DateTimeField
              label="Day and time"
              value={when}
              onChange={setWhen}
              min={minStart}
              max={maxStart}
              aria-label="Day and time"
            />
          </FormField>
          <div className="flex items-center justify-between gap-3">
            <p className="text-[13px] font-semibold text-ink/90">How long</p>
            <NumberStepper
              label="Hours"
              value={hours}
              min={1}
              max={6}
              onChange={setHours}
              unit={hours === 1 ? "hour" : "hours"}
            />
          </div>
        </FormSection>

        <FormSection title="Players and cost">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-[13px] font-semibold text-ink/90">Players</p>
              <p className="text-[12.5px] text-ink-muted">Everyone playing, you included.</p>
            </div>
            <NumberStepper
              label="Players"
              value={capacity}
              min={2}
              max={40}
              onChange={setCapacity}
            />
          </div>
          <FormField
            label="Each person pays (₹)"
            help="Optional. Shown to everyone. Nobody pays in the app: collect it on the day."
            error={fields.price}
          >
            <Input
              inputMode="numeric"
              value={price}
              onChange={(event) => setPrice(event.target.value.replace(/\D/g, "").slice(0, 6))}
              placeholder="Free"
            />
          </FormField>
        </FormSection>

        <FormSection title="Who can join">
          <ChoiceChips
            label="Who can join"
            value={mode}
            onChange={setMode}
            options={[
              { value: "open", label: "Anyone can join" },
              { value: "approval", label: "I approve each person" },
            ]}
          />
          <p className="text-[12.5px] text-ink-muted">
            {mode === "open"
              ? "People are in as soon as they tap Join. When the game is full they can wait for a place."
              : "People ask to join and you answer each one. When the game is full they wait in line."}
          </p>
        </FormSection>

        <FormSection title="Anything else">
          <FormField
            label="A note"
            help="Optional. Bring your own ball, studs only, level of play."
          >
            <Textarea
              value={note}
              onChange={(event) => setNote(event.target.value)}
              maxLength={300}
              rows={3}
            />
          </FormField>
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
            className={cn("profile-btn", "flex-1 sm:flex-none sm:min-w-32")}
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={busy}
            className="profile-btn profile-btn-primary flex-[2] sm:min-w-44 sm:flex-none"
          >
            {busy ? <Spinner /> : null} Set up game
          </button>
        </div>
      </form>
    </div>
  );
}
