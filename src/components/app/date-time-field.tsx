"use client";

import * as React from "react";
import { CalendarDaysIcon, ChevronLeftIcon, ChevronRightIcon, ClockIcon } from "lucide-react";
import { cn } from "cn";
import { GlassSheet } from "@/components/app/glass-sheet";
import { GlideTabs } from "@/components/app/glide-tabs";
import { RollingNumber } from "@/components/app/rolling-number";

// Dates are kept as text, the same way the browser's own date boxes did: "2026-11-20" for a day and "2026-11-20T18:00" for a day
// and a time, both in the person's own time. Text in this shape sorts in time order, so it can be compared as it is.

const pad = (n: number) => String(n).padStart(2, "0");
const dayKey = (year: number, month: number, day: number) =>
  `${year}-${pad(month + 1)}-${pad(day)}`;
const dayOf = (date: Date) => dayKey(date.getFullYear(), date.getMonth(), date.getDate());
const timeOf = (date: Date) => `${pad(date.getHours())}:${pad(date.getMinutes())}`;

function parseDay(value: string): { year: number; month: number; day: number } | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(value);
  if (!match) return null;
  return { year: Number(match[1]), month: Number(match[2]) - 1, day: Number(match[3]) };
}

const WEEKDAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const MONTHS = Array.from({ length: 12 }, (_, month) =>
  new Date(2000, month, 1).toLocaleDateString(undefined, { month: "long" }),
);

/** "Sat, 22 Nov" and "6:00 PM", the way the field shows a choice. */
export function formatPicked(value: string, mode: "date" | "datetime"): string {
  const day = parseDay(value);
  if (!day) return "";
  const date = new Date(day.year, day.month, day.day);
  const text = date.toLocaleDateString(undefined, {
    weekday: "short",
    day: "numeric",
    month: "short",
    ...(date.getFullYear() !== new Date().getFullYear() ? { year: "numeric" as const } : {}),
  });
  if (mode === "date") return text;
  const time = /T(\d{2}):(\d{2})/.exec(value);
  if (!time) return text;
  const at = new Date(2000, 0, 1, Number(time[1]), Number(time[2]));
  return `${text} · ${at.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" })}`;
}

type Quick = { label: string; value: string };

/** A few sensible choices to start from, so most people never open the calendar: this evening, tomorrow, the weekend. */
function quickOptions(mode: "date" | "datetime", now: Date): Quick[] {
  const at = (days: number, hour: number) =>
    new Date(now.getFullYear(), now.getMonth(), now.getDate() + days, hour, 0, 0, 0);
  const value = (date: Date) => (mode === "date" ? dayOf(date) : `${dayOf(date)}T${timeOf(date)}`);
  if (mode === "date")
    return [
      { label: "Tomorrow", value: value(at(1, 0)) },
      { label: "In a week", value: value(at(7, 0)) },
      { label: "In 2 weeks", value: value(at(14, 0)) },
      { label: "In a month", value: value(at(30, 0)) },
    ];
  const list: Quick[] = [];
  for (const hour of [18, 20]) {
    const date = at(0, hour);
    if (date.getTime() > now.getTime() + 30 * 60_000)
      list.push({ label: `Today ${hour - 12} pm`, value: value(date) });
  }
  list.push({ label: "Tomorrow 6 pm", value: value(at(1, 18)) });
  const day = now.getDay();
  list.push({ label: "Saturday 5 pm", value: value(at((6 - day + 7) % 7 || 7, 17)) });
  list.push({ label: "Sunday 5 pm", value: value(at((7 - day) % 7 || 7, 17)) });
  return list.slice(0, 4);
}

/**
 * One column of a time wheel. It scrolls and snaps, and whatever sits under the band in the middle is the choice. A tap on an
 * item moves it to the middle too, so the wheel also works without scrolling.
 */
