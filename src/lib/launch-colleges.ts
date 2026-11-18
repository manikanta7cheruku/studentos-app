// The colleges people can pick from during the first launch. Everyone else chooses Other and types the name; more colleges are
// added here as they join. `name` is saved exactly as written (it is the college's name on a profile), `short` is the name
// people use for it every day and is what the picker shows as a small badge and searches on.

export type LaunchCollege = { name: string; short: string };

export const LAUNCH_COLLEGES: readonly LaunchCollege[] = [
  { name: "AVN Institute of Engineering and Technology", short: "AVN" },
  { name: "Bharat Institute of Engineering & Technology (BIET)", short: "BIET" },
  { name: "CVR College of Engineering", short: "CVR" },
  { name: "Guru Nanak Institute of Technology", short: "GNIT" },
  { name: "Keshav Memorial College of Engineering", short: "KMCE" },
  { name: "Raja Mahendra College of Engineering", short: "RMCE" },
  { name: "Scient Institute of Technology", short: "SCIENT" },
  { name: "Siddhartha Institute of Engineering & Technology", short: "SIET" },
  { name: "Sree Dattha Institute of Engineering and Science", short: "SDIES" },
  { name: "Sri Indu Institute of Engineering and Technology", short: "SIIET" },
  { name: "Visvesvaraya College of Engineering and Technology (VCET)", short: "VCET" },
];

const same = (a: string, b: string) =>
  a.replace(/\s+/g, " ").trim().toLowerCase() === b.toLowerCase();

/** The listed college a saved name belongs to, or null when it is a name someone typed. */
export function listedCollege(name: string): LaunchCollege | null {
  return LAUNCH_COLLEGES.find((college) => same(name, college.name)) ?? null;
}

/** Colleges matching what is typed in the picker's search box (the name or the short name). Empty text lists them all. */
export function searchColleges(query: string): LaunchCollege[] {
  const text = query.trim().toLowerCase();
  if (!text) return [...LAUNCH_COLLEGES];
  return LAUNCH_COLLEGES.filter(
    (college) =>
      college.name.toLowerCase().includes(text) || college.short.toLowerCase().includes(text),
  );
}
