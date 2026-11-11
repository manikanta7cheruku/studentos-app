import { scrypt, timingSafeEqual } from "node:crypto";
import { promisify } from "node:util";

// Checks the owner PIN against its stored hash (made by scripts/owner-pin.mjs). The hash is
// scrypt$N$r$p$salt$hash, all base64. The comparison takes the same time whatever the PIN is.

const derive = promisify(scrypt) as (
  password: string,
  salt: Buffer,
  keylen: number,
  options: { N: number; r: number; p: number },
) => Promise<Buffer>;

export async function verifyPin(pin: string, stored: string): Promise<boolean> {
  const parts = stored.split("$");
  if (parts.length !== 6 || parts[0] !== "scrypt") return false;
  const [, n, r, p, salt, hash] = parts as [string, string, string, string, string, string];
  const options = { N: Number(n), r: Number(r), p: Number(p) };
  if (![options.N, options.r, options.p].every((value) => Number.isInteger(value) && value > 0))
    return false;
  // Only the settings our script writes are accepted, so a changed row cannot make the server work for minutes.
  if (options.N > 1 << 17 || options.r > 16 || options.p > 4) return false;
  const expected = Buffer.from(hash, "base64");
  if (expected.length === 0) return false;
  const actual = await derive(
    pin.normalize("NFKC"),
    Buffer.from(salt, "base64"),
    expected.length,
    options,
  );
  return actual.length === expected.length && timingSafeEqual(actual, expected);
}
