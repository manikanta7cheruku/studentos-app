"use client";

import * as React from "react";
import { usePathname, useRouter } from "next/navigation";
import { Spinner } from "@/components/app/spinner";
import { homeFor, lastCollege, SessionProvider, useSession } from "./session-provider";

// The college free addresses that older links and bookmarks use (/me, /me/edit, /me/skills, /me/notifications). The
// college is not in the address, so this finds it: the one you used last, else your first one, else "find your college".

function Redirect({ suffix }: { suffix: string }) {
  const session = useSession();
  const router = useRouter();
  const pathname = usePathname();

  React.useEffect(() => {
    if (session.status === "signed-out") {
      router.replace(`/signin?next=${encodeURIComponent(pathname)}`);
    } else if (session.status === "signed-in") {
      const remembered = lastCollege();
      const known = session.colleges.find((item) => item.college.slug === remembered);
      const entry = known ?? session.colleges.find((item) => item.membership.status === "active");
      router.replace(entry ? `/c/${entry.college.slug}${suffix}` : homeFor(session.colleges));
    }
  }, [session.status, session.colleges, router, pathname, suffix]);

  return (
    <div className="flex min-h-dvh items-center justify-center bg-bg text-ink-muted" role="status">
      <Spinner className="mr-3" /> Opening your college
    </div>
  );
}

export function CollegeRedirect({ suffix }: { suffix: string }) {
  return (
    <SessionProvider>
      <Redirect suffix={suffix} />
    </SessionProvider>
  );
}
