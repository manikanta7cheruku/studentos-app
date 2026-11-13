"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Dialog as DialogPrimitive } from "radix-ui";
import {
  BellIcon,
  InboxIcon,
  MessageCircleIcon,
  MessageSquareHeartIcon,
  ScaleIcon,
  UsersRoundIcon,
} from "lucide-react";
import { cn } from "cn";
import { api } from "@/lib/api/endpoints";
import { useLoad } from "@/lib/use-load";
import { useOverlayHistory } from "@/lib/use-overlay-history";

/** How long a press must last to count as a hold, and how long to wait for a second tap. */
export const HOLD_MS = 650;
export const DOUBLE_TAP_MS = 280;

/**
 * Gestures for the + button. A single tap opens the full list of things to create, after a very short wait to be sure no
 * second tap follows (so a double tap never flashes that list). A double tap, or a press held for about two thirds of a
 * second, opens the shortcuts instead: messages, requests, alerts, people and feedback.
 */
export function usePlusGestures({ onTap, onQuick }: { onTap: () => void; onQuick: () => void }) {
  const holdTimer = React.useRef<number | null>(null);
  const tapTimer = React.useRef<number | null>(null);
  const held = React.useRef(false);

  const clearHold = () => {
    if (holdTimer.current !== null) window.clearTimeout(holdTimer.current);
    holdTimer.current = null;
  };
  const clearTap = () => {
    if (tapTimer.current !== null) window.clearTimeout(tapTimer.current);
    tapTimer.current = null;
  };
  React.useEffect(
    () => () => {
      if (holdTimer.current !== null) window.clearTimeout(holdTimer.current);
      if (tapTimer.current !== null) window.clearTimeout(tapTimer.current);
    },
    [],
  );

  return {
    props: {
      onPointerDown: () => {
        held.current = false;
        clearHold();
        holdTimer.current = window.setTimeout(() => {
          held.current = true;
          clearTap();
          navigator.vibrate?.(12);
          onQuick();
        }, HOLD_MS);
      },
      onPointerUp: clearHold,
      onPointerLeave: clearHold,
      onPointerCancel: clearHold,
      // A long press on a phone would otherwise open the browser's own menu.
      onContextMenu: (event: React.MouseEvent) => event.preventDefault(),
      onClick: () => {
        // The press that opened the shortcuts also ends in a click: ignore it.
        if (held.current) {
          held.current = false;
          return;
        }
        if (tapTimer.current !== null) {
          // The second tap of a double tap.
          clearTap();
          navigator.vibrate?.(8);
          onQuick();
          return;
        }
        tapTimer.current = window.setTimeout(() => {
          tapTimer.current = null;
          onTap();
        }, DOUBLE_TAP_MS);
      },
    },
  };
}

const HINT_KEY = "studentos.plusHint";
const HINT_TIMES = 2;

function readHintCount(): number {
  try {
    return Number(window.localStorage.getItem(HINT_KEY) ?? "0") || 0;
  } catch {
    return 0;
  }
}
function writeHintCount(n: number) {
  try {
    window.localStorage.setItem(HINT_KEY, String(n));
  } catch {
    // No storage (a private window): the hint may show again, which is harmless.
  }
}
/** The person used the shortcuts, so they know: stop showing the hint. */
export function plusHintDone() {
  writeHintCount(HINT_TIMES);
}

/**
 * A small glass tip beside the + button: "double tap or hold for shortcuts". It shows the first two times someone opens
 * the app after signing in (counted on this device), fades by itself after a few seconds, and never comes back once the
 * shortcuts have been used.
 */
export function PlusHint({ enabled }: { enabled: boolean }) {
  const [visible, setVisible] = React.useState(false);
  React.useEffect(() => {
    if (!enabled || readHintCount() >= HINT_TIMES) return;
    const show = window.setTimeout(() => {
      writeHintCount(readHintCount() + 1);
      setVisible(true);
    }, 1800);
    const hide = window.setTimeout(() => setVisible(false), 1800 + 7000);
    return () => {
      window.clearTimeout(show);
      window.clearTimeout(hide);
    };
  }, [enabled]);
  if (!enabled || !visible) return null;
  return (
    <>
      {/* A soft ring that breathes around the + button on a phone. */}
      <span
        aria-hidden="true"
        className="plus-ring pointer-events-none fixed bottom-[calc(0.75rem+var(--safe-bottom))] right-3 z-40 size-16 rounded-[22px] md:hidden"
      />
      <button
        type="button"
        onClick={() => setVisible(false)}
        className="glass-clear plus-hint fixed bottom-[calc(5.6rem+var(--safe-bottom))] right-3 z-40 max-w-[15.5rem] rounded-[20px] px-4 py-3 text-left outline-none focus-visible:ring-2 focus-visible:ring-ring md:bottom-auto md:left-5 md:right-auto md:top-[7.6rem]"
      >
        <span className="block text-[13.5px] font-semibold">Shortcuts on the + button</span>
        <span className="mt-0.5 block text-[12.5px] leading-snug text-ink-muted">
          Double tap it, or hold it, to jump to messages, requests and more.
        </span>
      </button>
    </>
  );
}

