// The people of one college, as the Campus card on a profile shows them. Colleges are typed text, so two spellings that differ
// only in capitals or spaces are the same college.

export type CampusPerson = {
  user_id: string;
  display_name: string;
  avatar_url: string | null;
  college_name: string | null;
  interests: string[];
  tech_interests: string[];
  branch?: string | null;
  grad_year?: number | null;
};

const norm = (text: string) => text.replace(/\s+/g, " ").trim().toLowerCase();

export function sameCollege(a: string | null | undefined, b: string | null | undefined): boolean {
  return Boolean(a && b) && norm(a as string) === norm(b as string);
}

export function firstName(name: string): string {
  return name.trim().split(/\s+/)[0] ?? name;
}

/**
 * Everyone from the college, apart from the people left out (the profile's owner and the viewer), ordered by who is most likely
 * to matter to the viewer: the most interests in common first, then the same branch, then the same year, then by name so the
 * order never changes between visits. `names` are the first names of the first two, for the line under the count.
 */
export function campusPeople(input: {
  people: CampusPerson[];
  college: string;
  excludeIds: string[];
  viewerInterests?: string[];
  viewerBranch?: string | null;
  viewerYear?: number | null;
}): { count: number; list: CampusPerson[]; names: string[]; more: number } {
  const mine = new Set((input.viewerInterests ?? []).map(norm));
  const skip = new Set(input.excludeIds);
  const overlap = (person: CampusPerson) =>
    [...person.interests, ...person.tech_interests].filter((interest) => mine.has(norm(interest)))
      .length;
  const list = input.people
    .filter(
      (person) => !skip.has(person.user_id) && sameCollege(person.college_name, input.college),
    )
    .sort(
      (x, y) =>
        overlap(y) - overlap(x) ||
        Number(sameCollege(y.branch, input.viewerBranch)) -
          Number(sameCollege(x.branch, input.viewerBranch)) ||
        Number(y.grad_year === input.viewerYear) - Number(x.grad_year === input.viewerYear) ||
        x.display_name.localeCompare(y.display_name),
    );
  const names = list.slice(0, 2).map((person) => firstName(person.display_name));
  return { count: list.length, list, names, more: Math.max(0, list.length - names.length) };
}

/** The line under "18 students from SIIET": "Asha, Ravi and 16 more", "Asha and Ravi", or "Asha". */
export function namesLine(names: string[], more: number): string {
  if (names.length === 0) return "";
  if (more > 0) return `${names.join(", ")} and ${more} more`;
  return names.join(" and ");
}
