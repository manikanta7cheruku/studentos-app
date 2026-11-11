"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { DropdownMenu } from "radix-ui";
import {
  BellIcon,
  BriefcaseIcon,
  Building2Icon,
  CalendarDaysIcon,
  PackageSearchIcon,
  StoreIcon,
  ChevronDownIcon,
  ChevronsUpDownIcon,
  GlobeIcon,
  HouseIcon,
  MapPinnedIcon,
  MessageCircleHeartIcon,
  LogOutIcon,
  PlusIcon,
  SettingsIcon,
  ShieldCheckIcon,
  UserRoundIcon,
  UsersIcon,
  UsersRoundIcon,
} from "lucide-react";
import { cn } from "cn";
import { Avatar } from "@/components/app/avatar";
import { CreateSheet } from "@/components/app/create-sheet";
import { GLOBAL_SLUG, homePath } from "@/lib/home-path";
import { useSession } from "@/features/session/session-provider";
import { useCollege } from "./college-provider";

type NavItem = { href: string; label: string; icon: React.ReactNode; match?: string[] };

function isCurrent(pathname: string, item: NavItem): boolean {
  const targets = [item.href, ...(item.match ?? [])];
  return targets.some((target) => pathname === target || pathname.startsWith(`${target}/`));
}

function useNav(): { tabs: NavItem[]; more: NavItem[] } {
  const { slug, college, isModerator } = useCollege();
  const base = `/c/${slug}`;
  const tabs: NavItem[] = [
    { href: `${base}/home`, label: "Home", icon: <HouseIcon /> },
    { href: `${base}/collaborate`, label: "Plans", icon: <UsersIcon /> },
    { href: `${base}/ideas`, label: "Buzz", icon: <MessageCircleHeartIcon /> },
    { href: `${base}/me`, label: "You", icon: <UserRoundIcon /> },
  ];
  const more: NavItem[] = [];
  if (college.modules.campus && slug !== GLOBAL_SLUG)
    more.push({ href: `${base}/campus`, label: "Campus", icon: <Building2Icon /> });
  more.push({ href: `${base}/events`, label: "Events", icon: <CalendarDaysIcon /> });
  more.push({ href: `${base}/turf`, label: "Turf and courts", icon: <MapPinnedIcon /> });
  more.push({ href: `${base}/lost-found`, label: "Lost and found", icon: <PackageSearchIcon /> });
  more.push({ href: `${base}/market`, label: "Marketplace", icon: <StoreIcon /> });
  more.push({ href: `${base}/people`, label: "People", icon: <UsersRoundIcon /> });
  more.push({ href: `${base}/career`, label: "Careers", icon: <BriefcaseIcon /> });
  if (isModerator) more.push({ href: `${base}/admin`, label: "Admin", icon: <ShieldCheckIcon /> });
  return { tabs, more };
}

function CollegeMark({ className }: { className?: string }) {
  const { college } = useCollege();
  const initials = (college.short_name || college.name).slice(0, 2).toUpperCase();
  return (
    <span
      aria-hidden="true"
      className={cn(
        "bg-brand inline-flex size-9 shrink-0 items-center justify-center rounded-[11px] font-heading text-[14px] font-bold text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.3)]",
        className,
      )}
    >
      {initials}
    </span>
  );
}

function BellLink({ className }: { className?: string }) {
  const { slug, unread } = useCollege();
  const label = unread > 0 ? `Notifications, ${unread} unread` : "Notifications";
  return (
    <Link
      href={`/c/${slug}/notifications`}
      aria-label={label}
      className={cn(
        "relative inline-flex size-10 items-center justify-center rounded-xl text-ink-muted transition-colors duration-200 hover:bg-white/[0.08] hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
        className,
      )}
    >
      <BellIcon aria-hidden="true" className="size-[19px]" />
      {unread > 0 ? (
        <span
          aria-hidden="true"
          className="tabular bg-brand absolute right-0.5 top-0.5 min-w-[16px] rounded-full px-1 text-center text-[10px] font-bold leading-[16px] text-white"
        >
          {unread > 99 ? "99+" : unread}
        </span>
      ) : null}
    </Link>
  );
}

