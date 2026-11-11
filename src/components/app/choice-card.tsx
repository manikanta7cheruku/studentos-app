"use client";

import * as React from "react";
import { cn } from "cn";

/**
 * One choice among a few, as a card: an icon tile, a title, one line of help, and a round radio on the right. The picked
 * card lights up with the brand gradient and a soft ring. Put several inside an element with role="radiogroup".
 */
export function ChoiceCard({
  selected,
  onSelect,
  icon,
  title,
  text,
}: {
  selected: boolean;
  onSelect: () => void;
  icon: React.ReactNode;
  title: string;
  text: string;
}) {
  return (
    <button
      type="button"
      role="radio"
      aria-checked={selected}
      onClick={onSelect}
      className={cn(
        "group flex w-full items-center gap-3.5 rounded-[22px] border p-4 text-left outline-none transition-[background-color,border-color,box-shadow,transform] duration-300 ease-[var(--ease)] focus-visible:ring-2 focus-visible:ring-ring active:scale-[0.985]",
        selected
          ? "border-[#7d74e0]/70 bg-[linear-gradient(135deg,rgba(111,102,214,0.18),rgba(122,81,152,0.06)_70%)] shadow-[0_0_0_4px_rgba(125,116,224,0.1),0_18px_40px_-20px_rgba(0,0,0,0.8)]"
          : "border-white/10 bg-white/[0.04] hover:border-white/25 hover:bg-white/[0.07]",
      )}
    >
      <span
        className={cn(
          "inline-flex size-12 shrink-0 items-center justify-center rounded-2xl border transition-[background-color,color] duration-300 [&_svg]:size-5",
          selected
            ? "bg-brand border-transparent text-white"
            : "border-white/10 bg-white/[0.07] text-ink-muted",
        )}
      >
        {icon}
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-[16px] font-bold">{title}</span>
        <span className="mt-0.5 block text-[13px] leading-snug text-ink-muted">{text}</span>
      </span>
      <span
        aria-hidden="true"
        className={cn(
          "flex size-[22px] shrink-0 items-center justify-center rounded-full border-[1.5px] transition-colors duration-300",
          selected ? "border-[#7d74e0]" : "border-white/30",
        )}
      >
        <span
          className={cn(
            "bg-brand size-2.5 rounded-full transition-transform duration-300 ease-[var(--spring)]",
            selected ? "scale-100" : "scale-0",
          )}
        />
      </span>
    </button>
  );
}
