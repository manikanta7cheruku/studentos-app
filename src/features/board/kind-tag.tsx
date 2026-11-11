import { cn } from "cn";
import type { BoardItem } from "@/lib/api/endpoints";
import { KIND_LABEL } from "./board-config";

// One colour for each kind of post, so Lost, Found, For sale, For rent, Free and Wanted read apart at a glance.
const TONE: Record<BoardItem["kind"], { dot: string; text: string; bg: string }> = {
  lost: { dot: "bg-[#f0b45a]", text: "text-[#f3c985]", bg: "bg-[#f0b45a]/12" },
  found: { dot: "bg-[#42d392]", text: "text-[#85e6b9]", bg: "bg-[#42d392]/12" },
  sell: { dot: "bg-[#8f86f0]", text: "text-[#c9c5f7]", bg: "bg-[#8f86f0]/14" },
  rent: { dot: "bg-[#4fb4e6]", text: "text-[#95d3f1]", bg: "bg-[#4fb4e6]/14" },
  free: { dot: "bg-[#42d392]", text: "text-[#85e6b9]", bg: "bg-[#42d392]/12" },
  wanted: { dot: "bg-[#ee6fae]", text: "text-[#f4a9ce]", bg: "bg-[#ee6fae]/14" },
};

/** The kind of a post as a small tag: a coloured dot and the word, on a soft tint. The same tag on a card and on its page. */
export function KindTag({ kind, className }: { kind: BoardItem["kind"]; className?: string }) {
  const tone = TONE[kind];
  return (
    <span
      className={cn(
        "inline-flex h-[22px] shrink-0 items-center gap-1.5 rounded-full px-2.5 text-[11.5px] font-semibold leading-none",
        tone.bg,
        tone.text,
        className,
      )}
    >
      <span aria-hidden="true" className={cn("size-1.5 rounded-full", tone.dot)} />
      {KIND_LABEL[kind]}
    </span>
  );
}
