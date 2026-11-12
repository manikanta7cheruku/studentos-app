"use client";

import * as React from "react";
import Link from "next/link";
import {
  BellIcon,
  BriefcaseIcon,
  Building2Icon,
  CalendarDaysIcon,
  PackageSearchIcon,
  StoreIcon,
  ChevronRightIcon,
  InboxIcon,
  MessageCircleIcon,
  MessageSquareHeartIcon,
  MapPinnedIcon,
  PencilIcon,
  SettingsIcon,
  ShieldCheckIcon,
  SparklesIcon,
  UsersRoundIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { LoadError } from "@/components/app/load-error";
import { api } from "@/lib/api/endpoints";
import { useLoad } from "@/lib/use-load";
import { useCollege } from "@/features/college";
import { ProfileView } from "./profile-view";

function ProfileSkeleton() {
  return (
    <div aria-busy="true" aria-label="Loading your profile" className="flex flex-col gap-6">
      <div className="flex items-center gap-6">
        <Skeleton className="size-24 rounded-full" />
        <div className="flex-1">
          <Skeleton className="h-9 w-2/3" />
          <Skeleton className="mt-3 h-5 w-1/2" />
        </div>
      </div>
      <Skeleton className="h-24 w-full" />
      <Skeleton className="h-24 w-full" />
    </div>
  );
}

type MoreRow = { href: string; label: string; text: string; icon: React.ReactNode };

function MoreGroup({ title, rows }: { title: string; rows: MoreRow[] }) {
  if (!rows.length) return null;
  return (
    <section aria-label={title}>
      <h2 className="mb-2.5 px-1 text-[12px] font-bold uppercase tracking-[0.12em] text-ink-muted">
        {title}
      </h2>
      <ul className="glass-card overflow-hidden rounded-[24px]">
        {rows.map((row) => (
          <li key={row.href} className="border-t border-white/[0.06] first:border-t-0">
            <Link
              href={row.href}
              className="group flex items-center gap-3.5 px-4 py-3 outline-none transition-colors duration-200 hover:bg-white/[0.05] focus-visible:bg-white/[0.07]"
            >
              <span className="inline-flex size-9 items-center justify-center rounded-xl bg-white/[0.07] text-ink-muted transition-colors duration-200 group-hover:text-ink [&_svg]:size-[18px]">
                {row.icon}
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-[14.5px] font-semibold">{row.label}</span>
                <span className="block text-[12.5px] text-ink-muted">{row.text}</span>
              </span>
              <ChevronRightIcon
                aria-hidden="true"
                className="size-4 text-ink-muted transition-transform duration-200 group-hover:translate-x-0.5"
              />
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}

/** The places that are not in the dock, in three groups: what I do, what is around me, and my account. */
function MoreMenu() {
  const { slug, college, isModerator } = useCollege();
  const activity: MoreRow[] = [
    {
      href: `/c/${slug}/messages`,
      label: "Messages",
      text: "Private notes that disappear",
      icon: <MessageCircleIcon />,
    },
    {
      href: `/c/${slug}/collaborate/requests`,
      label: "My requests",
      text: "Plans you asked to join",
      icon: <InboxIcon />,
    },
    {
      href: `/c/${slug}/notifications`,
      label: "Notifications",
      text: "What happened for you",
      icon: <BellIcon />,
    },
  ];
  const explore: MoreRow[] = [
    {
      href: `/c/${slug}/people`,
      label: "People",
      text: "Find classmates",
      icon: <UsersRoundIcon />,
    },
    ...(college.modules.campus && slug !== "global"
      ? [
          {
            href: `/c/${slug}/campus`,
            label: "Campus",
            text: "Notices from your college",
            icon: <Building2Icon />,
          },
        ]
      : []),
    {
      href: `/c/${slug}/events`,
      label: "Events",
      text: "Talks, fests, meetups",
      icon: <CalendarDaysIcon />,
    },
    {
      href: `/c/${slug}/turf`,
      label: "Turf and courts",
      text: "Book a ground, find players",
      icon: <MapPinnedIcon />,
    },
    {
      href: `/c/${slug}/lost-found`,
      label: "Lost and found",
      text: "Lost it? Found it?",
      icon: <PackageSearchIcon />,
    },
    {
      href: `/c/${slug}/market`,
      label: "Marketplace",
      text: "Buy, sell, rent, free",
      icon: <StoreIcon />,
    },
    { href: `/c/${slug}/career`, label: "Careers", text: "Coming soon", icon: <BriefcaseIcon /> },
  ];
  const account: MoreRow[] = [
    {
      href: `/c/${slug}/feedback`,
      label: "Send feedback",
      text: "An idea, or something wrong",
      icon: <MessageSquareHeartIcon />,
    },
    ...(isModerator
      ? [
          {
            href: `/c/${slug}/admin`,
            label: "College admin",
            text: "Members, notices and reports",
            icon: <ShieldCheckIcon />,
          },
        ]
      : []),
  ];
  return (
    <nav aria-label="More" className="stagger mt-6 flex flex-col gap-6">
      <MoreGroup title="Your activity" rows={activity} />
      <MoreGroup title="Around you" rows={explore} />
      <MoreGroup title="Help" rows={account} />
    </nav>
  );
}

export function MeScreen() {
  const { slug, membership } = useCollege();
  const state = useLoad(async () => {
    const [profile, skills] = await Promise.all([api.profile.get(), api.profile.skills()]);
    return { profile, skills: skills.skills };
  }, [slug]);

  return (
    <div className="mx-auto w-full max-w-2xl px-5 pt-4 pb-2 md:px-8 md:py-8">
      {state.status === "loading" ? (
        <ProfileSkeleton />
      ) : state.status === "error" ? (
        <LoadError error={state.error} onRetry={state.reload} what="your profile" />
      ) : (
        <>
          <ProfileView
            person={{ ...state.data.profile, skills: state.data.skills }}
            actions={
              <>
                <Button asChild className="rounded-full">
                  <Link href={`/c/${slug}/me/edit`}>
                    <PencilIcon aria-hidden="true" /> Edit profile
                  </Link>
                </Button>
                <Button asChild variant="outline" className="rounded-full">
                  <Link href={`/c/${slug}/me/skills`}>
                    <SparklesIcon aria-hidden="true" /> Skills
                  </Link>
                </Button>
                <Button asChild variant="outline" className="rounded-full">
                  <Link href={`/c/${slug}/me/settings`}>
                    <SettingsIcon aria-hidden="true" /> Settings
                  </Link>
                </Button>
              </>
            }
          />
          <MoreMenu />
          <p className="mt-6 text-[13px] text-ink-muted">
            {state.data.profile.visibility === "hidden"
              ? "Your profile is hidden. Only you can see it."
              : "Verified members of your college can see this page."}{" "}
            {membership.verification_level < 2
              ? "Your membership is not fully verified yet."
              : null}
          </p>
        </>
      )}
    </div>
  );
}
