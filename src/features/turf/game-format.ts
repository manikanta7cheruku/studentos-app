import type { Game } from "@/lib/api/endpoints";
import { dayLabel } from "@/lib/format";

/** The sports offered as chips. Anything else is typed in as a custom name. */
export const SPORTS = ["football", "cricket", "badminton", "basketball"] as const;

export function titleCase(value: string): string {
  return value.replace(/\b\w/g, (char) => char.toUpperCase());
}

const clock = (date: Date) =>
  date.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });

/** "Tomorrow" or "Saturday 22 Nov", and "6:00 PM to 7:00 PM". */
export function whenParts(game: Pick<Game, "starts_at" | "hours">): { day: string; time: string } {
  const start = new Date(game.starts_at);
  const end = new Date(start.getTime() + game.hours * 3_600_000);
  return { day: dayLabel(game.starts_at), time: `${clock(start)} to ${clock(end)}` };
}

/** Has the game finished? */
export function isOver(game: Pick<Game, "starts_at" | "hours">, now = Date.now()): boolean {
  return new Date(game.starts_at).getTime() + game.hours * 3_600_000 <= now;
}

export const spotsLeft = (game: Pick<Game, "capacity" | "joined_count">) =>
  Math.max(game.capacity - game.joined_count, 0);

/** The one short label on a game card and at the top of a game. */
export function statusOf(
  game: Game,
  now = Date.now(),
): { text: string; tone: "good" | "quiet" | "warn" } {
  if (game.status === "cancelled") return { text: "Cancelled", tone: "warn" };
  if (isOver(game, now)) return { text: "Played", tone: "quiet" };
  if (game.is_host) return { text: "Hosting", tone: "good" };
  if (game.my_status === "joined") return { text: "You are in", tone: "good" };
  if (game.my_status === "requested") return { text: "Requested", tone: "quiet" };
  if (game.my_status === "waitlist")
    return { text: game.my_place ? `Waiting, number ${game.my_place}` : "Waiting", tone: "quiet" };
  const left = spotsLeft(game);
  if (left === 0) return { text: "Full", tone: "warn" };
  return { text: `${left} ${left === 1 ? "place" : "places"} left`, tone: "quiet" };
}
