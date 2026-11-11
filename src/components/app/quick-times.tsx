"use client";

import * as React from "react";
import { cn } from "cn";

const pad = (n: number) => String(n).padStart(2, "0");
/** The value a datetime-local input takes: 2026-11-20T18:00 in local time. */
const local = (date: Date) =>
  `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;

type Option = { label: string; value: string };

/** A few sensible times to start from, so nobody has to open a date picker: this evening, tomorrow, the weekend. */
function options(now: Date): Option[] {
  const at = (days: number, hour: number) =>
    new Date(now.getFullYear(), now.getMonth(), now.getDate() + days, hour, 0, 0, 0);
  const list: Option[] = [];
  for (const hour of [18, 20]) {
    const date = at(0, hour);
    if (date.getTime() > now.getTime() + 30 * 60_000)
      list.push({ label: `Today ${hour > 12 ? hour - 12 : hour} pm`, value: local(date) });
  }
  list.push({ label: "Tomorrow 6 pm", value: local(at(1, 18)) });
  const day = now.getDay();
  const toSat = (6 - day + 7) % 7 || 7;
  const toSun = (7 - day) % 7 || 7;
  list.push({ label: "Saturday 5 pm", value: local(at(toSat, 17)) });
  list.push({ label: "Sunday 5 pm", value: local(at(toSun, 17)) });
  return list.slice(0, 5);
}

/** Chips that fill the start time with one tap. The date picker stays for any other time. */
export function QuickTimes({ value, onPick }: { value: string; onPick: (value: string) => void }) {
  // Read once when the form opens, so the chips do not change under a finger.
  const [list] = React.useState(() => options(new Date()));
  return (
    <div role="group" aria-label="Quick times" className="flex flex-wrap gap-2">
      {list.map((option) => (
        <button
          key={option.label}
          type="button"
          aria-pressed={value === option.value}
          onClick={() => onPick(option.value)}
          className={cn(
            "inline-flex h-8 items-center rounded-full border px-3 text-[12.5px] font-semibold outline-none transition-[background-color,border-color,color,transform] duration-200 focus-visible:ring-2 focus-visible:ring-ring active:scale-95",
            value === option.value
              ? "border-[#7d74e0]/60 bg-[#7d74e0]/20 text-[#e3e0fb]"
              : "border-white/10 bg-white/[0.04] text-ink-muted hover:border-white/25 hover:text-ink",
          )}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}
