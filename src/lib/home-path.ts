/** The slug of the open space for students whose college is not on StudentOS (or has no college email). */
export const GLOBAL_SLUG = "global";

/** The first screen inside any space: the Home feed of plans and ideas. */
export function homePath(slug: string): string {
  return `/c/${slug}/home`;
}
