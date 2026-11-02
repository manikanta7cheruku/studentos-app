import { randomInt } from "node:crypto";

// Letters and digits without the ones people mix up (0/O, 1/I/L). 31 characters.
const ALPHABET = "23456789ABCDEFGHJKMNPQRSTUVWXYZ";

function group(length: number): string {
  let out = "";
  for (let i = 0; i < length; i++) out += ALPHABET[randomInt(ALPHABET.length)];
  return out;
}

// Example: ALPHA-7K3Q-9XPD-M2WF. The college prefix helps people see the code is for their college.
// 12 random characters of 31 possible are about 59 bits, so guessing is not realistic (and tries are limited).
// It matches the contract: /^[A-Z0-9-]{6,32}$/.
export function generateInviteCode(slug: string): string {
  const prefix =
    slug
      .replace(/[^a-z0-9]/gi, "")
      .toUpperCase()
      .slice(0, 8) || "CODE";
  return `${prefix}-${group(4)}-${group(4)}-${group(4)}`;
}
