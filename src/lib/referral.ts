// An invite link looks like https://app/?ref=ab12cd34. The code is kept on this device until the person finishes the welcome
// tour, then the server records who invited them (once). Safe if storage is blocked.

const KEY = "studentos:ref";
const FORMAT = /^[a-z0-9]{4,20}$/;

export function rememberReferral(code: string | null): void {
  const clean = (code ?? "").trim().toLowerCase();
  if (!FORMAT.test(clean)) return;
  try {
    // The first invitation wins: a later link does not replace it.
    if (!window.localStorage.getItem(KEY)) window.localStorage.setItem(KEY, clean);
  } catch {
    // no storage: the invitation is simply not remembered
  }
}

export function takeReferral(): string | null {
  try {
    const code = window.localStorage.getItem(KEY);
    return code && FORMAT.test(code) ? code : null;
  } catch {
    return null;
  }
}

export function clearReferral(): void {
  try {
    window.localStorage.removeItem(KEY);
  } catch {
    // nothing to do
  }
}
