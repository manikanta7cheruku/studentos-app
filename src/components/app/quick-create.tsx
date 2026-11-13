"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Dialog as DialogPrimitive } from "radix-ui";
import {
  BellIcon,
  CalendarDaysIcon,
  InboxIcon,
  MapPinnedIcon,
  MessageCircleIcon,
  MessageSquareHeartIcon,
  PackageSearchIcon,
  StoreIcon,
  CircleHelpIcon,
  UserPlusIcon,
} from "lucide-react";
import { api } from "@/lib/api/endpoints";
import { useLoad } from "@/lib/use-load";
import { useOverlayHistory } from "@/lib/use-overlay-history";
import { GlassTip } from "./glass-tip";

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
 * A small glass tip above the + button: "double tap or hold for shortcuts". It shows the first two times someone opens the app
 * after signing in (counted on this device), leaves by itself after a few seconds, and never comes back once the shortcuts
 * have been used.
 */
export function PlusHint({ enabled }: { enabled: boolean }) {
  const [visible, setVisible] = React.useState(false);
  React.useEffect(() => {
    if (!enabled || readHintCount() >= HINT_TIMES) return;
    // The "profile moved" tip comes first for people who have not seen it, so two tips never stand on screen together.
    let profileTipPending = false;
    try {
      profileTipPending = window.localStorage.getItem("studentos.profileTip") !== "1";
    } catch {
      profileTipPending = false;
    }
    const show = window.setTimeout(
      () => {
        writeHintCount(readHintCount() + 1);
        setVisible(true);
      },
      profileTipPending ? 10_500 : 1800,
    );
    return () => window.clearTimeout(show);
  }, [enabled]);
  if (!enabled || !visible) return null;
  return (
    <>
      {/* A soft ring that breathes around the + button on a phone. */}
      <span
        aria-hidden="true"
        className="plus-ring pointer-events-none fixed bottom-[calc(0.75rem+var(--safe-bottom))] right-3 z-40 size-16 rounded-[22px] md:hidden"
      />
      <GlassTip
        placement="above"
        title="Shortcuts on the + button"
        text="Double tap it, or hold it, for messages, requests and campus services."
        onClose={() => setVisible(false)}
        className="bottom-[calc(5.9rem+var(--safe-bottom))] right-3 md:bottom-auto md:left-5 md:right-auto md:top-[7.6rem]"
      />
    </>
  );
}

/**
 * The shortcuts: not things to create (the + sheet has those) but where people go all day. One panel of clear glass that grows
 * out of the + button over a barely dimmed page, with what is waiting for me first, then the campus services, then two quick
 * links. Counts show on the rows that have something waiting.
 */
