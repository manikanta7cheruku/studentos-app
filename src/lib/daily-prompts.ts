// The question of the day on Buzz. One question for everybody, the same all day, written here so nothing has to be set up.
// A buzz that answers it stores the key (q0, q1, ...), and the feed shows a small "Question of the day" label on it.

export const DAILY_PROMPTS = [
  "What is one thing every fresher should know in the first week?",
  "Best cheap meal near campus? Give the name and what to order.",
  "What helped you most to understand a hard subject?",
  "Which club or event is worth joining this semester?",
  "What is a small habit that changed your college life?",
  "Hot take: what is overrated in college?",
  "What would you tell yourself on day one?",
  "Which skill do you wish you had started earlier?",
  "What is the most useful free tool you use as a student?",
  "Ask anything you were afraid to ask. No judgement.",
  "Morning person or night owl? How do you study?",
  "What is the best advice a senior gave you?",
  "What are you building or learning this week?",
  "Which movie, series or book do you recommend right now?",
  "What is one thing you are proud of this month?",
  "Notes or videos: how do you actually prepare for exams?",
  "Which place on campus is your favourite and why?",
  "What would make your college better by next semester?",
  "What is one thing you want to try but have not yet?",
  "Internship or project first? Share your view.",
  "What is the one app you cannot study without?",
  "What helped you when you felt stuck or low?",
  "Recommend a person on campus everyone should meet.",
  "What do you wish your college taught?",
  "Weekend plan: what are you doing and who wants to join?",
  "Best playlist or sound for focusing?",
  "What is a myth about your branch?",
  "Share a tiny win from this week.",
  "Which teacher or senior explained something better than anyone?",
  "What would you ask someone working in your dream job?",
] as const;

const DAY_MS = 86_400_000;

/** Today's question. `now` is only for tests. Uses the date on the device, so it flips at local midnight. */
export function promptOfTheDay(now: Date = new Date()): { key: string; text: string } {
  const day = Math.floor((now.getTime() - now.getTimezoneOffset() * 60_000) / DAY_MS);
  const index = ((day % DAILY_PROMPTS.length) + DAILY_PROMPTS.length) % DAILY_PROMPTS.length;
  return { key: `q${index}`, text: DAILY_PROMPTS[index]! };
}

export function promptByKey(key: string | null | undefined): string | null {
  const match = /^q(\d+)$/.exec(key ?? "");
  if (!match) return null;
  return DAILY_PROMPTS[Number(match[1])] ?? null;
}
