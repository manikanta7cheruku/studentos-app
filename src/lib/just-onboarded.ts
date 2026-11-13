// Set the moment a person finishes the welcome tour, so the next page can trust it for a short while even if the first read of
// the profile still says "not finished" (a stale answer). Lives only for this tab, and only for a few minutes.
const KEY = "studentos.justOnboarded";
const WINDOW_MS = 3 * 60_000;

export function markJustOnboarded(): void {
  try {
    window.sessionStorage.setItem(KEY, String(Date.now()));
  } catch {
    // no storage: the check below simply does not get its head start
  }
}

export function recentlyOnboarded(): boolean {
  try {
    const at = Number(window.sessionStorage.getItem(KEY) ?? "0");
    return at > 0 && Date.now() - at < WINDOW_MS;
  } catch {
    return false;
  }
}
