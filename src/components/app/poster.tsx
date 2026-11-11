import * as React from "react";
import { cn } from "cn";

// Three gradient sets, all inside the brand colours (violet, magenta, blue). Plans differ a little from each other, but
// the screen never turns into a rainbow. The same seed always gets the same set.
const SETS = [
  [262, 320, 232],
  [248, 300, 215],
  [276, 334, 250],
] as const;

function pick(seed: string): (typeof SETS)[number] {
  let hash = 0;
  for (const char of seed) hash = (hash * 31 + char.charCodeAt(0)) >>> 0;
  return SETS[hash % SETS.length]!;
}

/**
 * A cover made of the brand gradient, with a fine grain and an optional big word in the corner (for example 5v5 or
 * "Hack"). Used for plans, so a plan can be told from an idea at a glance, and for profile covers.
 */
export function Poster({
  seed,
  big,
  className,
  children,
}: {
  seed: string;
  big?: string;
  className?: string;
  children?: React.ReactNode;
}) {
  const [a, b, c] = pick(seed);
  return (
    <div
      className={cn("grain relative isolate overflow-hidden bg-[#0e0e14]", className)}
      style={{
        backgroundImage: `radial-gradient(70% 90% at 12% 0%, hsl(${a} 90% 56%), transparent 62%), radial-gradient(60% 80% at 100% 25%, hsl(${b} 85% 50%), transparent 60%), radial-gradient(90% 70% at 40% 115%, hsl(${c} 80% 38%), transparent 65%)`,
      }}
    >
      {big ? (
        <span
          aria-hidden="true"
          className="pointer-events-none absolute -bottom-5 -right-1 -z-0 select-none font-heading text-[5.5rem] font-extrabold leading-[0.8] tracking-tighter text-white/90 mix-blend-overlay"
        >
          {big}
        </span>
      ) : null}
      <div className="relative z-10 h-full">{children}</div>
    </div>
  );
}
