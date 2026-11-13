"use client";

import * as React from "react";
import { cn } from "cn";

type Step = {
  /** What it points at: the `data-tour` names of the elements to light up. No target means a card in the middle. */
  targets?: string[];
  title: string;
  text: string;
  /** Show the double tap picture on the target. */
  demo?: boolean;
};

// Short on purpose: one idea per card, a few words each.
const STEPS: Step[] = [
  {
    title: "Welcome to StudentOS",
    text: "Your campus in one app. Tap a card to keep going.",
  },
  { targets: ["tab-plans"], title: "Plans", text: "Find a team or a game, or start your own." },
  { targets: ["tab-buzz"], title: "Buzz", text: "Share a thought, ask something, vote on polls." },
  { targets: ["tab-debates"], title: "Debates", text: "Pick a side and make your point." },
  { targets: ["tab-network"], title: "Network", text: "Meet people, say hi, grow your circle." },
  {
    targets: ["plus"],
    title: "The + button",
    text: "Tap it to create. Double tap or hold it for shortcuts.",
    demo: true,
  },
  {
    targets: ["messages", "bell"],
    title: "Messages and updates",
    text: "Private chats that fade after they are read, and everything new for you.",
  },
  {
    targets: ["profile"],
    title: "Your profile",
    text: "Your picture opens your profile, strengths and settings.",
  },
  {
    targets: ["help"],
    title: "Need this again?",
    text: "Tap the ? any time to replay the tour.",
  },
];

type Box = { x: number; y: number; w: number; h: number };

/** The place of the lit up elements: the box around all of them. Hidden elements (the phone bar on a computer) are skipped. */
function measure(targets: string[] | undefined): Box | null {
  if (!targets?.length) return null;
  let left = Infinity;
  let top = Infinity;
  let right = -Infinity;
  let bottom = -Infinity;
  for (const name of targets) {
    const found = Array.from(document.querySelectorAll<HTMLElement>(`[data-tour="${name}"]`)).find(
      (element) => {
        const box = element.getBoundingClientRect();
        return box.width > 0 && box.height > 0;
      },
    );
    if (!found) continue;
    const box = found.getBoundingClientRect();
    left = Math.min(left, box.left);
    top = Math.min(top, box.top);
    right = Math.max(right, box.right);
    bottom = Math.max(bottom, box.bottom);
  }
  if (!Number.isFinite(left)) return null;
  return { x: left, y: top, w: right - left, h: bottom - top };
}

/**
 * The tour: a dark veil with a lit up hole around the thing being explained, and one glass card next to it. Tap the card to
 * go on; the last card ends it. Skip leaves at any time. Everything moves with one smooth glide from step to step.
 */
export function Tour({ onClose }: { onClose: () => void }) {
  const [index, setIndex] = React.useState(0);
  const [box, setBox] = React.useState<Box | null>(null);
  const [size, setSize] = React.useState({ w: 390, h: 800 });
  const step = STEPS[index]!;
  const last = index === STEPS.length - 1;

  // Measure the target for this step now, and again when the window changes.
  React.useEffect(() => {
    const update = () => {
      setBox(measure(step.targets));
      setSize({ w: window.innerWidth, h: window.innerHeight });
    };
    const frame = window.requestAnimationFrame(update);
    window.addEventListener("resize", update);
    return () => {
      window.cancelAnimationFrame(frame);
      window.removeEventListener("resize", update);
    };
  }, [step]);

  // Escape leaves; Enter, Space or the right arrow go on (so the tour works with a keyboard too).
  React.useEffect(() => {
    const key = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
      else if (event.key === "Enter" || event.key === " " || event.key === "ArrowRight") {
        event.preventDefault();
        setIndex((value) => {
          if (value >= STEPS.length - 1) {
            onClose();
            return value;
          }
          return value + 1;
        });
      }
    };
    document.addEventListener("keydown", key);
    return () => document.removeEventListener("keydown", key);
  }, [onClose]);

  function next() {
    if (last) onClose();
    else setIndex((value) => value + 1);
  }

  // The card sits above the lit up thing when that is in the lower half of the screen, below it otherwise.
  const width = Math.min(320, size.w - 24);
  const pad = 8;
  const cardHeight = 150;
  let left = (size.w - width) / 2;
  let top = (size.h - cardHeight) / 2;
  if (box) {
    const above = box.y + box.h / 2 > size.h / 2;
    top = above ? box.y - pad - cardHeight - 12 : box.y + box.h + pad + 12;
    left = Math.min(Math.max(12, box.x + box.w / 2 - width / 2), size.w - width - 12);
    top = Math.min(Math.max(12, top), size.h - cardHeight - 12);
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Tour of StudentOS"
      className="fixed inset-0 z-[70] touch-none select-none"
    >
      {/* The veil, with a hole where the explained thing is. One box-shadow darkens everything else. */}
      <div
        aria-hidden="true"
        className="tour-hole pointer-events-none absolute rounded-[20px]"
        style={{
          left: box ? box.x - pad : size.w / 2,
          top: box ? box.y - pad : size.h / 2,
          width: box ? box.w + pad * 2 : 0,
          height: box ? box.h + pad * 2 : 0,
          opacity: 1,
        }}
      />
      {box && step.demo ? (
        <span
          aria-hidden="true"
          className="pointer-events-none absolute"
          style={{ left: box.x + box.w / 2, top: box.y + box.h / 2 }}
        >
          <span className="tour-tap tour-tap-1" />
          <span className="tour-tap tour-tap-2" />
        </span>
      ) : null}

      <div
        onClick={next}
        className="tour-card glass-sheet-clear absolute cursor-pointer rounded-[22px] px-4 pb-3.5 pt-4 text-left outline-none"
        style={{ left, top, width }}
      >
        <div key={index} className="tour-step">
          <p className="text-[16px] font-bold leading-tight text-white">{step.title}</p>
          <p className="mt-1.5 text-[14px] leading-snug text-white/80">{step.text}</p>
        </div>
        <div className="mt-3 flex items-center justify-between">
          <span className="flex gap-1.5" aria-hidden="true">
            {STEPS.map((_, i) => (
              <span
                key={i}
                className={cn(
                  "h-1.5 rounded-full transition-[width,background-color] duration-300",
                  i === index ? "w-5 bg-white" : "w-1.5 bg-white/30",
                )}
              />
            ))}
          </span>
          <span className="text-[12px] font-semibold text-white/60">
            {last ? "Tap to finish" : "Tap to continue"}
          </span>
        </div>
        {last ? null : (
          <button
            type="button"
            onClick={(event) => {
              event.stopPropagation();
              onClose();
            }}
            className="absolute right-3 top-3 rounded-full px-2 py-1 text-[12px] font-semibold text-white/55 outline-none transition-colors hover:text-white focus-visible:ring-2 focus-visible:ring-ring"
          >
            Skip
          </button>
        )}
      </div>
    </div>
  );
}
