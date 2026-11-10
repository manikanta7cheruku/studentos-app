"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Spinner } from "@/components/app/spinner";
import { homeFor, SessionProvider, useSession } from "./session-provider";

// Where a person lands right after signing in without a page to return to (for example after Continue with Google):
// signed out goes to sign in, otherwise to their college, to Global, or to "find your college".

function Redirect() {
  const session = useSession();
  const router = useRouter();

  React.useEffect(() => {
    if (session.status === "signed-out") router.replace("/signin");
    else if (session.status === "signed-in") router.replace(homeFor(session.colleges));
  }, [session.status, session.colleges, router]);

  return (
    <div className="flex min-h-dvh items-center justify-center bg-bg text-ink-muted" role="status">
      <Spinner className="mr-3" /> Opening StudentOS
    </div>
  );
}

export function StartRedirect() {
  return (
    <SessionProvider>
      <Redirect />
    </SessionProvider>
  );
}
