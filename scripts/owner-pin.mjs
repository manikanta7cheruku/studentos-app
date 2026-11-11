// Makes the SQL that gives one account owner access to the StudentOS dashboard.
//
//   pnpm owner:pin you@gmail.com
//
// It asks for the PIN twice (hidden), then prints one SQL statement. Paste it in the Supabase SQL editor of the project
// you want (staging first, then production). The PIN is turned into a salted hash here; only the hash is printed.
// The account must have signed in once on the site (that creates it). Run it again to change the PIN.
import { createInterface } from "node:readline";
import { Writable } from "node:stream";
import { hashPin, pinProblem } from "./owner-pin-lib.mjs";

const email = (process.argv[2] ?? "").trim().toLowerCase();
if (!/^[^@\s'"]+@[^@\s'"]+\.[^@\s'"]+$/.test(email)) {
  console.error("Usage: pnpm owner:pin you@gmail.com");
  process.exit(1);
}

function askHidden(question) {
  return new Promise((resolve) => {
    let muted = false;
    const output = new Writable({
      write(chunk, _encoding, callback) {
        if (!muted) process.stdout.write(chunk);
        callback();
      },
    });
    const rl = createInterface({ input: process.stdin, output, terminal: true });
    rl.question(question, (answer) => {
      rl.close();
      process.stdout.write("\n");
      resolve(answer);
    });
    muted = true;
  });
}

const fromEnv = process.env.OWNER_PIN;
const first = fromEnv ?? (await askHidden("New owner PIN (12+ characters): "));
const problem = pinProblem(first);
if (problem) {
  console.error(problem);
  process.exit(1);
}
if (!fromEnv) {
  const second = await askHidden("Type it again: ");
  if (second !== first) {
    console.error("The two PINs are not the same. Nothing was made.");
    process.exit(1);
  }
}

const hash = await hashPin(first);
console.log("\nPaste this in the Supabase SQL editor and run it:\n");
console.log(`insert into public.platform_admins (user_id, pin_hash)
select u.id, '${hash}'
from auth.users u
where lower(u.email) = '${email}'
on conflict (user_id) do update set pin_hash = excluded.pin_hash, pin_set_at = now();
`);
console.log(
  "It says 'INSERT 0 0' if nobody has signed in with that email yet. Sign in once on the site, then run it again.",
);
