/** The slug of the open space for students whose college is not on StudentOS (or has no college email). */
export const GLOBAL_SLUG = "global";

/** The first screen inside a college. Global has no campus (no college notices), so it starts at Collaborate. */
export function homePath(slug: string): string {
  return `/c/${slug}/${slug === GLOBAL_SLUG ? "collaborate" : "campus"}`;
}
