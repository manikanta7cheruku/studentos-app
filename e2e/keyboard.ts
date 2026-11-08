import { expect, type Locator, type Page, type TestInfo } from "@playwright/test";

// Keyboard helpers for R4-D8-1 step 2. They press real Tab, Enter and Escape keys.

const INTERACTIVE =
  'a[href], button, input:not([type="hidden"]), select, textarea, summary, [role="button"], [role="link"], [role="tab"], [role="menuitem"], [role="checkbox"], [role="switch"], [tabindex]:not([tabindex="-1"])';

export type KeyboardReport = {
  stops: string[];
  unreachable: string[];
  noRing: string[];
  trapped: boolean;
};

type Focused = { id: string; ring: boolean; text: string; ignored?: boolean } | null;

// Presses Tab until focus cycles back to a place it has already been, or max is reached.
// Reports: the tab order, visible things Tab never reached, stops with no focus ring, and a possible trap.
// An element that already has focus when the page loads (autofocus) is recorded as the first stop.
export async function tabThrough(page: Page, max = 120): Promise<KeyboardReport> {
  const all = await page.evaluate((selector) => {
    const out: Record<string, string> = {};
    let n = 0;
    document.querySelectorAll<HTMLElement>(selector).forEach((el) => {
      const rect = el.getBoundingClientRect();
      const style = getComputedStyle(el);
      const hidden =
        rect.width === 0 ||
        rect.height === 0 ||
        style.visibility === "hidden" ||
        style.display === "none";
      const disabled =
        (el as HTMLButtonElement).disabled === true || el.getAttribute("aria-disabled") === "true";
      if (hidden || disabled) return;
      el.dataset.kb = String(++n);
      const text =
        el.getAttribute("aria-label") || el.innerText || el.getAttribute("placeholder") || "";
      out[el.dataset.kb] =
        `${el.tagName.toLowerCase()} "${text.replace(/\s+/g, " ").trim().slice(0, 40)}"`;
    });
    return out;
  }, INTERACTIVE);

  const read = (): Promise<Focused> =>
    page.evaluate(() => {
      const el = document.activeElement as HTMLElement | null;
      if (!el || el === document.body || el === document.documentElement) return null;
      const style = getComputedStyle(el);
      const ring =
        (style.outlineStyle !== "none" && parseFloat(style.outlineWidth) > 0) ||
        style.boxShadow !== "none";
      // The Next.js dev tools button only exists in `pnpm dev`. It is not part of the app, so it is not judged.
      if (el.tagName === "NEXTJS-PORTAL")
        return {
          id: "",
          ring: true,
          text: "nextjs-portal (Next.js dev tools, ignored)",
          ignored: true,
        };
      const text = el.getAttribute("aria-label") || el.innerText || "";
      return {
        id: el.dataset.kb ?? "",
        ring,
        text: `${el.tagName.toLowerCase()} "${text.replace(/\s+/g, " ").trim().slice(0, 40)}"`,
      };
    });

  const stops: string[] = [];
  const noRing: string[] = [];
  const seen = new Set<string>();

  const record = (now: NonNullable<Focused>, note = "") => {
    const label = all[now.id] ?? now.text;
    seen.add(now.id || now.text);
    stops.push(`${stops.length + 1}. ${label}${note}${now.ring ? "" : "   <-- NO VISIBLE FOCUS"}`);
    if (!now.ring) noRing.push(label);
  };

  const first = await read();
  if (first) record(first, "   (had focus when the page loaded)");

  let trapped = true;
  let wrapped = false;
  for (let i = 0; i < max; i++) {
    await page.keyboard.press("Tab");
    const now = await read();
    if (!now) {
      // Focus left the page content (browser bar or body). Press Tab once more to come back in.
      if (wrapped) {
        trapped = false;
        break;
      }
      wrapped = true;
      continue;
    }
    if (now.ignored) {
      // Dev tools can hold several tab stops. List them once, never judge them, never stop on them.
      if (!seen.has(now.text)) {
        seen.add(now.text);
        stops.push(`${stops.length + 1}. ${now.text}`);
      }
      continue;
    }
    if (seen.has(now.id || now.text)) {
      trapped = false;
      break;
    }
    record(now);
  }

  const unreachable = Object.entries(all)
    .filter(([id]) => !seen.has(id))
    .map(([, label]) => label);
  return { stops, unreachable, noRing, trapped };
}

export async function printReport(name: string, report: KeyboardReport, info: TestInfo) {
  const text = [
    `\n=== ${name} [${info.project.name}] ===`,
    "Tab order:",
    ...report.stops,
    `Unreachable by Tab: ${report.unreachable.length ? "\n  " + report.unreachable.join("\n  ") : "none"}`,
    `Focus cycled (no trap): ${!report.trapped}`,
  ].join("\n");
  console.log(text);
  await info.attach(`keyboard-${name}`, { body: text, contentType: "text/plain" });
}

// Open a dialog or sheet with Enter. Focus must move in and stay in, Escape must close it,
// and focus must return to the button that opened it.
export async function dialogKeyboardRoundTrip(page: Page, trigger: Locator) {
  // Wait until React has attached to the button. Pressing Enter before that does nothing,
  // and in `pnpm dev` the first load of a heavy page can be slow.
  await expect
    .poll(
      () => trigger.evaluate((el) => Object.keys(el).some((k) => k.startsWith("__reactProps"))),
      {
        message: "the page should finish loading (hydrating) before the keyboard test starts",
        timeout: 30_000,
      },
    )
    .toBe(true);
  await trigger.focus();
  await page.keyboard.press("Enter");
  const dialog = page.getByRole("dialog");
  await expect(dialog).toBeVisible();
  const inside = () => page.evaluate(() => !!document.activeElement?.closest('[role="dialog"]'));
  expect(await inside(), "focus should move into the dialog when it opens").toBe(true);
  for (let i = 0; i < 25; i++) await page.keyboard.press("Tab");
  expect(await inside(), "Tab should stay inside an open dialog").toBe(true);
  await page.keyboard.press("Escape");
  await expect(dialog).toBeHidden();
  await expect(trigger, "focus should return to the button that opened it").toBeFocused();
}
