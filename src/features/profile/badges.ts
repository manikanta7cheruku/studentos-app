// Badges are worked out from the contribution counts, so there is nothing to store. They reward giving, not posting a lot:
// the thresholds are low and none of them is about volume alone.

export type Counts = {
  buzz: number;
  replies: number;
  plans: number;
  events: number;
  upvotes: number;
  challenges: number;
  invited: number;
};

export type Badge = { key: string; label: string; text: string };

export function badgesFor(counts: Counts): Badge[] {
  const out: Badge[] = [];
  if (counts.challenges >= 10)
    out.push({ key: "champion", label: "Champion", text: "Finished 10 challenges" });
  else if (counts.challenges >= 4)
    out.push({ key: "regular", label: "Regular", text: "Finished 4 challenges" });
  else if (counts.challenges >= 1)
    out.push({ key: "challenger", label: "Challenger", text: "Finished a challenge" });
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
