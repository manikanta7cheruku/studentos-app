"use client";

import * as React from "react";
import { PlusIcon, XIcon } from "lucide-react";
import { cn } from "cn";
import { ChoiceChips } from "@/components/ui/choice-chips";
import { Input } from "@/components/ui/input";
import { ToggleRow } from "@/components/app/toggle-row";

// The pieces of "about you" that the tour and the edit screen share: sex, birth year, two kinds of interests, and the mobile
// number with who may see it.

export const CASUAL_INTERESTS = [
  "Football",
  "Cricket",
  "Badminton",
  "Gym and fitness",
  "Running",
  "Movies and series",
  "Music",
  "Gaming",
  "Travel",
  "Food and cafes",
  "Photography",
  "Reading",
  "Anime",
  "Dance",
  "Art and drawing",
  "Fashion",
  "Volunteering",
];

export const TECH_INTERESTS = [
  "Web development",
  "App development",
  "AI and machine learning",
  "Data science",
  "Cybersecurity",
  "UI and UX design",
  "Robotics and IoT",
  "Competitive programming",
  "Open source",
  "Startups",
  "Electronics",
  "Cloud and DevOps",
  "Game development",
];

const SEX_OPTIONS = [
  { value: "woman", label: "Woman" },
  { value: "man", label: "Man" },
  { value: "non_binary", label: "Non-binary" },
  { value: "prefer_not_to_say", label: "Prefer not to say" },
] as const;

export type Sex = (typeof SEX_OPTIONS)[number]["value"];

export function SexField({
  value,
  onChange,
}: {
  value: Sex | null;
  onChange: (value: Sex) => void;
}) {
  return (
    <ChoiceChips
      label="Sex"
      value={(value ?? "") as Sex}
      onChange={onChange}
      options={SEX_OPTIONS.map((option) => ({ value: option.value, label: option.label }))}
    />
  );
}

/** Birth year from a list (the last 60 years). Optional. We keep the year, not the date. */
export function BirthYearSelect({
  value,
  onChange,
  id,
}: {
  value: number | null;
  onChange: (value: number | null) => void;
  id?: string;
}) {
  // Read once, so the list does not move while it is open.
  const [thisYear] = React.useState(() => new Date().getFullYear());
  const years = Array.from({ length: 60 }, (_, index) => thisYear - 10 - index);
  return (
    <select
      id={id}
      value={value ?? ""}
      onChange={(event) => onChange(event.target.value ? Number(event.target.value) : null)}
      className="h-11 w-full rounded-[12px] border border-white/10 bg-white/[0.045] px-3 text-[14.5px] outline-none focus-visible:border-[#7d74e0] focus-visible:ring-[3px] focus-visible:ring-[#7d74e0]/25 sm:w-56"
    >
      <option value="">Prefer not to say</option>
      {years.map((year) => (
        <option key={year} value={year}>
          {year}
        </option>
      ))}
    </select>
  );
}

