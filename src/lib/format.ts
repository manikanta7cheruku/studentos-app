/** Whole rupees as "₹1,200". */
export function formatInr(amount: number): string {
  return `₹${amount.toLocaleString("en-IN")}`;
}

/** "Sat, 14 Nov, 6:30 PM". */
export function formatWhen(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleString(undefined, {
    weekday: "short",
    day: "numeric",
    month: "short",
    hour: "numeric",
    minute: "2-digit",
  });
}

/** "Today", "Tomorrow" or the weekday, for a heading above a day of events. */
export function dayLabel(iso: string, now: Date = new Date()): string {
  const date = new Date(iso);
  const start = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
  const days = Math.round((start(date) - start(now)) / 86_400_000);
  if (days === 0) return "Today";
  if (days === 1) return "Tomorrow";
  return date.toLocaleDateString(undefined, { weekday: "long", day: "numeric", month: "short" });
}
