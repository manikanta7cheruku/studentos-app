"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Dialog as DialogPrimitive } from "radix-ui";
import {
  CalendarDaysIcon,
  ScaleIcon,
  MapPinnedIcon,
  MessageCircleHeartIcon,
  PackageSearchIcon,
  StoreIcon,
  UsersIcon,
  XIcon,
} from "lucide-react";
import { cn } from "cn";
import { useOverlayHistory } from "@/lib/use-overlay-history";

type Choice = {
  href: string;
  title: string;
  text: string;
  icon: React.ReactNode;
  /** Two soft colours for the icon tile. */
  tint: string;
};

/**
 * What can I start? Opens from the + button. A glass sheet that slides up on a phone (and can be pulled down with a
 * finger), a card on a computer. The choices are big tiles, so one tap on a thumb is enough.
 * Nothing is loaded in the background when it opens: the links do not prefetch, so the sheet opens at once.
 */
export function CreateSheet({
  slug,
  open,
  onOpenChange,
}: {
  slug: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const choices: Choice[] = [
    {
      href: `/c/${slug}/collaborate/new`,
      title: "Plan",
      text: "A match or a team",
      icon: <UsersIcon aria-hidden="true" />,
      tint: "from-[#5b54d6] to-[#8a5fd0]",
    },
    {
      href: `/c/${slug}/ideas/new`,
      title: "Buzz",
      text: "Say it in seconds",
      icon: <MessageCircleHeartIcon aria-hidden="true" />,
      tint: "from-[#d6549a] to-[#e0866a]",
    },
    {
      href: `/c/${slug}/debates/new`,
      title: "Debate",
      text: "Two sides, a timer",
      icon: <ScaleIcon aria-hidden="true" />,
      tint: "from-[#d99a3a] to-[#e0566a]",
    },
    {
      href: `/c/${slug}/events/new`,
      title: "Event",
      text: "A talk or a fest",
      icon: <CalendarDaysIcon aria-hidden="true" />,
      tint: "from-[#2f9fd0] to-[#4f6fe0]",
    },
    {
      href: `/c/${slug}/turf/new`,
      title: "Turf or court",
      text: "List a ground to book",
      icon: <MapPinnedIcon aria-hidden="true" />,
      tint: "from-[#7a5fd6] to-[#4f6fe0]",
    },
    {
      href: `/c/${slug}/market/new`,
      title: "Sell or rent",
      text: "Books, bikes, gadgets",
      icon: <StoreIcon aria-hidden="true" />,
      tint: "from-[#2fb98a] to-[#2f90b9]",
    },
    {
      href: `/c/${slug}/lost-found/new`,
      title: "Lost & found",
      text: "Post it, get a reply",
      icon: <PackageSearchIcon aria-hidden="true" />,
      tint: "from-[#d99a3a] to-[#d6665a]",
    },
  ];

  // Turf, the Marketplace and Lost and found belong to one campus, so Global does not offer them.
  const shown = slug === "global" ? choices.slice(0, 4) : choices;

  // Back closes the sheet; a tile opens its page with Back returning to where the person was.
  const router = useRouter();
  const overlay = useOverlayHistory(open, onOpenChange);
  const sheet = React.useRef<HTMLDivElement>(null);
  const drag = React.useRef<{ y: number; t: number; moved: number } | null>(null);

  // A fresh open is never "gone".
  React.useEffect(() => {
    if (open && sheet.current) {
      sheet.current.removeAttribute("data-gone");
      sheet.current.style.transform = "";
      sheet.current.style.transition = "";
    }
  }, [open]);

  function onPointerDown(event: React.PointerEvent) {
    drag.current = { y: event.clientY, t: performance.now(), moved: 0 };
    (event.currentTarget as HTMLElement).setPointerCapture(event.pointerId);
    if (sheet.current) {
      sheet.current.style.transition = "none";
      sheet.current.style.animation = "none";
    }
  }
  function onPointerMove(event: React.PointerEvent) {
    const gesture = drag.current;
    if (!gesture || !sheet.current) return;
    const dy = event.clientY - gesture.y;
    gesture.moved = dy;
    // Pulling down follows the finger. Pulling up resists.
    sheet.current.style.transform = `translate3d(0, ${dy > 0 ? dy : dy * 0.1}px, 0)`;
  }
  function onPointerUp() {
    const gesture = drag.current;
    drag.current = null;
    const node = sheet.current;
    if (!gesture || !node) return;
    const speed = gesture.moved / Math.max(1, performance.now() - gesture.t);
    node.style.transition = "transform 260ms cubic-bezier(0.22, 1, 0.36, 1)";
    if (gesture.moved > 90 || speed > 0.55) {
      node.style.transform = "translate3d(0, 110%, 0)";
      window.setTimeout(() => {
        node.setAttribute("data-gone", "true");
        onOpenChange(false);
      }, 230);
    } else {
      node.style.transform = "translate3d(0, 0, 0)";
      window.setTimeout(() => {
        node.style.transition = "";
        node.style.transform = "";
        node.style.animation = "";
      }, 270);
    }
  }

  return (
    <DialogPrimitive.Root open={open} onOpenChange={onOpenChange}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="sheet-scrim fixed inset-0 z-50" />
        <DialogPrimitive.Content
          ref={sheet}
          aria-describedby={undefined}
          className="sheet-panel glass-sheet fixed inset-x-0 bottom-0 z-50 mx-auto w-full max-w-md rounded-t-[28px] px-5 pb-[calc(1.25rem+var(--safe-bottom))] pt-0 outline-none md:bottom-auto md:top-1/2 md:max-w-lg md:-translate-y-1/2 md:rounded-[28px] md:pb-6"
        >
          {/* The pull area: the handle and the title. Big enough for a thumb. */}
          <div
            onPointerDown={onPointerDown}
            onPointerMove={onPointerMove}
            onPointerUp={onPointerUp}
            onPointerCancel={onPointerUp}
            className="-mx-5 flex cursor-grab touch-none select-none flex-col items-center px-5 pb-3 pt-3 active:cursor-grabbing md:cursor-default"
          >
            <div
              aria-hidden="true"
              className="mb-3 h-[5px] w-11 rounded-full bg-white/30 md:hidden"
            />
            <div className="flex w-full items-center justify-between">
              <DialogPrimitive.Title className="font-heading text-[22px] font-extrabold tracking-tight">
                Create
              </DialogPrimitive.Title>
              <DialogPrimitive.Close
                aria-label="Close"
                onPointerDown={(event) => event.stopPropagation()}
                className="inline-flex size-9 items-center justify-center rounded-full bg-white/[0.08] text-ink-muted outline-none transition-[background-color,transform] duration-200 hover:bg-white/[0.14] hover:text-ink focus-visible:ring-2 focus-visible:ring-ring active:scale-90"
              >
                <XIcon aria-hidden="true" className="size-[18px]" />
              </DialogPrimitive.Close>
            </div>
          </div>
          <ul className="grid auto-rows-fr grid-cols-2 gap-2.5 [&>li:last-child:nth-child(odd)]:col-span-2">
            {shown.map((item, index) => (
              <li
                key={item.href}
                className="sheet-tile"
                style={{ "--i": index } as React.CSSProperties}
              >
                <Link
                  href={item.href}
                  prefetch={false}
                  onClick={(event) => {
                    if (event.metaKey || event.ctrlKey || event.shiftKey || event.button !== 0)
                      return;
                    event.preventDefault();
                    overlay.goTo(item.href, router.push);
                  }}
                  className="group flex h-full min-h-[5.75rem] flex-col justify-between gap-2 rounded-[18px] border border-white/[0.12] bg-white/[0.07] p-3 outline-none transition-[background-color,border-color,transform] duration-200 hover:border-white/25 hover:bg-white/[0.12] focus-visible:ring-2 focus-visible:ring-ring active:scale-[0.97]"
                >
                  <span
                    className={cn(
                      "inline-flex size-9 shrink-0 items-center justify-center rounded-[12px] bg-gradient-to-br text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.35),0_6px_14px_-8px_rgba(0,0,0,0.6)] [&_svg]:size-[18px]",
                      item.tint,
                    )}
                  >
                    {item.icon}
                  </span>
                  <span className="min-w-0">
                    <span className="block text-[14px] font-bold leading-tight">{item.title}</span>
                    <span className="mt-0.5 block truncate text-[12px] leading-snug text-ink-muted">
                      {item.text}
                    </span>
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}
