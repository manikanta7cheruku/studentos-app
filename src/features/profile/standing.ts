// A person's standing on StudentOS. It is meant to be hard to get and to mean something: it measures what OTHER people got from you
// (upvotes from them, a debate that drew a crowd, a plan that filled, an event people came to, a friend who really joined), not
// how much you posted. Higher levels also need time as a member, so nobody can reach them in a weekend. The server only counts
// (profile_contributions); the level and the badges are worked out here from those counts, so they can be changed without a
// migration.

export type Counts = {
  buzz: number;
  replies: number;
  plans: number;
  events: number;
  upvotes: number;
  debates: number;
  invited: number;
  /** Debates the person started that drew 8 or more people. */
  crowd_debates: number;
  /** Plans where 3 or more people were accepted. */
  filled_plans: number;
  /** Events where 8 or more people said they were going. */
  big_events: number;
  member_days: number;
};

export const POINTS = {
  upvote: 2,
  crowdDebate: 25,
  filledPlan: 30,
  bigEvent: 40,
  invited: 15,
  reply: 0.25,
  /** Replies are cheap, so they stop counting after this many points. */
  replyCap: 50,
} as const;

export type Level = {
  n: number;
  name: string;
  points: number;
  /** Days as a member needed for this level, whatever the points. */
  days: number;
  /** Two colours of the emblem. */
  tint: [string, string];
};

export const LEVELS: Level[] = [
  { n: 0, name: "Newcomer", points: 0, days: 0, tint: ["#8a8fa6", "#5b6074"] },
  { n: 1, name: "Contributor", points: 40, days: 0, tint: ["#2fb98a", "#2f90b9"] },
  { n: 2, name: "Regular", points: 150, days: 14, tint: ["#4f6fe0", "#2f9fd0"] },
  { n: 3, name: "Trusted", points: 400, days: 30, tint: ["#8f86f0", "#5b54d6"] },
  { n: 4, name: "Respected", points: 900, days: 60, tint: ["#f0c36a", "#e0866a"] },
  { n: 5, name: "Pillar", points: 2000, days: 120, tint: ["#f6dca0", "#d6549a"] },
];

export type Row = { key: string; label: string; detail: string; points: number };

export type Standing = {
  score: number;
  level: Level;
  next: Level | null;
  /** 0 to 1 towards the next level (1 when only the time is missing). */
  progress: number;
  pointsToNext: number;
  daysToNext: number;
  rows: Row[];
};

const plural = (n: number, one: string, many = `${one}s`) => `${n} ${n === 1 ? one : many}`;

export function standingOf(counts: Counts): Standing {
  const replyPoints = Math.min(Math.round(counts.replies * POINTS.reply), POINTS.replyCap);
  const rows: Row[] = [
    {
      key: "recognition",
      label: "Recognition",
      detail: `${plural(counts.upvotes, "upvote")} from other people`,
      points: counts.upvotes * POINTS.upvote,
    },
    {
      key: "debates",
      label: "Debates that drew a crowd",
      detail: `${plural(counts.crowd_debates, "debate")} with 8 or more people`,
      points: counts.crowd_debates * POINTS.crowdDebate,
    },
    {
      key: "plans",
      label: "Plans that filled",
      detail: `${plural(counts.filled_plans, "plan")} with 3 or more people`,
      points: counts.filled_plans * POINTS.filledPlan,
    },
    {
      key: "events",
      label: "Events people came to",
      detail: `${plural(counts.big_events, "event")} with 8 or more going`,
      points: counts.big_events * POINTS.bigEvent,
    },
    {
      key: "friends",
      label: "Friends who joined",
      detail: `${plural(counts.invited, "friend")} who finished the tour`,
      points: counts.invited * POINTS.invited,
    },
    {
      key: "replies",
      label: "Helping in replies",
      detail: `${plural(counts.replies, "reply", "replies")}, counted up to ${POINTS.replyCap} points`,
      points: replyPoints,
    },
  ];
  const score = rows.reduce((sum, row) => sum + row.points, 0);
  // The highest level whose points AND days are both met.
  const level =
    [...LEVELS].reverse().find((l) => score >= l.points && counts.member_days >= l.days) ??
    LEVELS[0]!;
  const next = LEVELS[level.n + 1] ?? null;
  const pointsToNext = next ? Math.max(next.points - score, 0) : 0;
  const daysToNext = next ? Math.max(next.days - counts.member_days, 0) : 0;
  const progress = next
    ? Math.min(Math.max((score - level.points) / Math.max(next.points - level.points, 1), 0), 1)
    : 1;
  return { score, level, next, progress, pointsToNext, daysToNext, rows };
}

export type Badge = {
  key: string;
  label: string;
  /** What it takes, in plain words. */
  text: string;
  earned: boolean;
  /** 0 to 1. */
  progress: number;
  progressText: string;
};

/** Badges are rare on purpose. Each one is a real thing other people noticed, and an unearned one shows what it takes. */
export function badgesOf(counts: Counts): Badge[] {
  const simple = (key: string, label: string, text: string, have: number, need: number): Badge => ({
    key,
    label,
    text,
    earned: have >= need,
    progress: Math.min(have / need, 1),
    progressText: `${Math.min(have, need)} / ${need}`,
  });
  const days = Math.min(counts.member_days, 90);
  const upvotes = Math.min(counts.upvotes, 50);
  return [
    simple("voice", "Respected voice", "100 upvotes from other people", counts.upvotes, 100),
    simple(
      "crowd",
      "Crowd puller",
      "3 debates that drew 8 or more people",
      counts.crowd_debates,
      3,
    ),
    simple(
      "builder",
      "Team builder",
      "3 plans that filled with 3 or more people",
      counts.filled_plans,
      3,
    ),
    simple("host", "Event host", "2 events with 8 or more going", counts.big_events, 2),
    simple(
      "connector",
      "Connector",
      "5 friends who joined and finished the tour",
      counts.invited,
      5,
    ),
    {
      key: "long-haul",
      label: "Long haul",
      text: "90 days as a member and 50 upvotes",
      earned: days >= 90 && upvotes >= 50,
      progress: Math.min(days / 90, upvotes / 50),
      progressText: `${days} / 90 days · ${upvotes} / 50 upvotes`,
    },
  ];
}
