import type { Venue } from "@/lib/api/endpoints";
import { formatInr } from "@/lib/format";

/** 6 -> "6 am", 13 -> "1 pm", 0 and 24 -> "12 am". */
export function hourLabel(hour: number): string {
  const h = hour % 24;
  const suffix = h < 12 ? "am" : "pm";
  return `${h % 12 === 0 ? 12 : h % 12} ${suffix}`;
}

/** "6 pm to 8 pm" for a start hour and a number of hours. */
export function rangeLabel(start: number, hours: number): string {
  return `${hourLabel(start)} to ${hourLabel(start + hours)}`;
}

export function priceLabel(venue: Pick<Venue, "price_inr_per_hour">): string {
  return venue.price_inr_per_hour === null
    ? "Ask the venue"
    : venue.price_inr_per_hour === 0
      ? "Free"
      : `${formatInr(venue.price_inr_per_hour)} an hour`;
}

/** The days a person can ask for: today and the next 13, as { key: "2026-11-20", label, long }. */
export function nextDays(
  count = 14,
  from = new Date(),
): { key: string; top: string; day: string }[] {
  const pad = (n: number) => String(n).padStart(2, "0");
  return Array.from({ length: count }, (_, index) => {
    const date = new Date(from.getFullYear(), from.getMonth(), from.getDate() + index);
    return {
      key: `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`,
      top:
        index === 0
          ? "Today"
          : index === 1
            ? "Tomorrow"
            : date.toLocaleDateString(undefined, { weekday: "short" }),
      day: date.toLocaleDateString(undefined, { day: "numeric", month: "short" }),
    };
  });
}

/** A day key ("2026-11-20") and an hour as a real date, for starting a plan at that time. */
export function atHour(dayKey: string, hour: number): Date {
  const [y, m, d] = dayKey.split("-").map(Number) as [number, number, number];
  return new Date(y, m - 1, d, hour, 0, 0, 0);
}

export function dayLabel(dayKey: string): string {
  return atHour(dayKey, 12).toLocaleDateString(undefined, {
    weekday: "short",
    day: "numeric",
    month: "short",
  });
}

export const SPORTS = [
  "football",
  "cricket",
  "badminton",
  "basketball",
  "tennis",
  "volleyball",
  "table tennis",
  "pickleball",
] as const;

export function titleCase(value: string): string {
  return value.replace(/\b\w/g, (char) => char.toUpperCase());
}