function UserMenu({ align = "start" }: { align?: "start" | "end" }) {
  const { slug, profile, membership } = useCollege();
  const session = useSession();
  const name = profile?.display_name ?? "You";
  const spaces = session.colleges.filter((item) => item.membership.status === "active");
  const others = spaces.filter((item) => item.college.slug !== slug);
  const inGlobal = spaces.some((item) => item.college.slug === GLOBAL_SLUG);
  const roleLabel =
    membership.role === "college_admin"
      ? "College admin"
      : membership.role === "moderator"
        ? "Moderator"
        : "Student";

  async function signOut() {
    await session.signOut();
  }

  return (
    <DropdownMenu.Root>
      <DropdownMenu.Trigger asChild>
        <button
          type="button"
          className="flex min-h-14 w-full items-center gap-3 rounded-lg px-2 text-left transition-colors hover:bg-accent-soft focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          aria-label={`Account menu for ${name}`}
        >
          <Avatar name={name} src={profile?.avatar_url} size="sm" />
          <span className="min-w-0 flex-1">
            <span className="block truncate text-[13.5px] font-semibold text-ink">{name}</span>
            <span className="block truncate text-[12px] text-ink-muted">{roleLabel}</span>
          </span>
          <ChevronsUpDownIcon aria-hidden="true" className="size-4 shrink-0 text-ink-muted" />
        </button>
      </DropdownMenu.Trigger>
      <DropdownMenu.Portal>
        <DropdownMenu.Content
          align={align}
          side="top"
          sideOffset={8}
          className="z-50 w-60 glass-card rounded-[22px] p-1.5 text-[13.5px] shadow-[0_8px_24px_-12px_rgba(27,26,23,0.25)]"
        >
          {others.length || !inGlobal ? (
            <>
              <DropdownMenu.Label className="px-3 pb-1 pt-2 text-[12px] font-semibold uppercase tracking-[0.08em] text-ink-muted">
                Switch space
              </DropdownMenu.Label>
              {others.map((item) => (
                <DropdownMenu.Item key={item.college.slug} asChild>
                  <Link
                    href={homePath(item.college.slug)}
                    className="flex min-h-11 items-center gap-3 rounded-md px-3 outline-none data-[highlighted]:bg-accent-soft"
                  >
                    <GlobeIcon aria-hidden="true" className="size-[18px] text-ink-muted" />
                    {item.college.slug === GLOBAL_SLUG ? "Global" : item.college.name}
                  </Link>
                </DropdownMenu.Item>
              ))}
              {!inGlobal ? (
                <DropdownMenu.Item asChild>
                  <Link
                    href={`/c/${GLOBAL_SLUG}/join`}
                    className="flex min-h-11 items-center gap-3 rounded-md px-3 outline-none data-[highlighted]:bg-accent-soft"
                  >
                    <GlobeIcon aria-hidden="true" className="size-[18px] text-ink-muted" />
                    Join Global
                  </Link>
                </DropdownMenu.Item>
              ) : null}
              <DropdownMenu.Separator className="my-1 h-px bg-border" />
            </>
          ) : null}
          <DropdownMenu.Item asChild>
            <Link
              href={`/c/${slug}/me/settings`}
              className="flex min-h-11 items-center gap-3 rounded-md px-3 outline-none data-[highlighted]:bg-accent-soft"
            >
              <SettingsIcon aria-hidden="true" className="size-[18px] text-ink-muted" />
              Settings
            </Link>
          </DropdownMenu.Item>
          <DropdownMenu.Separator className="my-1 h-px bg-border" />
          <DropdownMenu.Item
            onSelect={() => void signOut()}
            className="flex min-h-11 cursor-pointer items-center gap-3 rounded-md px-3 outline-none data-[highlighted]:bg-accent-soft"
          >
            <LogOutIcon aria-hidden="true" className="size-[18px] text-ink-muted" />
            Sign out
          </DropdownMenu.Item>
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  );
}

function SideNavLink({ item, pathname }: { item: NavItem; pathname: string }) {
  const current = isCurrent(pathname, item);
  return (
    <Link
      href={item.href}
      aria-current={current ? "page" : undefined}
      className={cn(
        "group relative flex min-h-10 items-center gap-3 rounded-xl px-3 text-[14px] font-medium outline-none transition-[background-color,color,transform] duration-200 focus-visible:ring-2 focus-visible:ring-ring active:scale-[0.98] [&_svg]:size-[18px] [&_svg]:shrink-0",
        current
          ? "bg-white/[0.08] text-ink"
          : "text-ink-muted hover:bg-white/[0.05] hover:text-ink",
      )}
    >
      <span
        aria-hidden="true"
        className={cn(
          "transition-colors duration-200",
          current ? "text-[#b9b4ee]" : "group-hover:text-ink",
        )}
      >
        {item.icon}
      </span>
      {item.label}
    </Link>
  );
}

