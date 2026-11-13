// Badges are worked out from the contribution counts, so there is nothing to store. They reward giving, not posting a lot:
// the thresholds are low and none of them is about volume alone.

export type Counts = {
  buzz: number;
  replies: number;
  plans: number;
  events: number;
  upvotes: number;
  debates: number;
  invited: number;
};

export type Badge = { key: string; label: string; text: string };

export function badgesFor(counts: Counts): Badge[] {
  const out: Badge[] = [];
  if (counts.debates >= 15)
    out.push({ key: "champion", label: "Debate champion", text: "Took part 15 times in debates" });
  else if (counts.debates >= 5)
    out.push({ key: "regular", label: "Debate regular", text: "Took part 5 times in debates" });
  else if (counts.debates >= 1)
    out.push({ key: "debater", label: "Debater", text: "Took part in a debate" });
  if (counts.upvotes >= 20)
    out.push({ key: "helpful", label: "Helpful", text: "Got 20 upvotes from others" });
  if (counts.plans >= 3)
    out.push({ key: "organiser", label: "Organiser", text: "Started 3 plans" });
  if (counts.events >= 1) out.push({ key: "host", label: "Host", text: "Put on an event" });
  if (counts.invited >= 3)
    out.push({ key: "connector", label: "Connector", text: "Brought 3 friends in" });
  if (counts.replies >= 10)
    out.push({ key: "voice", label: "Good voice", text: "Replied 10 times" });
  return out;
}