function Wheel<T extends string | number>({
  label,
  items,
  value,
  onChange,
  className,
}: {
  label: string;
  items: { value: T; label: string }[];
  value: T;
  onChange: (value: T) => void;
  className?: string;
}) {
  const ROW = 44;
  const box = React.useRef<HTMLDivElement>(null);
  const timer = React.useRef<number | null>(null);
  const settled = React.useRef(false);
  const index = Math.max(
    0,
    items.findIndex((item) => item.value === value),
  );

  // Put the choice in the middle: at once the first time, with a glide after that.
  React.useLayoutEffect(() => {
    const el = box.current;
    if (!el) return;
    if (Math.abs(el.scrollTop - index * ROW) < 2) {
      settled.current = true;
      return;
    }
    el.scrollTo({ top: index * ROW, behavior: settled.current ? "smooth" : "auto" });
    settled.current = true;
  }, [index]);
  React.useEffect(
    () => () => {
      if (timer.current !== null) window.clearTimeout(timer.current);
    },
    [],
  );

  function onScroll() {
    if (timer.current !== null) window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => {
      const el = box.current;
      if (!el) return;
      const next = items[Math.min(items.length - 1, Math.max(0, Math.round(el.scrollTop / ROW)))];
      if (next && next.value !== value) onChange(next.value);
    }, 90);
  }

  return (
    <div className={cn("relative", className)}>
      <div
        ref={box}
        role="listbox"
        aria-label={label}
        onScroll={onScroll}
        className="no-scrollbar h-[220px] snap-y snap-mandatory overflow-y-auto overscroll-contain scroll-smooth [mask-image:linear-gradient(to_bottom,transparent,black_28%,black_72%,transparent)]"
      >
        <div aria-hidden="true" className="h-[88px]" />
        {items.map((item) => (
          <button
            key={String(item.value)}
            type="button"
            role="option"
            aria-selected={item.value === value}
            onClick={() => onChange(item.value)}
            className={cn(
              "tabular flex h-[44px] w-full snap-center items-center justify-center text-[19px] outline-none transition-[color,font-weight] duration-150",
              item.value === value ? "font-semibold text-ink" : "text-ink-muted",
            )}
          >
            {item.label}
          </button>
        ))}
        <div aria-hidden="true" className="h-[88px]" />
      </div>
      <span
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 top-[88px] h-[44px] rounded-[12px] border border-white/[0.14] bg-white/[0.06]"
      />
    </div>
  );
}

const HOURS = Array.from({ length: 12 }, (_, i) => ({ value: i + 1, label: String(i + 1) }));

/** The time wheels: hour, minute and am or pm. Minutes go in fives, and an odd minute that is already set stays in the list. */
function TimeWheels({ value, onChange }: { value: string; onChange: (value: string) => void }) {
  const [hour24, minute] = value.split(":").map(Number) as [number, number];
  const pm = hour24 >= 12;
  const hour12 = hour24 % 12 === 0 ? 12 : hour24 % 12;
  const minutes = React.useMemo(() => {
    const set = new Set<number>(Array.from({ length: 12 }, (_, i) => i * 5));
    set.add(minute);
    return [...set].sort((a, b) => a - b).map((m) => ({ value: m, label: pad(m) }));
  }, [minute]);
  const set = (h12: number, m: number, isPm: boolean) =>
    onChange(`${pad((h12 % 12) + (isPm ? 12 : 0))}:${pad(m)}`);
  return (
    <div className="grid grid-cols-[1fr_1fr_1fr] gap-2 rounded-[18px] border border-white/10 bg-black/[0.12] px-3 py-2">
      <Wheel label="Hour" items={HOURS} value={hour12} onChange={(next) => set(next, minute, pm)} />
      <Wheel
        label="Minute"
        items={minutes}
        value={minute}
        onChange={(next) => set(hour12, next, pm)}
      />
      <Wheel
        label="Am or pm"
        items={[
          { value: "am", label: "am" },
          { value: "pm", label: "pm" },
        ]}
        value={pm ? "pm" : "am"}
        onChange={(next) => set(hour12, minute, next === "pm")}
      />
    </div>
  );
}