/** The space I am in, as a small chip that opens the list of my spaces. */
function SpaceMenu() {
  const { slug, college } = useCollege();
  const session = useSession();
  const spaces = session.colleges.filter((item) => item.membership.status === "active");
  const inGlobal = spaces.some((item) => item.college.slug === GLOBAL_SLUG);
  const label = slug === GLOBAL_SLUG ? "Global" : college.short_name || college.name;
  return (
    <DropdownMenu.Root>
      <DropdownMenu.Trigger asChild>
        <button
          type="button"
          aria-label={`Space: ${label}. Switch space`}
          className="group flex min-w-0 items-center gap-2 rounded-full border border-white/10 bg-white/[0.05] py-1 pl-1 pr-2.5 text-[13px] font-semibold outline-none transition-[background-color,border-color] duration-200 hover:border-white/25 hover:bg-white/[0.09] focus-visible:ring-2 focus-visible:ring-ring"
        >
          {slug === GLOBAL_SLUG ? (
            <span className="bg-brand inline-flex size-7 items-center justify-center rounded-full text-white">
              <GlobeIcon aria-hidden="true" className="size-4" />
            </span>
          ) : (
            <CollegeMark className="size-7 rounded-full text-[11px]" />
          )}
          <span className="truncate">{label}</span>
          <ChevronDownIcon
            aria-hidden="true"
            className="size-3.5 shrink-0 text-ink-muted transition-transform duration-200 group-aria-expanded:rotate-180"
          />
        </button>
      </DropdownMenu.Trigger>
      <DropdownMenu.Portal>
        <DropdownMenu.Content
          align="start"
          sideOffset={8}
          className="glass z-50 w-64 rounded-2xl bg-[rgba(28,28,38,0.94)] p-1.5 text-[14px] data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:zoom-in-95"
        >
          <DropdownMenu.Label className="px-3 pb-1 pt-2 text-[11px] font-semibold uppercase tracking-[0.08em] text-ink-muted">
            Your spaces
          </DropdownMenu.Label>
          {spaces.map((item) => (
            <DropdownMenu.Item key={item.college.slug} asChild>
              <Link
                href={homePath(item.college.slug)}
                className="flex min-h-10 items-center gap-3 rounded-xl px-3 outline-none data-[highlighted]:bg-white/[0.08]"
              >
                {item.college.slug === GLOBAL_SLUG ? (
                  <GlobeIcon aria-hidden="true" className="size-4 text-ink-muted" />
                ) : (
                  <Building2Icon aria-hidden="true" className="size-4 text-ink-muted" />
                )}
                <span className="flex-1 truncate">
                  {item.college.slug === GLOBAL_SLUG ? "Global" : item.college.name}
                </span>
                {item.college.slug === slug ? (
                  <span aria-hidden="true" className="bg-brand size-2 rounded-full" />
                ) : null}
              </Link>
            </DropdownMenu.Item>
          ))}
          <DropdownMenu.Separator className="my-1 h-px bg-white/10" />
          {!inGlobal ? (
            <DropdownMenu.Item asChild>
              <Link
                href={`/c/${GLOBAL_SLUG}/join`}
                className="flex min-h-10 items-center gap-3 rounded-xl px-3 outline-none data-[highlighted]:bg-white/[0.08]"
              >
                <PlusIcon aria-hidden="true" className="size-4 text-ink-muted" />
                Join Global
              </Link>
            </DropdownMenu.Item>
          ) : null}
          <DropdownMenu.Item asChild>
            <Link
              href="/find"
              className="flex min-h-10 items-center gap-3 rounded-xl px-3 outline-none data-[highlighted]:bg-white/[0.08]"
            >
              <PlusIcon aria-hidden="true" className="size-4 text-ink-muted" />
              Add your college
            </Link>
          </DropdownMenu.Item>
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  );
}

