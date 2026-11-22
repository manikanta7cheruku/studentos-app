/** How long a message stays after the other person opens it. The server only accepts these three. */
export const TIMER_OPTIONS = [
  { minutes: 60, label: "1 hour", text: "The default. Gone an hour after it is seen." },
  { minutes: 420, label: "7 hours", text: "For a conversation that goes on through the day." },
  { minutes: 1440, label: "24 hours", text: "The longest. Gone a day after it is seen." },
] as const;

export type TimerMinutes = (typeof TIMER_OPTIONS)[number]["minutes"];

export function timerLabel(minutes: number): string {
  return TIMER_OPTIONS.find((option) => option.minutes === minutes)?.label ?? "1 hour";
}
