// A college name is typed by the person, so it can be nonsense. This catches the obvious cases (the checks run on the server too,
// so the API cannot be used to skip them). It cannot know that a college is real: the typed name is shown as "self reported", and
// the app suggests names that already exist so spellings stay the same.

const WORDS_THAT_ARE_NOT_NAMES = new Set([
  "test",
  "testing",
  "demo",
  "sample",
  "asdf",
  "qwerty",
  "none",
  "nil",
  "na",
  "no",
  "abc",
  "xyz",
  "xxx",
  "idk",
  "hello",
  "college",
  "school",
  "university",
  "my college",
  "nothing",
  "null",
  "undefined",
  "unknown",
  "private",
  "student",
]);
const KEYBOARD_MASH = ["asdf", "qwer", "zxcv", "hjkl", "uiop", "sdfg", "dfgh", "wert", "erty"];

/** A short reason in plain words when the text cannot be a college name, or null when it looks fine. */
export function collegeNameProblem(raw: string): string | null {
  const name = raw.replace(/\s+/g, " ").trim();
  const say =
    "That does not look like a college name. Type the full name, for example \u201cAlpha Institute of Technology\u201d.";
  if (name.length < 3 || name.length > 120) return say;
  const letters = [...name].filter((ch) => /\p{L}/u.test(ch));
  if (letters.length < 3) return say;
  // Mostly letters (with their vowel signs): digits and symbols are fine in a name ("St. Joseph's College 2"), but not instead of one.
  const marked = [...name].filter((ch) => /[\p{L}\p{M}]/u.test(ch));
  if (marked.length / name.replace(/\s/g, "").length < 0.6) return say;
  const lower = name.toLowerCase();
  if (WORDS_THAT_ARE_NOT_NAMES.has(lower)) return say;
  // The same letter four times in a row ("aaaa", "hhhhh"), or a run of keyboard keys.
  if (/(\p{L})\1{3,}/iu.test(name)) return say;
  if (KEYBOARD_MASH.some((run) => lower.replace(/[^a-z]/g, "").includes(run))) return say;
  // A lower or mixed case Latin word with no vowel is not a name ("xyz"). Capitals are fine: acronyms like SRM, BMS and GMR are real.
  const bare = name
    .split(/[^A-Za-z]+/)
    .filter((word) => word.length >= 3 && word !== word.toUpperCase());
  if (bare.some((word) => !/[aeiou]/i.test(word))) return say;
  return null;
}
