"use client";

import * as React from "react";
import Link from "next/link";
import { Dialog as DialogPrimitive } from "radix-ui";
import { MessageCircleIcon, MessageCircleHeartIcon, StoreIcon, UsersIcon } from "lucide-react";

/** How long a press must last to count as a hold, and how close two taps must be to count as a double tap. */
export const HOLD_MS = 650;
export const DOUBLE_TAP_MS = 320;

/**
 * Gestures for the + button. A tap opens the full list of things to create. A double tap, or a press held for about
 * two thirds of a second, opens the quick menu instead: the four things people start most often.
 */
export function usePlusGestures({ onTap, onQuick }: { onTap: () => void; onQuick: () => void }) {
  const timer = React.useRef<number | null>(null);
  const held = React.useRef(false);
  const lastTap = React.useRef(0);

  const clear = () => {
    if (timer.current !== null) window.clearTimeout(timer.current);
    timer.current = null;
  };

  const props = {
    onPointerDown: () => {
      held.current = false;
      clear();
      timer.current = window.setTimeout(() => {
        held.current = true;
        navigator.vibrate?.(12);
        onQuick();
      }, HOLD_MS);
    },
    onPointerUp: clear,
    onPointerLeave: clear,
    onPointerCancel: clear,
    // A long press on a phone would otherwise open the browser's own menu.
    onContextMenu: (event: React.MouseEvent) => event.preventDefault(),
    onClick: () => {
      // The press that opened the quick menu also ends in a click: ignore it.
      if (held.current) {
        held.current = false;
        return;
      }
      const now = performance.now();
      const isDouble = now - lastTap.current < DOUBLE_TAP_MS;
      lastTap.current = now;
      if (isDouble) onQuick();
      else onTap();
    },
  };
  /** True while a second tap would still count as a double tap (the full sheet may already be open). */
  const recentlyTapped = () => performance.now() - lastTap.current < DOUBLE_TAP_MS;
  return { props, recentlyTapped };
}

/** A small glass menu with the four most used starts. It opens beside the + button and closes with a tap outside. */
export function QuickCreate({
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
      href: `/c/${slug}/collaborate/new`,
      title: "New plan",
      text: "A match or a team",
      icon: <UsersIcon aria-hidden="true" />,
    },
    {
      href: `/c/${slug}/ideas/new`,
      title: "Post a buzz",
      text: "Say it in seconds",
      icon: <MessageCircleHeartIcon aria-hidden="true" />,
    },
    {
      href: `/c/${slug}/market/new`,
      title: "Sell or rent",
      text: "Books, bikes, gadgets",
      icon: <StoreIcon aria-hidden="true" />,
    },
    {
      href: `/c/${slug}/people`,
      title: "Message someone",
      text: "Find a classmate",
      icon: <MessageCircleIcon aria-hidden="true" />,
    },
  ];
  return (
    <DialogPrimitive.Root open={open} onOpenChange={onOpenChange}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="sheet-scrim fixed inset-0 z-50" />
        <DialogPrimitive.Content
          aria-describedby={undefined}
          className="glass-sheet fixed bottom-[calc(5.25rem+var(--safe-bottom))] right-3 z-50 w-[min(18rem,calc(100vw-1.5rem))] origin-bottom-right rounded-[26px] p-2 outline-none data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:zoom-in-90 data-[state=open]:slide-in-from-bottom-4 md:bottom-auto md:left-5 md:right-auto md:top-[8.25rem] md:origin-top-left"
        >
          <DialogPrimitive.Title className="px-3 pb-1 pt-2 text-[11px] font-semibold uppercase tracking-[0.1em] text-ink-muted">
            Quick start
          </DialogPrimitive.Title>
          <ul className="stagger flex flex-col">
            {items.map((item) => (
              <li key={item.href}>
                <Link
                  href={item.href}
                  prefetch={false}
                  onClick={() => onOpenChange(false)}
                  className="flex min-h-14 items-center gap-3 rounded-[18px] px-3 outline-none transition-[background-color,transform] duration-150 hover:bg-white/[0.08] focus-visible:bg-white/[0.1] active:scale-[0.98] [&_svg]:size-[18px]"
                >
                  <span className="bg-brand inline-flex size-10 shrink-0 items-center justify-center rounded-2xl text-white">
                    {item.icon}
                  </span>
                  <span className="min-w-0">
                    <span className="block text-[14.5px] font-semibold">{item.title}</span>
                    <span className="block text-[12.5px] text-ink-muted">{item.text}</span>
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
