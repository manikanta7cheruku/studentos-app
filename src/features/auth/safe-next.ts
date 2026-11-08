/**
 * The address to open after signing in. It must be a path inside this app. Anything else (another site, a
 * protocol-relative "//host" address, a backslash trick) is ignored so a crafted sign-in link cannot send a person away.
 */
export function safeNext(value: string | null | undefined): string | null {
  if (!value) return null;
  if (!value.startsWith("/") || value.startsWith("//") || value.includes("\\")) return null;
  if (/[\u0000-\u001f]/.test(value)) return null;
  return value;
}

/** True when the string looks like an email address closely enough to try sending a code to it. */
export function looksLikeEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());
}
