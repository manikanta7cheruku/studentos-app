"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowRightIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { accentVars } from "@/lib/color";
import { homePath } from "@/lib/home-path";
import { useSession } from "@/features/session/session-provider";
import { AuthFrame } from "./auth-frame";
import { PublicStates } from "./public-states";
import { useJoinContext } from "./use-join-context";

/** The front door of one college: who it is, what is inside, and the one next step for this visitor. */
export function CollegeLanding({ slug }: { slug: string }) {
  const router = useRouter();
  const session = useSession();
  const context = useJoinContext(slug, false);

  const status = context.state === "ready" ? context.entry?.membership.status : undefined;
  const target =
    status === "active"
      ? homePath(slug)
      : status === "pending" || status === "suspended"
        ? `/c/${slug}/pending`
        : null;

  React.useEffect(() => {
    if (target) router.replace(target);
  }, [target, router]);

  if (context.state !== "ready" || target) {
    return <PublicStates context={context.state === "ready" ? { state: "loading" } : context} />;
  }

  const { college } = context;
  const place = [college.city, college.state].filter(Boolean).join(", ");
  const signedIn = session.status === "signed-in";
  const tabs = [
    college.modules.campus ? "Campus news and announcements" : null,
    college.modules.collaborate ? "Teams for projects and hackathons" : null,
    college.modules.career ? "A private place to track internships" : null,
  ].filter((item): item is string => Boolean(item));

  return (
    <AuthFrame
      eyebrow={place || "College space"}
      title={college.name}
      intro="A private space for the students of this college. Only verified members can see it."
      college={{
        name: college.name,
        shortName: college.short_name,
        accentVars: accentVars(college.accent_hex),
      }}
    >
      <div className="flex flex-col gap-8">
        {tabs.length ? (
          <section aria-labelledby="inside">
            <h2
              id="inside"
              className="text-[12px] font-semibold uppercase tracking-[0.08em] text-ink-muted"
            >
              Inside
            </h2>
            <ul className="mt-3 divide-y divide-border border-y border-border">
              {tabs.map((tab) => (
                <li key={tab} className="py-3 text-[15px] text-ink">
                  {tab}
                </li>
              ))}
            </ul>
          </section>
        ) : null}
        <div className="flex flex-wrap items-center gap-3">
          {signedIn ? (
            <Button asChild size="lg">
              <Link href={`/c/${slug}/join`}>
                Join {college.short_name || college.name} <ArrowRightIcon aria-hidden="true" />
              </Link>
            </Button>
          ) : (
            <>
              <Button asChild size="lg">
                <Link href={`/signin?next=${encodeURIComponent(`/c/${slug}/join`)}`}>
                  Sign in to join <ArrowRightIcon aria-hidden="true" />
                </Link>
              </Button>
            </>
          )}
        </div>
      </div>
    </AuthFrame>
  );
}
