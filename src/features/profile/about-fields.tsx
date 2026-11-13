"use client";

import * as React from "react";
import { PlusIcon, XIcon } from "lucide-react";
import { cn } from "cn";
import { ChoiceChips } from "@/components/ui/choice-chips";
import { Input } from "@/components/ui/input";
import { ToggleRow } from "@/components/app/toggle-row";
import { api } from "@/lib/api/endpoints";

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
      label="Gender"
      value={(value ?? "") as Sex}
      onChange={onChange}
      options={SEX_OPTIONS.map((option) => ({ value: option.value, label: option.label }))}
    />
  );
}

/**
 * A year on one line: minus, the year, plus. Tap the year to type it. Empty until picked: the first tap on either button
 * starts at `start`. Takes very little room, and never a long list to scroll.
 */
export function YearStepper({
  label,
  value,
  min,
  max,
  start,
  onChange,
}: {
  label: string;
  value: number | null;
  min: number;
  max: number;
  start: number;
  onChange: (value: number) => void;
}) {
  const [draft, setDraft] = React.useState<string | null>(null);
  const shown = draft ?? (value === null ? "" : String(value));
  const clamp = (year: number) => Math.min(max, Math.max(min, year));
  const step = (by: number) => onChange(clamp((value ?? start - by) + by));
  const button =
    "inline-flex size-10 shrink-0 items-center justify-center rounded-full text-[18px] font-semibold leading-none text-ink-muted outline-none transition-[background-color,color,transform] duration-150 hover:bg-white/10 hover:text-ink focus-visible:ring-2 focus-visible:ring-ring active:scale-90 disabled:opacity-30";
  return (
    <div
      role="group"
      aria-label={label}
      className="inline-flex h-11 items-center rounded-full border border-white/[0.13] bg-white/[0.065] px-0.5 shadow-[inset_0_1px_0_rgba(255,255,255,0.07)]"
    >
      <button
        type="button"
        aria-label={`Earlier ${label.toLowerCase()}`}
        onClick={() => step(-1)}
        disabled={value !== null && value <= min}
        className={button}
      >
        &minus;
      </button>
      <input
        inputMode="numeric"
        aria-label={label}
        value={shown}
        placeholder="Year"
        maxLength={4}
        onChange={(event) => {
          const digits = event.target.value.replace(/\D/g, "").slice(0, 4);
          setDraft(digits);
          if (digits.length === 4) {
            onChange(clamp(Number(digits)));
            setDraft(null);
          }
        }}
        onBlur={() => setDraft(null)}
        className="tabular w-16 bg-transparent text-center text-[15px] font-semibold outline-none placeholder:font-normal placeholder:text-ink-muted/60"
      />
      <button
        type="button"
        aria-label={`Later ${label.toLowerCase()}`}
        onClick={() => step(1)}
        disabled={value !== null && value >= max}
        className={button}
      >
        +
      </button>
    </div>
  );
}