/** Chips to pick from, and one box to add your own. Up to `max` in all (`room` is how many more can be added). */
export function InterestChips({
  title,
  suggestions,
  value,
  onChange,
  room,
  placeholder,
}: {
  title: string;
  suggestions: string[];
  value: string[];
  onChange: (next: string[]) => void;
  room: number;
  placeholder: string;
}) {
  const [draft, setDraft] = React.useState("");
  const has = (item: string) => value.some((v) => v.toLowerCase() === item.toLowerCase());
  const toggle = (item: string) =>
    onChange(
      has(item)
        ? value.filter((v) => v.toLowerCase() !== item.toLowerCase())
        : room > 0
          ? [...value, item]
          : value,
    );
  const custom = value.filter((v) => !suggestions.some((s) => s.toLowerCase() === v.toLowerCase()));

  function add() {
    const item = draft.trim().slice(0, 40);
    setDraft("");
    if (item && !has(item) && room > 0) onChange([...value, item]);
  }

  const chip =
    "inline-flex h-9 shrink-0 items-center gap-1.5 rounded-full border px-3.5 text-[13px] font-semibold outline-none transition-[background-color,border-color,color,transform] duration-200 focus-visible:ring-2 focus-visible:ring-ring active:scale-95";
  return (
    <div className="flex flex-col gap-2.5">
      <p className="text-[13px] font-semibold text-ink/90">{title}</p>
      <div role="group" aria-label={title} className="flex flex-wrap gap-2">
        {suggestions.map((item) => (
          <button
            key={item}
            type="button"
            aria-pressed={has(item)}
            onClick={() => toggle(item)}
            className={cn(
              chip,
              has(item)
                ? "bg-brand border-transparent text-white"
                : "border-white/10 bg-white/[0.04] text-ink-muted hover:border-white/25 hover:text-ink",
            )}
          >
            {item}
          </button>
        ))}
        {custom.map((item) => (
          <button
            key={item}
            type="button"
            aria-label={`Remove ${item}`}
            onClick={() => toggle(item)}
            className={cn(chip, "bg-brand border-transparent text-white")}
          >
            {item}
            <XIcon aria-hidden="true" className="size-3.5" />
          </button>
        ))}
      </div>
      <div className="flex gap-2">
        <Input
          aria-label={`Add your own: ${title}`}
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter") {
              event.preventDefault();
              add();
            }
          }}
          maxLength={40}
          placeholder={placeholder}
          enterKeyHint="done"
        />
        <button
          type="button"
          onClick={add}
          disabled={!draft.trim() || room <= 0}
          aria-label="Add"
          className="inline-flex size-11 shrink-0 items-center justify-center rounded-[12px] border border-white/10 bg-white/[0.06] text-ink-muted outline-none transition-[background-color,color,transform] hover:bg-white/10 hover:text-ink focus-visible:ring-2 focus-visible:ring-ring active:scale-95 disabled:opacity-40"
        >
          <PlusIcon aria-hidden="true" className="size-4" />
        </button>
      </div>
    </div>
  );
}

/** "9876543210" becomes "+919876543210". Spaces and dashes go. Anything else is left for the server to refuse. */
export function normalisePhone(raw: string): string {
  const compact = raw.replace(/[\s()-]/g, "");
  if (/^[6-9]\d{9}$/.test(compact)) return `+91${compact}`;
  if (/^91[6-9]\d{9}$/.test(compact)) return `+${compact}`;
  return compact;
}

export const PHONE_OK = /^\+[1-9][0-9]{7,14}$/;

/** The mobile number (optional) and who may see it. Nobody else ever sees it; there is no call button. */
export function PhoneFields({
  phone,
  onPhone,
  share,
  onShare,
  error,
}: {
  phone: string;
  onPhone: (value: string) => void;
  share: boolean;
  onShare: (value: boolean) => void;
  error?: string;
}) {
  const id = React.useId();
  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-col gap-1.5">
        <label htmlFor={id} className="text-[13px] font-semibold text-ink/90">
          Mobile number <span className="font-normal text-ink-muted">(optional)</span>
        </label>
        <Input
          id={id}
          type="tel"
          inputMode="tel"
          autoComplete="tel"
          value={phone}
          onChange={(event) => onPhone(event.target.value)}
          placeholder="+91 98765 43210"
          aria-invalid={error ? true : undefined}
          aria-describedby={`${id}-help`}
        />
        <p
          id={`${id}-help`}
          className={cn("text-[12.5px]", error ? "text-danger" : "text-ink-muted")}
        >
          {error ??
            "Only so the host of a plan you join can reach you if you are late or lost. Never shown on your profile."}
        </p>
      </div>
      <ToggleRow
        checked={share}
        onChange={onShare}
        title="Share it with hosts"
        text="The host of a plan you join sees it until a day after the plan. Off means nobody sees it."
      />
    </div>
  );
}
