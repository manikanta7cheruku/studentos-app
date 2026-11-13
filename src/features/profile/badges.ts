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

export type NextBadge = {
  label: string;
  have: number;
  need: number;
  remaining: string;
  hint: string;
};

/** The closest badge not earned yet, with how far along the person is. null when there is nothing left to chase. */
export function nextBadge(counts: Counts): NextBadge | null {
  const earned = new Set(badgesFor(counts).map((badge) => badge.key));
  const goals: {
    key: string;
    label: string;
    have: number;
    need: number;
    unit: string;
    hint: string;
  }[] = [
    {
      key: "debater",
      label: "Debater",
      have: counts.debates,
      need: 1,
      unit: "debate",
      hint: "Join a debate and make one argument.",
    },
    {
      key: "regular",
      label: "Debate regular",
      have: counts.debates,
      need: 5,
      unit: "debate",
      hint: "Take part in debates.",
    },
    {
      key: "champion",
      label: "Debate champion",
      have: counts.debates,
      need: 15,
      unit: "debate",
      hint: "Keep arguing. Strong points count too.",
    },
    {
      key: "host",
      label: "Host",
      have: counts.events,
      need: 1,
      unit: "event",
      hint: "Put on an event.",
    },
    {
      key: "organiser",
      label: "Organiser",
      have: counts.plans,
      need: 3,
      unit: "plan",
      hint: "Start plans others join.",
    },
    {
      key: "voice",
      label: "Good voice",
      have: counts.replies,
      need: 10,
      unit: "reply",
      hint: "Reply to buzz and help people out.",
    },
    {
      key: "connector",
      label: "Connector",
      have: counts.invited,
      need: 3,
      unit: "friend",
      hint: "Share your invite link from Settings.",
    },
    {
      key: "helpful",
      label: "Helpful",
      have: counts.upvotes,
      need: 20,
      unit: "upvote",
      hint: "Write things other people find useful.",
    },
  ];
  const open = goals.filter((goal) => !earned.has(goal.key) && goal.have < goal.need);
  if (!open.length) return null;
  // The one that is furthest along, as a share of what it needs.
  const best = open.reduce((a, b) => (b.have / b.need > a.have / a.need ? b : a));
  const left = best.need - best.have;
  return {
    label: best.label,
    have: best.have,
    need: best.need,
    remaining: `${left} more ${best.unit}${left === 1 ? "" : "s"}`,
    hint: `${left} more ${best.unit}${left === 1 ? "" : "s"}. ${best.hint}`,
  };
}