/** Birth year, optional and private: one small button until it is set, then the year on one line with a way to remove it. */
export function BirthYearField({
  value,
  onChange,
}: {
  value: number | null;
  onChange: (value: number | null) => void;
}) {
  const [thisYear] = React.useState(() => new Date().getFullYear());
  return (
    <div className="flex items-center justify-between gap-3">
      <div className="min-w-0">
        <p className="text-[13px] font-semibold text-ink/90">
          Birth year <span className="font-normal text-ink-muted">(optional)</span>
        </p>
        <p className="text-[12.5px] text-ink-muted" aria-live="polite">
          {value
            ? `${thisYear - value} years old. Only you see this.`
            : "Private. We only keep the year."}
        </p>
      </div>
      {value === null ? (
        <button
          type="button"
          onClick={() => onChange(thisYear - 19)}
          className="inline-flex h-10 shrink-0 items-center rounded-full border border-white/10 bg-white/[0.05] px-4 text-[13px] font-semibold text-ink-muted outline-none transition-[background-color,color,transform] hover:bg-white/10 hover:text-ink focus-visible:ring-2 focus-visible:ring-ring active:scale-95"
        >
          Add
        </button>
      ) : (
        <div className="flex shrink-0 items-center gap-1.5">
          <YearStepper
            label="Birth year"
            value={value}
            min={thisYear - 60}
            max={thisYear - 10}
            start={thisYear - 19}
            onChange={onChange}
          />
          <button
            type="button"
            aria-label="Remove birth year"
            onClick={() => onChange(null)}
            className="inline-flex size-9 items-center justify-center rounded-full text-ink-muted outline-none hover:bg-white/10 hover:text-ink focus-visible:ring-2 focus-visible:ring-ring"
          >
            <XIcon aria-hidden="true" className="size-4" />
          </button>
        </div>
      )}
    </div>
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

export const BRANCHES = [
  "CSE",
  "IT",
  "AI & DS",
  "ECE",
  "EEE",
  "Mechanical",
  "Civil",
  "MBA",
  "BCA / MCA",
  "B.Sc",
  "B.Com / BBA",
] as const;

export const tidy = (text: string) => text.replace(/\s+/g, " ").trim();

/**
 * Where I study: the college (typed), the branch (a chip, or my own) and the year I graduate (a chip). All three are required.
 * Typed because Global is open to everybody, so this is how people tell where each other come from.
 */
export function StudyFields({
  college,
  branch,
  year,
  onCollege,
  onBranch,
  onYear,
  place,
  onPlace,
  errors = {},
}: {
  college: string;
  branch: string;
  year: number | null;
  onCollege: (value: string) => void;
  onBranch: (value: string) => void;
  onYear: (value: number) => void;
  place?: string;
  onPlace?: (value: string) => void;
  errors?: Record<string, string | undefined>;
}) {
  const known = (BRANCHES as readonly string[]).includes(branch);
  const [other, setOther] = React.useState(branch !== "" && !known);
  const chip =
    "inline-flex h-9 shrink-0 items-center rounded-full border px-3.5 text-[13px] font-semibold outline-none transition-[background-color,border-color,color,transform] duration-200 focus-visible:ring-2 focus-visible:ring-ring active:scale-95";
  const on = "bg-brand border-transparent text-white";
  const off = "border-white/10 bg-white/[0.04] text-ink-muted hover:border-white/25 hover:text-ink";
  const collegeId = React.useId();
  const placeId = React.useId();
  // Names that already exist, while typing, so spellings stay the same and nobody has to invent one.
  const [suggested, setSuggested] = React.useState<{ query: string; names: string[] } | null>(null);
  const typed = tidy(college);
  React.useEffect(() => {
    if (typed.length < 2) return;
    const controller = new AbortController();
    const timer = window.setTimeout(() => {
      api.colleges
        .suggest(typed, controller.signal)
        .then((names) => setSuggested({ query: typed, names }))
        .catch(() => undefined);
    }, 250);
    return () => {
      window.clearTimeout(timer);
      controller.abort();
    };
  }, [typed]);
  const names =
    suggested && suggested.query === typed
      ? suggested.names.filter((name) => name.toLowerCase() !== typed.toLowerCase())
      : [];
  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-col gap-1.5">
        <label htmlFor={collegeId} className="text-[13px] font-semibold text-ink/90">
          College <span className="font-normal text-ink-muted">(required)</span>
        </label>
        <Input
          id={collegeId}
          value={college}
          onChange={(event) => onCollege(event.target.value)}
          maxLength={120}
          autoComplete="organization"
          placeholder="Type your college name"
          aria-invalid={errors.college ? true : undefined}
        />
        <p className={cn("text-[12.5px]", errors.college ? "text-danger" : "text-ink-muted")}>
          {errors.college ?? "Shown on your profile so people know where you are from."}
        </p>
        {names.length ? (
          <div
            role="group"
            aria-label="Colleges already on StudentOS"
            className="flex flex-wrap gap-2"
          >
            {names.map((name) => (
              <button
                key={name}
                type="button"
                onClick={() => onCollege(name)}
                className="max-w-full truncate rounded-full border border-white/10 bg-white/[0.04] px-3 py-1.5 text-[12.5px] text-ink-muted outline-none transition-[border-color,color] hover:border-white/25 hover:text-ink focus-visible:ring-2 focus-visible:ring-ring"
              >
                {name}
              </button>
            ))}
          </div>
        ) : null}
      </div>
      <div className="flex flex-col gap-2">
        <p className="text-[13px] font-semibold text-ink/90">
          Branch <span className="font-normal text-ink-muted">(optional)</span>
        </p>
        <div role="group" aria-label="Branch" className="flex flex-wrap gap-2">
          {BRANCHES.map((name) => (
            <button
              key={name}
              type="button"
              aria-pressed={branch === name && !other}
              onClick={() => {
                setOther(false);
                onBranch(name);
              }}
              className={cn(chip, branch === name && !other ? on : off)}
            >
              {name}
            </button>
          ))}
          <button
            type="button"
            aria-pressed={other}
            onClick={() => {
              setOther(true);
              if (known) onBranch("");
            }}
            className={cn(chip, other ? on : off)}
          >
            Other
          </button>
        </div>
        {other ? (
          <Input
            aria-label="Your branch"
            value={branch}
            onChange={(event) => onBranch(event.target.value)}
            maxLength={60}
            placeholder="Your branch or course"
            autoFocus
          />
        ) : null}
        {errors.branch ? (
          <p className="text-[12.5px] font-medium text-danger">{errors.branch}</p>
        ) : null}
      </div>
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[13px] font-semibold text-ink/90">
            Graduating in <span className="font-normal text-ink-muted">(required)</span>
          </p>
          {errors.year ? (
            <p className="text-[12.5px] font-medium text-danger">{errors.year}</p>
          ) : (
            <p className="text-[12.5px] text-ink-muted">The year you finish.</p>
          )}
        </div>
        <YearStepper
          label="Graduation year"
          value={year}
          min={new Date().getFullYear() - 1}
          max={new Date().getFullYear() + 8}
          start={new Date().getFullYear() + 2}
          onChange={onYear}
        />
      </div>
      {onPlace ? (
        <div className="flex flex-col gap-1.5">
          <label htmlFor={placeId} className="text-[13px] font-semibold text-ink/90">
            Where do you live <span className="font-normal text-ink-muted">(optional)</span>
          </label>
          <Input
            id={placeId}
            value={place ?? ""}
            onChange={(event) => onPlace(event.target.value)}
            maxLength={80}
            autoComplete="address-level2"
            placeholder="Your city or area"
            aria-invalid={errors.place ? true : undefined}
          />
          <p className={cn("text-[12.5px]", errors.place ? "text-danger" : "text-ink-muted")}>
            {errors.place ?? "Helps classmates nearby find you. Only the name of the place."}
          </p>
        </div>
      ) : null}
    </div>
  );
}