export function CollegeShell({ children }: { children: React.ReactNode }) {
  const { slug } = useCollege();
  const pathname = usePathname();
  const { tabs, more } = useNav();
  const [creating, setCreating] = React.useState(false);
  const router = useRouter();
  const mainRef = React.useRef<HTMLElement>(null);
  // Which way the last move between tabs went (1 forward, -1 back), so the next page slides in from that side.
  const direction = React.useRef<1 | -1 | 0>(0);
  const tabIndex = tabs.findIndex((item) => pathname === item.href);
  // Load the other tabs ahead of time, so a swipe or a tap shows the next page at once.
  React.useEffect(() => {
    for (const item of tabs) router.prefetch(item.href);
  }, [router, tabs]);
  const swipe = React.useRef<{
    x: number;
    y: number;
    t: number;
    mode: "idle" | "horizontal" | "ignore";
  } | null>(null);

  // The new page eases in: from the side after a swipe or a tab tap, otherwise from below.
  React.useEffect(() => {
    const node = mainRef.current;
    if (!node) return;
    node.style.transition = "";
    node.style.transform = "";
    node.style.opacity = "";
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const dir = direction.current;
    direction.current = 0;
    node.animate(
      [
        { opacity: 0, transform: dir ? `translateX(${dir * 36}px)` : "translateY(10px)" },
        { opacity: 1, transform: "none" },
      ],
      { duration: dir ? 280 : 320, easing: "cubic-bezier(0.2, 0.8, 0.2, 1)" },
    );
  }, [pathname]);

  function startsInsideScroller(target: EventTarget | null): boolean {
    let node = target instanceof Element ? target : null;
    while (node && node !== mainRef.current) {
      if (node.matches("input, textarea, select, [data-no-swipe], [role=dialog]")) return true;
      const style = window.getComputedStyle(node);
      if (/(auto|scroll)/.test(style.overflowX) && node.scrollWidth > node.clientWidth + 2)
        return true;
      node = node.parentElement;
    }
    return false;
  }

  function onTouchStart(event: React.TouchEvent) {
    const touch = event.touches[0];
    if (!touch || tabIndex < 0 || event.touches.length > 1) {
      swipe.current = null;
      return;
    }
    swipe.current = {
      x: touch.clientX,
      y: touch.clientY,
      t: Date.now(),
      mode: startsInsideScroller(event.target) ? "ignore" : "idle",
    };
  }

  function onTouchMove(event: React.TouchEvent) {
    const gesture = swipe.current;
    const touch = event.touches[0];
    const node = mainRef.current;
    if (!gesture || !touch || !node || gesture.mode === "ignore") return;
    const dx = touch.clientX - gesture.x;
    const dy = touch.clientY - gesture.y;
    if (gesture.mode === "idle") {
      if (Math.abs(dy) > 12 && Math.abs(dy) > Math.abs(dx)) gesture.mode = "ignore";
      else if (Math.abs(dx) > 12 && Math.abs(dx) > Math.abs(dy) * 1.4) gesture.mode = "horizontal";
      return;
    }
    const neighbour = tabs[tabIndex + (dx < 0 ? 1 : -1)];
    // The page follows the finger, and pulls back harder when there is no page that way.
    node.style.transition = "none";
    node.style.transform = `translateX(${dx * (neighbour ? 0.45 : 0.12)}px)`;
    node.style.opacity = String(Math.max(0.5, 1 - Math.abs(dx) / 500));
  }

  function onTouchEnd(event: React.TouchEvent) {
    const gesture = swipe.current;
    const node = mainRef.current;
    swipe.current = null;
    if (!gesture || !node || gesture.mode !== "horizontal") return;
    const touch = event.changedTouches[0];
    if (!touch) return;
    const dx = touch.clientX - gesture.x;
    const speed = Math.abs(dx) / Math.max(1, Date.now() - gesture.t);
    const neighbour = tabs[tabIndex + (dx < 0 ? 1 : -1)];
    node.style.transition = "transform 200ms cubic-bezier(0.2,0.8,0.2,1), opacity 200ms";
    if (neighbour && (Math.abs(dx) > 70 || speed > 0.5)) {
      direction.current = dx < 0 ? 1 : -1;
      node.style.transform = `translateX(${dx < 0 ? -28 : 28}px)`;
      node.style.opacity = "0.75";
      router.push(neighbour.href);
    } else {
      node.style.transform = "";
      node.style.opacity = "";
    }
  }

  return (
    <div className="min-h-dvh text-ink md:grid md:grid-cols-[15.5rem_minmax(0,1fr)]">
      <a
        href="#main"
        className="sr-only z-50 rounded-xl bg-surface px-4 py-3 font-medium text-ink focus:not-sr-only focus:fixed focus:left-3 focus:top-3 focus:ring-2 focus:ring-ring"
      >
        Skip to content
      </a>

      {/* Desktop and tablet: a quiet sidebar */}
      <aside className="sticky top-0 hidden h-dvh flex-col gap-5 border-r border-white/[0.07] px-3.5 py-5 md:flex">
        <div className="flex items-center justify-between px-1">
          <SpaceMenu />
          <BellLink />
        </div>
        <button
          type="button"
          onClick={() => setCreating(true)}
          className="bg-brand flex h-10 items-center justify-center gap-2 rounded-xl text-[14px] font-semibold text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.28),0_8px_20px_-10px_rgba(8,6,30,0.55)] outline-none transition-[transform,filter] duration-200 hover:brightness-110 focus-visible:ring-2 focus-visible:ring-ring active:scale-[0.97] motion-safe:hover:-translate-y-px"
        >
          <PlusIcon aria-hidden="true" className="size-[18px]" /> Create
        </button>
        <nav aria-label="College" className="flex flex-1 flex-col gap-6 overflow-y-auto">
          <ul className="flex flex-col gap-0.5">
            {tabs.map((item) => (
              <li key={item.href}>
                <SideNavLink item={item} pathname={pathname} />
              </li>
            ))}
          </ul>
          <div>
            <p className="px-3 pb-1.5 text-[11px] font-semibold uppercase tracking-[0.08em] text-ink-muted">
              More
            </p>
            <ul className="flex flex-col gap-0.5">
              {more.map((item) => (
                <li key={item.href}>
                  <SideNavLink item={item} pathname={pathname} />
                </li>
              ))}
            </ul>
          </div>
        </nav>
        <div className="border-t border-white/[0.07] pt-3">
          <UserMenu />
        </div>
      </aside>

      <div className="flex min-h-dvh min-w-0 flex-col overflow-x-clip">
        {/* Phone: the space I am in and the bell */}
        <header className="sticky top-0 z-30 flex h-14 items-center gap-3 px-4 md:hidden">
          <div
            aria-hidden="true"
            className="absolute inset-0 -z-10 bg-gradient-to-b from-bg via-bg/80 to-transparent"
          />
          <SpaceMenu />
          <div className="flex-1" />
          <BellLink />
        </header>

        <main
          id="main"
          ref={mainRef}
          tabIndex={-1}
          onTouchStart={onTouchStart}
          onTouchMove={onTouchMove}
          onTouchEnd={onTouchEnd}
          onTouchCancel={onTouchEnd}
          className="flex-1 touch-pan-y pb-[calc(6.5rem+var(--safe-bottom))] outline-none md:pb-16"
        >
          {children}
        </main>
      </div>

      {/* Phone: a glass dock. Only the open page shows its name. The + is its own button. */}
      <div className="pointer-events-none fixed inset-x-3 bottom-[calc(0.75rem+var(--safe-bottom))] z-40 flex gap-2.5 md:hidden">
        <nav
          aria-label="College"
          className="glass-clear pointer-events-auto relative grid h-16 flex-1 grid-cols-4 items-center rounded-[22px] p-1.5"
        >
          {/* One highlight that travels to the open tab. */}
          <span
            aria-hidden="true"
            className="absolute inset-y-1.5 left-1.5 w-[calc((100%-0.75rem)/4)] rounded-2xl bg-white/[0.17] shadow-[inset_0_1px_0_rgba(255,255,255,0.35)] transition-[transform,opacity] duration-[420ms] ease-[cubic-bezier(0.3,1.2,0.4,1)]"
            style={{
              transform: `translateX(${Math.max(tabIndex, 0) * 100}%)`,
              opacity: tabIndex >= 0 ? 1 : 0,
            }}
          />
          {tabs.map((item, index) => {
            const current = isCurrent(pathname, item);
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => {
                  if (tabIndex >= 0 && index !== tabIndex)
                    direction.current = index > tabIndex ? 1 : -1;
                }}
                aria-current={current ? "page" : undefined}
                className={cn(
                  "relative z-10 flex h-[52px] flex-col items-center justify-center gap-0.5 rounded-2xl text-[10.5px] font-semibold outline-none transition-colors duration-300 focus-visible:ring-2 focus-visible:ring-ring active:scale-95 [&_svg]:size-[20px] [&_svg]:shrink-0",
                  current ? "text-white" : "text-white/60 hover:text-white/90",
                )}
              >
                <span aria-hidden="true">{item.icon}</span>
                {item.label}
              </Link>
            );
          })}
        </nav>
        <button
          type="button"
          aria-label="Create"
          onClick={() => setCreating(true)}
          className="glass-brand pointer-events-auto flex size-16 shrink-0 items-center justify-center rounded-[22px] text-white outline-none transition-transform duration-150 focus-visible:ring-2 focus-visible:ring-ring active:scale-[0.88]"
        >
          <PlusIcon aria-hidden="true" className="size-6" strokeWidth={2.4} />
        </button>
      </div>

      <CreateSheet slug={slug} open={creating} onOpenChange={setCreating} />
    </div>
  );
}

export { UserMenu, BellLink };
