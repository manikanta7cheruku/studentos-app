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

/** What can I start? Opens from the + button in the dock. A sheet from the bottom on phones, a card on desktop. */
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
      href: `/c/${slug}/collaborate/new`,
      title: "Make a plan",
      text: "A match, an event, a hackathon or a project",
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
    {
      href: `/c/${slug}/market/new`,
      title: "Sell or ask for something",
      text: "Buy, sell, rent or give away",
      icon: <StoreIcon aria-hidden="true" />,
    },
  ];
  return (
    <DialogPrimitive.Root open={open} onOpenChange={onOpenChange}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="fixed inset-0 z-50 bg-black/60 backdrop-blur-[3px] data-open:animate-in data-open:fade-in-0 data-closed:animate-out data-closed:fade-out-0" />
        <DialogPrimitive.Content className="glass fixed inset-x-0 bottom-0 z-50 mx-auto w-full max-w-md rounded-t-[var(--radius-sheet)] p-5 pb-[calc(1.25rem+var(--safe-bottom))] outline-none data-open:animate-in data-open:slide-in-from-bottom data-closed:animate-out data-closed:slide-out-to-bottom md:bottom-auto md:top-1/2 md:-translate-y-1/2 md:rounded-[var(--radius-sheet)]">
          <div
            aria-hidden="true"
            className="mx-auto mb-4 h-1 w-10 rounded-full bg-white/20 md:hidden"
          />
          <DialogPrimitive.Title className="font-heading text-[20px] font-bold">
            Create
          </DialogPrimitive.Title>
          <DialogPrimitive.Description className="sr-only">
            Choose what you want to start.
          </DialogPrimitive.Description>
          <ul className="mt-3 flex flex-col gap-2">
            {items.map((item) => (
              <li key={item.href}>
                <Link
                  href={item.href}
                  onClick={() => onOpenChange(false)}
                  className="group flex items-center gap-3.5 rounded-2xl border border-white/[0.07] bg-white/[0.04] p-3.5 outline-none transition-[background-color,border-color,transform] duration-200 hover:border-white/20 hover:bg-white/[0.08] focus-visible:ring-2 focus-visible:ring-ring active:scale-[0.985]"
                >
                  <span className="bg-brand inline-flex size-11 shrink-0 items-center justify-center rounded-xl text-white [&_svg]:size-5">
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
