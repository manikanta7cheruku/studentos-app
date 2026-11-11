"use client";

import * as React from "react";
import Link from "next/link";
import { Dialog as DialogPrimitive } from "radix-ui";
import {
  CalendarDaysIcon,
  ChevronRightIcon,
  LightbulbIcon,
  PackageSearchIcon,
  StoreIcon,
  UsersIcon,
} from "lucide-react";
import { cn } from "cn";

/**
 * What can I start? Opens from the + button in the dock. A sheet from the bottom on phones, a card on desktop.
 * Selling and renting is the first and the biggest choice, because it is what most students come to do.
 * On a phone the sheet can be pulled down to close it: it follows the finger and lets go past a short pull or a flick.
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
  const items = [
    {
      href: `/c/${slug}/market/new`,
      title: "Sell or rent something",
      text: "Books, bikes, gadgets. Or ask for what you need.",
      icon: <StoreIcon aria-hidden="true" />,
      main: true,
    },
    {
      href: `/c/${slug}/collaborate/new`,
      title: "Make a plan",
      text: "A match, a hangout, a hackathon or a project",
      icon: <UsersIcon aria-hidden="true" />,
    },
    {
      href: `/c/${slug}/events/new`,
      title: "Plan an event",
      text: "A talk, a fest or a get-together",
      icon: <CalendarDaysIcon aria-hidden="true" />,
    },
    {
      href: `/c/${slug}/ideas/new`,
      title: "Share an idea",
      text: "Say what you would build or change",
      icon: <LightbulbIcon aria-hidden="true" />,
    },
    {
      href: `/c/${slug}/lost-found/new`,
      title: "Lost or found something",
      text: "Post it and people write to you",
      icon: <PackageSearchIcon aria-hidden="true" />,
    },
  ];

  const sheet = React.useRef<HTMLDivElement>(null);
  const drag = React.useRef<{ y: number; t: number; moved: number } | null>(null);

  function onPointerDown(event: React.PointerEvent) {
    drag.current = { y: event.clientY, t: Date.now(), moved: 0 };
    (event.currentTarget as HTMLElement).setPointerCapture(event.pointerId);
    if (sheet.current) sheet.current.style.transition = "none";
  }
  function onPointerMove(event: React.PointerEvent) {
    const gesture = drag.current;
    if (!gesture || !sheet.current) return;
    // Pulling down follows the finger. Pulling up barely moves it.
    const dy = event.clientY - gesture.y;
    gesture.moved = dy;
    sheet.current.style.transform = `translateY(${dy > 0 ? dy : dy * 0.12}px)`;
  }
  function onPointerUp() {
    const gesture = drag.current;
    drag.current = null;
    const node = sheet.current;
    if (!gesture || !node) return;
    const speed = gesture.moved / Math.max(1, Date.now() - gesture.t);
    node.style.transition = "transform 220ms cubic-bezier(0.2, 0.8, 0.2, 1)";
    if (gesture.moved > 90 || speed > 0.6) {
      node.style.transform = "translateY(110%)";
      window.setTimeout(() => {
        onOpenChange(false);
        node.style.transform = "";
        node.style.transition = "";
      }, 200);
    } else {
      node.style.transform = "";
    }
  }

  return (
    <DialogPrimitive.Root open={open} onOpenChange={onOpenChange}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="fixed inset-0 z-50 bg-black/55 data-open:animate-in data-open:fade-in-0 data-closed:animate-out data-closed:fade-out-0" />
        <DialogPrimitive.Content
          ref={sheet}
          className="glass fixed inset-x-0 bottom-0 z-50 mx-auto w-full max-w-md rounded-t-[var(--radius-sheet)] p-5 pb-[calc(1.25rem+var(--safe-bottom))] outline-none data-open:animate-in data-open:slide-in-from-bottom data-closed:animate-out data-closed:slide-out-to-bottom md:bottom-auto md:top-1/2 md:-translate-y-1/2 md:rounded-[var(--radius-sheet)]"
        >
          {/* The pull area: the handle and the title. */}
          <div
            onPointerDown={onPointerDown}
            onPointerMove={onPointerMove}
            onPointerUp={onPointerUp}
            onPointerCancel={onPointerUp}
            className="-mx-5 -mt-5 mb-1 cursor-grab touch-none select-none px-5 pb-2 pt-3 active:cursor-grabbing md:cursor-default"
          >
            <div
              aria-hidden="true"
              className="mx-auto mb-3 h-1 w-10 rounded-full bg-white/25 md:hidden"
            />
            <DialogPrimitive.Title className="font-heading text-[20px] font-bold">
              Create
            </DialogPrimitive.Title>
          </div>
          <DialogPrimitive.Description className="sr-only">
            Choose what you want to start. Pull the sheet down to close it.
          </DialogPrimitive.Description>
          <ul className="mt-1 flex flex-col gap-2">
            {items.map((item) => (
              <li key={item.href}>
                <Link
                  href={item.href}
                  onClick={() => onOpenChange(false)}
                  className={cn(
                    "group flex items-center gap-3.5 rounded-2xl border p-3.5 outline-none transition-[background-color,border-color,transform] duration-200 focus-visible:ring-2 focus-visible:ring-ring active:scale-[0.985]",
                    item.main
                      ? "border-white/15 bg-white/[0.09] hover:bg-white/[0.13]"
                      : "border-white/[0.07] bg-white/[0.04] hover:border-white/20 hover:bg-white/[0.08]",
                  )}
                >
                  <span
                    className={cn(
                      "inline-flex shrink-0 items-center justify-center rounded-xl text-white [&_svg]:size-5",
                      item.main ? "bg-brand size-12" : "size-11 bg-white/[0.09]",
                    )}
                  >
                    {item.icon}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-[15px] font-semibold">{item.title}</span>
                    <span className="block text-[13px] text-ink-muted">{item.text}</span>
                  </span>
                  <ChevronRightIcon
                    aria-hidden="true"
                    className="size-4 text-ink-muted transition-transform duration-200 group-hover:translate-x-0.5"
                  />
                </Link>
              </li>
            ))}
          </ul>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}