const TIME_QUICK = [
  { label: "7 am", value: "07:00" },
  { label: "12 pm", value: "12:00" },
  { label: "5 pm", value: "17:00" },
  { label: "6 pm", value: "18:00" },
  { label: "8 pm", value: "20:00" },
];

function QuickChip({
  pressed,
  onClick,
  children,
}: {
  pressed?: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      aria-pressed={pressed}
      onClick={onClick}
      className={cn(
        "inline-flex h-8 shrink-0 items-center rounded-full border px-3 text-[12.5px] font-semibold outline-none transition-[background-color,border-color,color,transform] duration-200 focus-visible:ring-2 focus-visible:ring-ring active:scale-95",
        pressed
          ? "border-white/25 bg-white/[0.14] text-ink"
          : "border-white/10 bg-white/[0.04] text-ink-muted hover:border-white/25 hover:text-ink",
      )}
    >
      {children}
    </button>
  );
}

/** A month of days. Moving to another month slides it in from the side it came from. */
function Calendar({
  selected,
  min,
  max,
  onPick,
}: {
  selected: string;
  min?: string;
  max?: string;
  onPick: (day: string) => void;
}) {
  const [today] = React.useState(() => new Date());
  const start = parseDay(selected) ??
    parseDay(min ?? "") ?? {
      year: today.getFullYear(),
      month: today.getMonth(),
      day: 1,
    };
  const [view, setView] = React.useState({ year: start.year, month: start.month });
  const [dir, setDir] = React.useState<1 | -1>(1);
  const minDay = min?.slice(0, 10);
  const maxDay = max?.slice(0, 10);
  const first = new Date(view.year, view.month, 1);
  const lead = (first.getDay() + 6) % 7;
  const count = new Date(view.year, view.month + 1, 0).getDate();
  const todayKey = dayOf(today);

  const shift = (by: 1 | -1) => {
    setDir(by);
    const next = new Date(view.year, view.month + by, 1);
    setView({ year: next.getFullYear(), month: next.getMonth() });
  };
  const monthEnd = dayKey(view.year, view.month, count);
  const monthStart = dayKey(view.year, view.month, 1);
  const canPrev = !minDay || monthStart > minDay;
  const canNext = !maxDay || monthEnd < maxDay;

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-between">
        <button
          type="button"
          aria-label="Earlier month"
          onClick={() => shift(-1)}
          disabled={!canPrev}
          className="inline-flex size-10 items-center justify-center rounded-full text-ink-muted outline-none transition-[background-color,color,transform] hover:bg-white/10 hover:text-ink focus-visible:ring-2 focus-visible:ring-ring active:scale-90 disabled:opacity-30"
        >
          <ChevronLeftIcon aria-hidden="true" className="size-5" />
        </button>
        <p aria-live="polite" className="flex items-center gap-1.5 text-[15.5px] font-semibold">
          {MONTHS[view.month]} <RollingNumber value={view.year} className="text-[15.5px]" />
          <span className="sr-only">{view.year}</span>
        </p>
        <button
          type="button"
          aria-label="Later month"
          onClick={() => shift(1)}
          disabled={!canNext}
          className="inline-flex size-10 items-center justify-center rounded-full text-ink-muted outline-none transition-[background-color,color,transform] hover:bg-white/10 hover:text-ink focus-visible:ring-2 focus-visible:ring-ring active:scale-90 disabled:opacity-30"
        >
          <ChevronRightIcon aria-hidden="true" className="size-5" />
        </button>
      </div>
      <div className="grid grid-cols-7 text-center text-[11px] font-bold uppercase tracking-[0.08em] text-ink-muted">
        {WEEKDAYS.map((name) => (
          <span key={name} className="py-1">
            {name}
          </span>
        ))}
      </div>
      <div className="overflow-hidden">
        <div
          key={`${view.year}-${view.month}`}
          className={dir === 1 ? "cal-next" : "cal-prev"}
          role="grid"
          aria-label={`${MONTHS[view.month]} ${view.year}`}
        >
          <div className="grid grid-cols-7 gap-y-1">
            {Array.from({ length: lead }, (_, i) => (
              <span key={`blank-${i}`} aria-hidden="true" />
            ))}
            {Array.from({ length: count }, (_, i) => {
              const day = i + 1;
              const key = dayKey(view.year, view.month, day);
              const off =
                (minDay !== undefined && key < minDay) || (maxDay !== undefined && key > maxDay);
              const chosen = key === selected.slice(0, 10);
              const full = new Date(view.year, view.month, day).toLocaleDateString(undefined, {
                weekday: "long",
                day: "numeric",
                month: "long",
                year: "numeric",
              });
              return (
                <button
                  key={key}
                  type="button"
                  aria-label={full}
                  aria-pressed={chosen}
                  disabled={off}
                  onClick={() => onPick(key)}
                  className={cn(
                    "tabular relative mx-auto flex size-11 items-center justify-center rounded-full text-[15px] outline-none transition-[background-color,color,transform,box-shadow] duration-150 focus-visible:ring-2 focus-visible:ring-ring active:scale-90 disabled:pointer-events-none disabled:opacity-25",
                    chosen
                      ? "border border-white/30 bg-[#7d74e0]/55 font-semibold text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.28)]"
                      : "text-ink hover:bg-white/10",
                  )}
                >
                  {day}
                  {key === todayKey && !chosen ? (
                    <span
                      aria-hidden="true"
                      className="absolute bottom-1.5 size-1 rounded-full bg-[#b9b4ee]"
                    />
                  ) : null}
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

/**
 * A date, or a date and a time, on one glass field. It opens a glass sheet with a few quick choices, a calendar that slides from
 * month to month, and (for a time) wheels you scroll. Nothing is typed. `value` and `min` and `max` are text like the browser's
 * own date boxes ("2026-11-20", "2026-11-20T18:00"), so this can replace them one for one.
 */
export function DateTimeField({
  label,
  value,
  onChange,
  mode = "datetime",
  min,
  max,
  placeholder,
  clearable = false,
  className,
  ...aria
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  mode?: "date" | "datetime";
  min?: string;
  max?: string;
  placeholder?: string;
  /** Show a Clear button, for a date that is optional. */
  clearable?: boolean;
  className?: string;
} & Omit<React.ComponentProps<"button">, "value" | "onChange" | "type">) {
  const [open, setOpen] = React.useState(false);
  const [tab, setTab] = React.useState<"date" | "time">("date");
  const [day, setDay] = React.useState("");
  const [time, setTime] = React.useState("18:00");
  const [now, setNow] = React.useState(() => new Date());

  function openSheet() {
    setNow(new Date());
    setDay(value ? value.slice(0, 10) : "");
    setTime(/T(\d{2}:\d{2})/.exec(value)?.[1] ?? "18:00");
    setTab("date");
    setOpen(true);
  }

  const candidate = day ? (mode === "date" ? day : `${day}T${time}`) : "";
  const early = Boolean(candidate && min && candidate < min);
  const late = Boolean(candidate && max && candidate > max);
  const problem = early
    ? mode === "date"
      ? "That day has passed."
      : "That time has passed. Pick a later time."
    : late
      ? "That is too far ahead."
      : null;

  function commit(next: string) {
    onChange(next);
    setOpen(false);
  }
  const quick = React.useMemo(
    () =>
      quickOptions(mode, now).filter(
        (option) => (!min || option.value >= min) && (!max || option.value <= max),
      ),
    [mode, now, min, max],
  );

  return (
    <>
      <button
        type="button"
        {...aria}
        aria-haspopup="dialog"
        onClick={openSheet}
        className={cn(
          "flex h-11 w-full min-w-0 items-center gap-2.5 rounded-[14px] border border-white/[0.13] bg-white/[0.065] px-3.5 text-left text-[14.5px] shadow-[inset_0_1px_0_rgba(255,255,255,0.07)] outline-none transition-[border-color,box-shadow,background-color] duration-200 hover:border-white/25 hover:bg-white/[0.085] focus-visible:border-[#8f86f0] focus-visible:ring-[3px] focus-visible:ring-[#8f86f0]/25 aria-[invalid=true]:border-destructive",
          className,
        )}
      >
        <CalendarDaysIcon aria-hidden="true" className="size-[1.1rem] shrink-0 text-ink-muted" />
        <span
          className={cn("min-w-0 flex-1 truncate", value ? "text-foreground" : "text-ink-muted/55")}
        >
          {value
            ? formatPicked(value, mode)
            : (placeholder ?? (mode === "date" ? "Pick a day" : "Pick a day and time"))}
        </span>
      </button>
      <GlassSheet open={open} onOpenChange={setOpen} title={label}>
        <div className="pro-scroll -mx-1 min-h-0 flex-1 overflow-y-auto overscroll-contain px-1 pt-1 pb-3">
          <div className="flex flex-col gap-4">
            {mode === "datetime" ? (
              <GlideTabs
                label="Day or time"
                value={tab}
                onChange={setTab}
                tabs={[
                  { value: "date", label: day ? formatPicked(day, "date") : "Day" },
                  { value: "time", label: formatTime(time) },
                ]}
              />
            ) : null}
            {tab === "date" || mode === "date" ? (
              <>
                {quick.length ? (
                  <div role="group" aria-label="Quick choices" className="flex flex-wrap gap-2">
                    {quick.map((option) => (
                      <QuickChip
                        key={option.label}
                        pressed={value === option.value}
                        onClick={() => commit(option.value)}
                      >
                        {option.label}
                      </QuickChip>
                    ))}
                  </div>
                ) : null}
                <Calendar
                  selected={day}
                  min={min}
                  max={max}
                  onPick={(picked) => {
                    setDay(picked);
                    if (mode === "date") commit(picked);
                    else setTab("time");
                  }}
                />
              </>
            ) : (
              <>
                <div role="group" aria-label="Quick times" className="flex flex-wrap gap-2">
                  {TIME_QUICK.map((option) => (
                    <QuickChip
                      key={option.label}
                      pressed={time === option.value}
                      onClick={() => setTime(option.value)}
                    >
                      {option.label}
                    </QuickChip>
                  ))}
                </div>
                <TimeWheels value={time} onChange={setTime} />
              </>
            )}
            {problem ? (
              <p role="alert" className="text-[13px] font-medium text-danger">
                {problem}
              </p>
            ) : null}
          </div>
        </div>
        {mode === "datetime" ? (
          <div className="flex gap-2.5 pt-2">
            {clearable && value ? (
              <button type="button" onClick={() => commit("")} className="profile-btn flex-1">
                Clear
              </button>
            ) : tab === "time" ? (
              <button type="button" onClick={() => setTab("date")} className="profile-btn flex-1">
                <ClockIcon aria-hidden="true" /> Change day
              </button>
            ) : null}
            <button
              type="button"
              disabled={!day || Boolean(problem)}
              onClick={() => (tab === "date" ? setTab("time") : commit(candidate))}
              className="profile-btn profile-btn-primary flex-1 disabled:opacity-50"
            >
              {tab === "date" ? "Next: time" : "Done"}
            </button>
          </div>
        ) : clearable && value ? (
          <div className="flex pt-2">
            <button type="button" onClick={() => commit("")} className="profile-btn w-full">
              Clear the date
            </button>
          </div>
        ) : null}
      </GlassSheet>
    </>
  );
}

function formatTime(time: string): string {
  const [h, m] = time.split(":").map(Number) as [number, number];
  return new Date(2000, 0, 1, h, m).toLocaleTimeString(undefined, {
    hour: "numeric",
    minute: "2-digit",
  });
}
