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
  /** Two colours for the icon tile. */
  tint: string;
};

/**
 * What can I start? Opens from the + button as one card of clear glass that grows out of the button, with the choices as
 * big tiles (one tap with a thumb). The glass is deep and dark enough that white text stays easy to read over any page.
 * Nothing is loaded when it opens (the links do not prefetch), so it appears at once.
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
      text: "List a ground",
      icon: <MapPinnedIcon aria-hidden="true" />,
      tint: "from-[#7a5fd6] to-[#4f6fe0]",
    },
    {
      href: `/c/${slug}/market/new`,
      title: "Sell or rent",
      text: "Books, bikes, more",
      icon: <StoreIcon aria-hidden="true" />,
      tint: "from-[#2fb98a] to-[#2f90b9]",
    },
    {
      href: `/c/${slug}/lost-found/new`,
      title: "Lost and found",
      text: "Post it, get a reply",
      icon: <PackageSearchIcon aria-hidden="true" />,
      tint: "from-[#d99a3a] to-[#d6665a]",
    },
  ];

  // Turf, the Marketplace and Lost and found belong to one campus, so Global does not offer them.
  const shown = slug === "global" ? choices.slice(0, 4) : choices;

  // Back closes the card; a tile opens its page with Back returning to where the person was.
  const router = useRouter();
  const overlay = useOverlayHistory(open, onOpenChange);

  return (
    <DialogPrimitive.Root open={open} onOpenChange={onOpenChange}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="quick-scrim fixed inset-0 z-50" />
        <DialogPrimitive.Content
          aria-describedby={undefined}
          className="quick-panel glass-sheet-clear fixed bottom-[calc(5.5rem+var(--safe-bottom))] right-3 z-50 w-[21.5rem] max-w-[calc(100vw-1.5rem)] rounded-[28px] p-3 outline-none md:bottom-auto md:left-5 md:right-auto md:top-[7.6rem]"
        >
          <div className="flex items-center justify-between px-1.5 pb-2.5 pt-1">
            <DialogPrimitive.Title className="font-heading text-[19px] font-extrabold tracking-tight text-white">
              Create
            </DialogPrimitive.Title>
            <DialogPrimitive.Close
              aria-label="Close"
              className="inline-flex size-8 items-center justify-center rounded-full bg-white/[0.12] text-white/80 outline-none transition-[background-color,transform] duration-150 hover:bg-white/[0.2] hover:text-white focus-visible:ring-2 focus-visible:ring-ring active:scale-90"
            >
              <XIcon aria-hidden="true" className="size-4" />
            </DialogPrimitive.Close>
          </div>
          <ul className="grid auto-rows-fr grid-cols-2 gap-2 [&>li:last-child:nth-child(odd)]:col-span-2">
            {shown.map((item, index) => (
              <li
                key={item.href}
                className="quick-row"
                style={{ animationDelay: `${40 + index * 18}ms` }}
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
                  className="group flex h-full min-h-[5.25rem] flex-col justify-between gap-2 rounded-[18px] border border-white/[0.16] bg-white/[0.09] p-3 outline-none transition-[background-color,border-color,transform] duration-150 hover:border-white/30 hover:bg-white/[0.16] focus-visible:ring-2 focus-visible:ring-ring active:scale-[0.97]"
                >
                  <span
                    className={cn(
                      "inline-flex size-9 shrink-0 items-center justify-center rounded-[12px] bg-gradient-to-br text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.4),0_6px_14px_-8px_rgba(0,0,0,0.6)] [&_svg]:size-[18px]",
                      item.tint,
                    )}
                  >
                    {item.icon}
                  </span>
                  <span className="min-w-0">
                    <span className="block text-[14.5px] font-bold leading-tight text-white">
                      {item.title}
                    </span>
                    <span className="mt-0.5 block truncate text-[12.5px] leading-snug text-white/70">
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
