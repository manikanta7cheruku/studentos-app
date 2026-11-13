// Weekly challenges. One for everybody each week, written here. The week is the ISO week (Monday to Sunday, UTC), so every
// person and the server agree on which challenge is current. Answering one adds to the contributions on a profile.

export const CHALLENGES = [
  {
    title: "Introduce yourself in one line",
    text: "Say who you are and one thing you are into. Make a stranger want to say hi.",
  },
  {
    title: "Teach something in 3 sentences",
    text: "Pick anything you know well and explain it so a first year gets it.",
  },
  {
    title: "Your best study trick",
    text: "Share one trick that actually works for you. Keep it short and honest.",
  },
  {
    title: "Find a hidden gem on campus",
    text: "A quiet corner, a cheap meal, a shortcut. Tell us where and why.",
  },
  {
    title: "Thank someone",
    text: "Name someone who helped you this month and what they did. No names needed if you prefer.",
  },
  {
    title: "Recommend one thing",
    text: "A book, a video, a person to follow, a tool. One recommendation, one reason.",
  },
  { title: "Share a tiny win", text: "Something small that went right this week. Small counts." },
  {
    title: "Ask a question you are curious about",
    text: "A real one. Someone here may know the answer.",
  },
  {
    title: "Plan something with others",
    text: "Suggest a match, a study group or a walk. Say when and where.",
  },
  {
    title: "Your one-line advice for freshers",
    text: "What do you wish you knew on day one? One line.",
  },
  {
    title: "Show your workspace in words",
    text: "Describe where and how you study or build. What would you change?",
  },
  {
    title: "A skill you want to learn next",
    text: "Tell us what and why. Someone may offer to learn it with you.",
  },
] as const;

/** "2026-W46" for the ISO week that contains `date` (UTC). */
export function weekKey(date: Date = new Date()): string {
  const d = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
  const day = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - day);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  const week = Math.ceil(((d.getTime() - yearStart.getTime()) / 86_400_000 + 1) / 7);
  return `${d.getUTCFullYear()}-W${String(week).padStart(2, "0")}`;
}

/** When this week's challenge ends: the next Monday 00:00 UTC. */
export function weekEndsAt(date: Date = new Date()): string {
  const d = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
  const day = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + (8 - day));
  return d.toISOString();
}

export function challengeFor(key: string): { title: string; text: string } {
  const week = Number(key.split("-W")[1] ?? 0);
  const year = Number(key.split("-W")[0] ?? 0);
  return CHALLENGES[(year * 53 + week) % CHALLENGES.length]!;
}
