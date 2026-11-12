"use client";

import * as React from "react";
import { DropdownMenu } from "radix-ui";
import { MoreHorizontalIcon } from "lucide-react";
import { cn } from "cn";

export type OverflowItem = {
  label: string;
  icon?: React.ReactNode;
  onSelect: () => void;
  /** Shown in red, for things like Report and Block. */
  danger?: boolean;
};

/**
 * The "..." button. It keeps the rare actions (report, block) in one tidy glass menu instead of loose text buttons on the
 * page. Opens on tap, closes with Escape, works with the keyboard.
 */
export function OverflowMenu({
  items,
  label = "More options",
  className,
}: {
  items: OverflowItem[];
  label?: string;
  className?: string;
}) {
  return (
    <DropdownMenu.Root>
      <DropdownMenu.Trigger asChild>
        <button
          type="button"
          aria-label={label}
          className={cn(
            "inline-flex size-9 items-center justify-center rounded-full text-ink-muted outline-none transition-[background-color,color,transform] duration-150 hover:bg-white/10 hover:text-ink focus-visible:ring-2 focus-visible:ring-ring active:scale-90 aria-expanded:bg-white/10 aria-expanded:text-ink",
            className,
          )}
        >
          <MoreHorizontalIcon aria-hidden="true" className="size-[18px]" />
        </button>
      </DropdownMenu.Trigger>
      <DropdownMenu.Portal>
        <DropdownMenu.Content
          align="end"
          sideOffset={6}
          className="glass z-50 min-w-48 rounded-2xl bg-[rgba(28,28,38,0.94)] p-1.5 text-[14px] data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:zoom-in-95"
        >
          {items.map((item) => (
            <DropdownMenu.Item
              key={item.label}
              onSelect={item.onSelect}
              className={cn(
                "flex min-h-10 cursor-pointer items-center gap-3 rounded-xl px-3 outline-none data-[highlighted]:bg-white/[0.08] [&_svg]:size-4",
                item.danger ? "text-danger" : "text-ink",
              )}
            >
              {item.icon}
              {item.label}
            </DropdownMenu.Item>
          ))}
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  );
}