/**
 * The shortcuts: not things to create (the + sheet has those) but where people go all day. A fan of clear glass pills that
 * springs out of the + button over a barely dimmed page, so the page stays visible behind it.
 */
export function QuickCreate({
  slug,
  unread,
  open,
  onOpenChange,
}: {
  slug: string;
  unread: number;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const router = useRouter();
  const overlay = useOverlayHistory(open, onOpenChange);
  return (
    <DialogPrimitive.Root open={open} onOpenChange={onOpenChange}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="quick-scrim fixed inset-0 z-50" />
        <DialogPrimitive.Content
          aria-describedby={undefined}
          className="fixed bottom-[calc(5.4rem+var(--safe-bottom))] right-3 z-50 outline-none md:bottom-auto md:left-5 md:right-auto md:top-[7.6rem]"
        >
          <DialogPrimitive.Title className="sr-only">Shortcuts</DialogPrimitive.Title>
          <ShortcutList
            slug={slug}
            unread={unread}
            onGo={(href) => overlay.goTo(href, router.push)}
          />
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}

function ShortcutList({
  slug,
  unread,
  onGo,
}: {
  slug: string;
  unread: number;
  onGo: (href: string) => void;
}) {
  // Only mounted while the menu is open, so the count is fetched when it is needed.
  const threads = useLoad(() => api.messages.threads(slug), [slug]);
  const waiting =
    threads.status === "ready" ? threads.data.reduce((sum, thread) => sum + thread.unread, 0) : 0;
  const items = [
    {
      href: `/c/${slug}/messages`,
      title: "Messages",
      icon: <MessageCircleIcon aria-hidden="true" />,
      count: waiting,
    },
    {
      href: `/c/${slug}/collaborate/requests`,
      title: "My requests",
      icon: <InboxIcon aria-hidden="true" />,
      count: 0,
    },
    {
      href: `/c/${slug}/notifications`,
      title: "Notifications",
      icon: <BellIcon aria-hidden="true" />,
      count: unread,
    },
    {
      href: `/c/${slug}/debates`,
      title: "Debates",
      icon: <ScaleIcon aria-hidden="true" />,
      count: 0,
    },
    {
      href: `/c/${slug}/people`,
      title: "Network",
      icon: <UsersRoundIcon aria-hidden="true" />,
      count: 0,
    },
    {
      href: `/c/${slug}/feedback`,
      title: "Send feedback",
      icon: <MessageSquareHeartIcon aria-hidden="true" />,
      count: 0,
    },
  ];
  // The pills lean back along an arc, so the stack reads as a fan growing out of the button.
  const lean = [0, 6, 12, 18, 22, 24];
  return (
    <ul className="flex flex-col items-end gap-2.5 md:items-start">
      {[...items].reverse().map((item, reversed) => {
        const index = items.length - 1 - reversed;
        return (
          <li
            key={item.href}
            className="quick-pop"
            style={{ animationDelay: `${index * 45}ms`, marginRight: lean[index] }}
          >
            <Link
              href={item.href}
              prefetch={false}
              onClick={(event) => {
                plusHintDone();
                if (event.metaKey || event.ctrlKey || event.shiftKey || event.button !== 0) return;
                event.preventDefault();
                onGo(item.href);
              }}
              className="glass-clear group flex h-[52px] w-[15rem] items-center gap-3 rounded-full py-1.5 pl-5 pr-1.5 outline-none transition-[transform,background-color] duration-200 hover:bg-white/[0.12] focus-visible:ring-2 focus-visible:ring-ring active:scale-95 md:flex-row-reverse md:pl-1.5 md:pr-5 [&_svg]:size-[18px]"
            >
              <span className="min-w-0 flex-1 truncate text-left text-[14.5px] font-semibold leading-none">
                {item.title}
              </span>
              <span
                className={cn(
                  "relative inline-flex size-10 shrink-0 items-center justify-center rounded-full bg-white/[0.14] text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.35)] transition-colors group-hover:bg-white/[0.22]",
                )}
              >
                {item.icon}
                {item.count > 0 ? (
                  <span
                    aria-label={`${item.count} new`}
                    className="tabular bg-brand absolute -right-1 -top-1 min-w-[18px] rounded-full px-1 text-center text-[10px] font-bold leading-[18px] text-white"
                  >
                    {item.count > 99 ? "99+" : item.count}
                  </span>
                ) : null}
              </span>
            </Link>
          </li>
        );
      })}
    </ul>
  );
}
