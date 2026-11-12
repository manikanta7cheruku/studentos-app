// The suggestions on the "Your strengths" screen. They live here so the server can make sure each one exists in the skills
// catalog when someone taps it (even before the catalog migration has run), and nothing else gets created from a search.

export const SUGGESTED_SKILLS: { title: string; category: string; names: string[] }[] = [
  {
    title: "People skills",
    category: "Social",
    names: [
      "Communication",
      "Talkative",
      "Public speaking",
      "Teamwork",
      "Leadership",
      "Networking",
      "Active listening",
      "Empathy",
      "Negotiation",
      "Mentoring",
      "Event hosting",
      "Storytelling",
    ],
  },
  {
    title: "How you work",
    category: "Working style",
    names: [
      "Time management",
      "Problem solving",
      "Creativity",
      "Adaptability",
      "Critical thinking",
      "Organising",
    ],
  },
  {
    title: "Tech and creative",
    category: "Creative",
    names: ["Python", "React", "Figma", "Video editing", "Content writing", "Photography"],
  },
];

/** The suggested skill that a search word names exactly (ignoring letter case), with its category, or null. */
export function suggestedSkill(word: string): { name: string; category: string } | null {
  const wanted = word.trim().toLowerCase();
  for (const group of SUGGESTED_SKILLS) {
    const name = group.names.find((n) => n.toLowerCase() === wanted);
    if (name) return { name, category: group.category };
  }
  return null;
}
