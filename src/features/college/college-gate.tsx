"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { WifiOffIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { ScreenMessage } from "@/components/app/screen-message";
import { friendlyMessage } from "@/lib/api-client";
import { SessionProvider } from "@/features/session/session-provider";
import { CollegeContext, useCollegeLoad } from "./college-provider";
import { CollegeShell } from "./college-shell";

// The door of every screen inside a college. It decides, in this order:
//   not signed in            -> sign in, then come back here
//   no such college          -> a not found message
//   not a member (or left)   -> the join screen
//   waiting or refused       -> the status screen
//   active member            -> the college shell with the screen inside
// While it asks, the shell's own outline is shown, so nothing jumps.

function ShellSkeleton() {
  return (
    <div
      className="min-h-dvh bg-bg md:grid md:grid-cols-[17rem_minmax(0,1fr)]"
      aria-busy="true"
      role="status"
      aria-label="Loading your college"
    >
      <div className="hidden h-dvh flex-col gap-6 border-r border-border bg-surface px-4 py-5 md:flex">
        <div className="flex items-center gap-3">
          <Skeleton className="size-10 rounded-lg" />
          <Skeleton className="h-5 w-32" />
        </div>
        <div className="flex flex-col gap-2">
          {[0, 1, 2, 3].map((n) => (
            <Skeleton key={n} className="h-11 w-full" />
          ))}
        </div>
      </div>
      <div className="flex flex-col">
        <div className="flex h-14 items-center gap-3 border-b border-border bg-surface px-4 md:hidden">
          <Skeleton className="size-8 rounded-lg" />
          <Skeleton className="h-5 w-40" />
        </div>
        <div className="mx-auto w-full max-w-4xl px-5 py-8 md:px-8">
          <Skeleton className="h-10 w-64" />
          <Skeleton className="mt-4 h-5 w-96 max-w-full" />
          <Skeleton className="mt-10 h-40 w-full" />
        </div>
      </div>
    </div>
  );
}

function Gate({ slug, children }: { slug: string; children: React.ReactNode }) {
  const load = useCollegeLoad(slug);
  const router = useRouter();
  const pathname = usePathname();

  const redirectTo =
    load.state === "signed-out"
      ? `/signin?next=${encodeURIComponent(pathname)}`
      : load.state === "needs-join"
        ? `/c/${slug}/join`
        : load.state === "needs-approval"
          ? `/c/${slug}/pending`
          : null;

  React.useEffect(() => {
    if (redirectTo) router.replace(redirectTo);
  }, [redirectTo, router]);

  if (load.state === "loading" || redirectTo) return <ShellSkeleton />;

  if (load.state === "missing") {
    return (
      <ScreenMessage
        eyebrow="Not found"
        title="We could not find that college."
        actions={
          <Button asChild>
            <Link href="/colleges">See colleges</Link>
          </Button>
        }
      >
        Check the address, or ask your college for its StudentOS link.
      </ScreenMessage>
    );
  }

  if (load.state === "error") {
    return (
      <ScreenMessage
        eyebrow="Connection problem"
        title="We could not load your college."
        requestId={load.error?.requestId}
        actions={
          <Button onClick={load.retry}>
            <WifiOffIcon aria-hidden="true" /> Try again
          </Button>
        }
      >
        {friendlyMessage(load.error, "Something went wrong on our side.")}
      </ScreenMessage>
    );
  }

  if (load.state !== "ready") return <ShellSkeleton />;

  return (
    <CollegeContext.Provider value={load.value}>
      <CollegeShell>{children}</CollegeShell>
    </CollegeContext.Provider>
  );
}

export function CollegeGate({ slug, children }: { slug: string; children: React.ReactNode }) {
  return (
    <SessionProvider>
      <Gate slug={slug}>{children}</Gate>
    </SessionProvider>
  );
}