export function QuickCreate({
  slug,
  unread,
  messages,
  isGlobal,
  onTour,
  open,
  onOpenChange,
}: {
  slug: string;
  unread: number;
  messages: number;
  isGlobal: boolean;
  onTour: () => void;
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
          className="quick-panel fixed bottom-[calc(5.5rem+var(--safe-bottom))] right-3 z-50 w-[17.5rem] max-w-[calc(100vw-1.5rem)] outline-none md:bottom-auto md:left-5 md:right-auto md:top-[7.6rem]"
        >
          <DialogPrimitive.Title className="sr-only">Shortcuts</DialogPrimitive.Title>
          <ShortcutList
            slug={slug}
            unread={unread}
            messages={messages}
            isGlobal={isGlobal}
            onTour={() => {
              plusHintDone();
              onOpenChange(false);
              window.setTimeout(onTour, 120);
            }}
            onGo={(href) => overlay.goTo(href, router.push)}
          />
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}

type Shortcut = { href: string; title: string; icon: React.ReactNode; count?: number };

function Row({
  item,
  index,
  onGo,
}: {
  item: Shortcut;
  index: number;
  onGo: (href: string) => void;
}) {
  return (
    <li className="quick-row" style={{ animationDelay: `${60 + index * 28}ms` }}>
      <Link
        href={item.href}
        prefetch={false}
        onClick={(event) => {
          plusHintDone();
          if (event.metaKey || event.ctrlKey || event.shiftKey || event.button !== 0) return;
          event.preventDefault();
          onGo(item.href);
        }}
        className="group flex h-12 items-center gap-3 rounded-2xl px-2 outline-none transition-[background-color,transform] duration-150 hover:bg-white/[0.08] focus-visible:ring-2 focus-visible:ring-ring active:scale-[0.97] active:bg-white/[0.12] [&_svg]:size-[18px]"
      >
        <span className="relative inline-flex size-9 shrink-0 items-center justify-center rounded-xl bg-white/[0.1] text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.28)] transition-colors group-hover:bg-white/[0.18]">
          {item.icon}
        </span>
        <span className="min-w-0 flex-1 truncate text-left text-[14.5px] font-semibold leading-none">
          {item.title}
        </span>
        {item.count && item.count > 0 ? (
          <span
            aria-label={`${item.count} waiting`}
            className="tabular bg-brand min-w-[22px] rounded-full px-1.5 text-center text-[11px] font-bold leading-[22px] text-white"
          >
            {item.count > 99 ? "99+" : item.count}
          </span>
        ) : null}
      </Link>
    </li>
  );
}

function Heading({ children }: { children: React.ReactNode }) {
  return (
    <p className="px-2 pb-1 pt-2.5 text-[11px] font-bold uppercase tracking-[0.1em] text-white/45">
      {children}
    </p>
  );
}

function ShortcutList({
  slug,
  unread,
  messages,
  isGlobal,
  onTour,
  onGo,
}: {
  slug: string;
  unread: number;
  messages: number;
  isGlobal: boolean;
  onTour: () => void;
  onGo: (href: string) => void;
}) {
  // Only mounted while the panel is open, so this count is fetched when it is needed: people waiting for my answer on my posts.
  const requests = useLoad(async () => {
    const mine = await api.teamPosts.list(slug, { mine: true, status: "open", limit: 20 });
    const lists = await Promise.all(
      mine.data.map((post) => api.teamPosts.requests(slug, post.id, "pending")),
    );
    return lists.reduce((sum, list) => sum + list.length, 0);
  }, [slug]);
  const waitingFor: Shortcut[] = [
    {
      href: `/c/${slug}/messages`,
      title: "Messages",
      icon: <MessageCircleIcon aria-hidden="true" />,
      count: messages,
    },
    {
      href: `/c/${slug}/collaborate/requests`,
      title: "Team requests",
      icon: <InboxIcon aria-hidden="true" />,
      count: requests.status === "ready" ? requests.data : 0,
    },
    {
      href: `/c/${slug}/notifications`,
      title: "Notifications",
      icon: <BellIcon aria-hidden="true" />,
      count: unread,
    },
  ];
  const campus: Shortcut[] = [
    { href: `/c/${slug}/events`, title: "Events", icon: <CalendarDaysIcon aria-hidden="true" /> },
    ...(isGlobal
      ? []
      : [
          {
            href: `/c/${slug}/turf`,
            title: "Turf and courts",
            icon: <MapPinnedIcon aria-hidden="true" />,
          },
          {
            href: `/c/${slug}/lost-found`,
            title: "Lost and found",
            icon: <PackageSearchIcon aria-hidden="true" />,
          },
          {
            href: `/c/${slug}/market`,
            title: "Marketplace",
            icon: <StoreIcon aria-hidden="true" />,
          },
        ]),
  ];
  const more: Shortcut[] = [
    {
      href: `/c/${slug}/me/settings#invite`,
      title: "Invite friends",
      icon: <UserPlusIcon aria-hidden="true" />,
    },
    {
      href: `/c/${slug}/feedback`,
      title: "Send feedback",
      icon: <MessageSquareHeartIcon aria-hidden="true" />,
    },
  ];
  let n = 0;
  return (
    <div className="glass-sheet-clear rounded-[26px] p-2">
      <Heading>Waiting for you</Heading>
      <ul>
        {waitingFor.map((item) => (
          <Row key={item.href} item={item} index={n++} onGo={onGo} />
        ))}
      </ul>
      <Heading>Campus</Heading>
      <ul>
        {campus.map((item) => (
          <Row key={item.href} item={item} index={n++} onGo={onGo} />
        ))}
      </ul>
      <div className="mt-1.5 border-t border-white/10 pt-1">
        <ul>
          {more.map((item) => (
            <Row key={item.href} item={item} index={n++} onGo={onGo} />
          ))}
          <li className="quick-row" style={{ animationDelay: `${60 + n * 28}ms` }}>
            <button
              type="button"
              onClick={onTour}
              className="group flex h-12 w-full items-center gap-3 rounded-2xl px-2 outline-none transition-[background-color,transform] duration-150 hover:bg-white/[0.08] focus-visible:ring-2 focus-visible:ring-ring active:scale-[0.97] active:bg-white/[0.12] [&_svg]:size-[18px]"
            >
              <span className="relative inline-flex size-9 shrink-0 items-center justify-center rounded-xl bg-white/[0.1] text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.28)] transition-colors group-hover:bg-white/[0.18]">
                <CircleHelpIcon aria-hidden="true" />
              </span>
              <span className="min-w-0 flex-1 truncate text-left text-[14.5px] font-semibold leading-none">
                How to use StudentOS
              </span>
            </button>
          </li>
        </ul>
      </div>
    </div>
  );
}
