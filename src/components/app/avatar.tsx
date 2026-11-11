import * as React from "react";
import { cn } from "cn";

const TONES = [1, 2, 3, 4, 5, 6] as const;

// The same name always gets the same tone, so a person is recognisable across screens.
function toneFor(name: string): (typeof TONES)[number] {
  let hash = 0;
  for (const char of name) hash = (hash * 31 + char.charCodeAt(0)) >>> 0;
  return TONES[hash % TONES.length]!;
}

export function initialsOf(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0]!.slice(0, 2).toUpperCase();
  return `${parts[0]![0]}${parts[parts.length - 1]![0]}`.toUpperCase();
}

const SIZES = {
  xs: "size-7 text-[11px]",
  sm: "size-9 text-[12px]",
  md: "size-11 text-base",
  lg: "size-16 text-xl",
  xl: "size-24 text-3xl",
} as const;

type AvatarProps = {
  name: string;
  src?: string | null;
  size?: keyof typeof SIZES;
  className?: string;
};

/**
 * A person's picture, or their initials on a quiet tone when there is none.
 * The image is decorative (the name is always next to it), so it has an empty alt text.
 */
export function Avatar({ name, src, size = "md", className }: AvatarProps) {
  const [failed, setFailed] = React.useState(false);
  const tone = toneFor(name);
  const showImage = Boolean(src) && !failed;
  return (
    <span
      data-slot="avatar"
      className={cn(
        "relative inline-flex shrink-0 select-none items-center justify-center overflow-hidden rounded-full font-heading font-semibold",
        SIZES[size],
        className,
      )}
      style={{ background: `var(--tone-${tone}-bg)`, color: `var(--tone-${tone}-fg)` }}
    >
      {showImage ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={src!} alt="" onError={() => setFailed(true)} className="size-full object-cover" />
      ) : (
        <span aria-hidden="true">{initialsOf(name)}</span>
      )}
    </span>
  );
}
