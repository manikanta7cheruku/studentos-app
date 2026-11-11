// The owner PIN hash, shared by scripts/owner-pin.mjs (which makes it) and checked by src/modules/owner/owner-pin.ts.
// Format: scrypt$<N>$<r>$<p>$<salt base64>$<hash base64>. Nothing here ever prints or stores the PIN itself.
import { randomBytes, scrypt } from "node:crypto";
import { promisify } from "node:util";

const derive = promisify(scrypt);
export const PIN_MIN_LENGTH = 12;

/** Why a PIN is too weak, or null when it is fine. */
export function pinProblem(pin) {
  if (typeof pin !== "string" || pin.length < PIN_MIN_LENGTH)
    return `Use at least ${PIN_MIN_LENGTH} characters.`;
  if (new Set(pin).size < 6) return "Use at least 6 different characters.";
  if (/^\d+$/.test(pin) && pin.length < 16) return "A PIN of only digits needs 16 or more.";
  return null;
}

export async function hashPin(pin) {
  const salt = randomBytes(16);
  const N = 16384;
  const r = 8;
  const p = 1;
  const key = await derive(pin.normalize("NFKC"), salt, 64, { N, r, p });
  return `scrypt$${N}$${r}$${p}$${salt.toString("base64")}$${key.toString("base64")}`;
}
