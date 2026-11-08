// Colour helpers for the college accent (docs/DESIGN_SYSTEM.md: a college colour needs at least 4.5 to 1 against white).

export const DEFAULT_ACCENT = "#2340C8";

export function isHexColor(value: string | null | undefined): value is string {
  return typeof value === "string" && /^#[0-9A-Fa-f]{6}$/.test(value);
}

function channel(value: number): number {
  const s = value / 255;
  return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
}

/** Contrast of a colour against white, as a ratio (1 to 21). */
export function contrastOnWhite(hex: string): number {
  const r = channel(parseInt(hex.slice(1, 3), 16));
  const g = channel(parseInt(hex.slice(3, 5), 16));
  const b = channel(parseInt(hex.slice(5, 7), 16));
  const luminance = 0.2126 * r + 0.7152 * g + 0.0722 * b;
  return 1.05 / (luminance + 0.05);
}

/** The college colour if it is readable, otherwise the StudentOS blue. */
export function safeAccent(hex: string | null | undefined): string {
  return isHexColor(hex) && contrastOnWhite(hex) >= 4.5 ? hex : DEFAULT_ACCENT;
}

/** CSS variables that re-colour buttons, links, focus rings and the soft backgrounds for one college. */
export function accentVars(hex: string | null | undefined): Record<string, string> {
  const accent = safeAccent(hex);
  const soft = `color-mix(in srgb, ${accent} 12%, white)`;
  return {
    "--accent": accent,
    "--primary": accent,
    "--ring": accent,
    "--accent-soft": soft,
    "--secondary": soft,
  };
}
