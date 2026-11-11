"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { cn } from "cn";
import { Banner } from "@/components/ui/banner";
import { Button } from "@/components/ui/button";
import { FormField } from "@/components/ui/form-field";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { PageHeader } from "@/components/app/page-header";
import { Spinner } from "@/components/app/spinner";
import { ApiError, friendlyMessage } from "@/lib/api-client";
import { api } from "@/lib/api/endpoints";
import { GLOBAL_SLUG } from "@/lib/home-path";
import { useAttempt } from "@/lib/use-attempt";
import { useCollege } from "@/features/college";
import { SpacePicker } from "@/features/college/space-picker";
import { useSession } from "@/features/session/session-provider";
import { SPORTS, hourLabel, titleCase } from "./format";

const HOURS = Array.from({ length: 25 }, (_, hour) => hour);

/** Add a turf, a court or a ground: its name, sports, where, the price and the hours it can be booked. */
export function VenueNewScreen() {
  const { slug } = useCollege();
  const session = useSession();
  const router = useRouter();
  const attempt = useAttempt();
  const [space, setSpace] = React.useState(slug);
  const [name, setName] = React.useState("");
  const [sports, setSports] = React.useState<string[]>([]);
  const [area, setArea] = React.useState("");
  const [price, setPrice] = React.useState("");
  const [open, setOpen] = React.useState(6);
  const [close, setClose] = React.useState(23);
  const [description, setDescription] = React.useState("");
  const [fields, setFields] = React.useState<Record<string, string>>({});
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const mine = session.colleges.find((item) => item.college.slug === space);
  const canAdd =
    space === GLOBAL_SLUG ||
    mine?.membership.role === "college_admin" ||
    mine?.membership.role === "moderator";

  function toggle(sport: string) {
    setSports((current) =>
      current.includes(sport)
        ? current.filter((item) => item !== sport)
        : current.length >= 5
          ? current
          : [...current, sport],
    );
  }

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (busy) return;
    const problems: Record<string, string> = {};
    if (name.trim().length < 3) problems.name = "Give it a name of at least 3 characters.";
    if (sports.length === 0) problems.sports = "Pick at least one sport.";
    if (price && Number(price) > 100000) problems.price = "That price is too high.";
    if (open >= close) problems.hours = "It has to close after it opens.";
    setFields(problems);
    if (Object.keys(problems).length) return;

    setBusy(true);
    setError(null);
    try {
      const made = await api.venues.create(
        space,
        {
          name: name.trim(),
          description: description.trim(),
          sports,
          ...(area.trim() ? { area: area.trim() } : {}),
          ...(price ? { price_inr_per_hour: Number(price) } : {}),
          open_hour: open,
          close_hour: close,
        },
        attempt.get(),
      );
      attempt.reset();
      router.push(`/c/${space}/turf/${made.id}`);
    } catch (caught) {
      if (!(caught instanceof ApiError && caught.isOffline)) attempt.reset();
      if (caught instanceof ApiError && caught.code === "VALIDATION_FAILED")
        setFields(caught.fieldErrors);
      setError(friendlyMessage(caught, "We could not save the venue. Please try again."));
      setBusy(false);
    }
  }

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-6 px-5 pt-2 md:px-8 md:py-8">
      <PageHeader
        title="Add a venue"
        back={{ href: `/c/${slug}/turf`, label: "Turf and courts" }}
      />
      <form onSubmit={submit} className="flex flex-col gap-5" noValidate>
        <SpacePicker value={space} onChange={setSpace} label="Where should it appear" />
        {!canAdd ? (
          <Banner variant="info" title="Venues are added by your college admins">
            <p>
              Only admins and moderators add venues inside a college. Ask one, or switch to Global
              above.
            </p>
          </Banner>
        ) : (
          <p className="text-[13px] text-ink-muted">
            You will answer the booking requests for this venue. College admins can too.
          </p>
        )}
        <FormField label="Name" error={fields.name} required>
          <Input
            value={name}
            onChange={(event) => setName(event.target.value)}
            maxLength={80}
            placeholder="Greenfield Turf"
            autoFocus
          />
        </FormField>

        <fieldset className="flex flex-col gap-2">
          <legend className="text-[13px] font-semibold text-ink-muted">
            Sports (up to 5) <span aria-hidden="true">*</span>
          </legend>
          <div className="flex flex-wrap gap-2">
            {SPORTS.map((sport) => (
              <button
                key={sport}
                type="button"
                aria-pressed={sports.includes(sport)}
                onClick={() => toggle(sport)}
                className={cn(
                  "inline-flex h-9 items-center rounded-full border px-4 text-[13px] font-semibold outline-none transition-[background-color,border-color,color,transform] duration-200 focus-visible:ring-2 focus-visible:ring-ring active:scale-95",
                  sports.includes(sport)
                    ? "bg-brand border-transparent text-white"
                    : "border-white/10 bg-white/[0.04] text-ink-muted hover:border-white/25 hover:text-ink",
                )}
              >
                {titleCase(sport)}
              </button>
            ))}
          </div>
          {fields.sports ? <p className="text-[13px] text-danger">{fields.sports}</p> : null}
        </fieldset>

        <FormField label="Where?" help="Optional. The area or landmark." error={fields.area}>
          <Input
            value={area}
            onChange={(event) => setArea(event.target.value)}
            maxLength={160}
            placeholder="Near gate 2"
          />
        </FormField>

        <div className="grid gap-5 sm:grid-cols-3">
          <FormField label="Price for one hour (₹)" help="Optional." error={fields.price}>
            <Input
              inputMode="numeric"
              value={price}
              onChange={(event) => setPrice(event.target.value.replace(/\D/g, "").slice(0, 6))}
              placeholder="800"
            />
          </FormField>
          <FormField label="Opens" error={fields.hours}>
            <select
              value={open}
              onChange={(event) => setOpen(Number(event.target.value))}
              className="h-12 w-full rounded-[14px] border border-white/10 bg-white/[0.045] px-3 text-[15px] outline-none focus-visible:border-[#7d74e0] focus-visible:ring-[3px] focus-visible:ring-[#7d74e0]/25"
            >
              {HOURS.slice(0, 24).map((hour) => (
                <option key={hour} value={hour}>
                  {hourLabel(hour)}
                </option>
              ))}
            </select>
          </FormField>
          <FormField label="Closes">
            <select
              value={close}
              onChange={(event) => setClose(Number(event.target.value))}
              className="h-12 w-full rounded-[14px] border border-white/10 bg-white/[0.045] px-3 text-[15px] outline-none focus-visible:border-[#7d74e0] focus-visible:ring-[3px] focus-visible:ring-[#7d74e0]/25"
            >
              {HOURS.slice(1).map((hour) => (
                <option key={hour} value={hour}>
                  {hourLabel(hour)}
                </option>
              ))}
            </select>
          </FormField>
        </div>

        <FormField
          label="About it"
          help="Optional. Floodlights, size, rules."
          error={fields.description}
        >
          <Textarea
            value={description}
            onChange={(event) => setDescription(event.target.value)}
            maxLength={600}
            rows={4}
          />
        </FormField>

        {error ? (
          <Banner variant="error">
            <p>{error}</p>
          </Banner>
        ) : null}
        <div className="flex items-center gap-3">
          <Button type="submit" size="lg" disabled={busy || !canAdd}>
            {busy ? (
              <>
                <Spinner /> Saving
              </>
            ) : (
              "Add the venue"
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
