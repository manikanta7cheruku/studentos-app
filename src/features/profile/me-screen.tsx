"use client";

import Link from "next/link";
import { PencilIcon, SettingsIcon, SparklesIcon } from "lucide-react";
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

/** My own profile, as classmates see it, with the ways to change it. */
export function MeScreen() {
  const { slug, membership } = useCollege();
  const state = useLoad(async () => {
    const [profile, skills] = await Promise.all([api.profile.get(), api.profile.skills()]);
    return { profile, skills: skills.skills };
  }, [slug]);

  return (
    <div className="mx-auto w-full max-w-4xl px-5 py-8 md:px-8 md:py-12">
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
                <Button asChild>
                  <Link href={`/c/${slug}/me/edit`}>
                    <PencilIcon aria-hidden="true" /> Edit profile
                  </Link>
                </Button>
                <Button asChild variant="outline">
                  <Link href={`/c/${slug}/me/skills`}>
                    <SparklesIcon aria-hidden="true" /> Skills
                  </Link>
                </Button>
                <Button asChild variant="ghost">
                  <Link href={`/c/${slug}/me/settings`}>
                    <SettingsIcon aria-hidden="true" /> Settings
                  </Link>
                </Button>
              </>
            }
          />
          <p className="mt-2 border-t border-border pt-4 text-[15px] text-ink-muted">
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
