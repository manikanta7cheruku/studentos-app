"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ClockIcon, RefreshCwIcon } from "lucide-react";
import { Banner } from "@/components/ui/banner";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/app/spinner";
import { api } from "@/lib/api/endpoints";
import { accentVars } from "@/lib/color";
import { homePath } from "@/lib/home-path";
import { useLoad } from "@/lib/use-load";
import { useSession } from "@/features/session/session-provider";
import { AuthFrame } from "./auth-frame";
import { PublicStates } from "./public-states";
import { useJoinContext } from "./use-join-context";

const POLL_MS = 30_000;

/** Where a person waits after asking to join, or learns it was not accepted. It checks again every half minute. */
export function PendingScreen({ slug }: { slug: string }) {
  const router = useRouter();
  const session = useSession();
  const context = useJoinContext(slug);
  const detail = useLoad(() => api.colleges.membership(slug), [slug]);
  const [checking, setChecking] = React.useState(false);

  const status = context.state === "ready" ? context.entry?.membership.status : undefined;
  const reload = detail.reload;

  React.useEffect(() => {
    if (status !== "pending") return;
    const timer = window.setInterval(() => {
      void session.refresh();
      reload();
    }, POLL_MS);
    return () => window.clearInterval(timer);
  }, [status, session, reload]);

  React.useEffect(() => {
    if (context.state !== "ready") return;
    if (status === "active") router.replace(homePath(slug));
    else if (!status || status === "left") router.replace(`/c/${slug}/join`);
  }, [context.state, status, slug, router]);

  if (context.state !== "ready") return <PublicStates context={context} />;
  if (!status || status === "active" || status === "left") {
    return <PublicStates context={{ state: "loading" }} />;
  }

  const { college } = context;
  const reason = detail.status === "ready" ? detail.data.membership?.status_reason : null;
  const frame = {
    name: college.name,
    shortName: college.short_name,
    accentVars: accentVars(college.accent_hex),
  };

  async function checkNow() {
    setChecking(true);
    await session.refresh();
    reload();
    setChecking(false);
  }

  if (status === "pending") {
    return (
      <AuthFrame
        eyebrow="Request sent"
        title="Waiting for your college."
        intro={`An admin at ${college.name} is checking your request. You do not need to do anything else. This page updates by itself, and you can close it and come back later.`}
        college={frame}
      >
        <div className="flex flex-col gap-5">
          <Banner variant="info" title="Status: waiting">
            <p className="flex items-center gap-2">
              <ClockIcon aria-hidden="true" className="size-4" />
              We tell you here as soon as there is an answer.
            </p>
          </Banner>
          <div>
            <Button variant="outline" size="lg" onClick={() => void checkNow()} disabled={checking}>
              {checking ? <Spinner /> : <RefreshCwIcon aria-hidden="true" />} Check now
            </Button>
          </div>
        </div>
      </AuthFrame>
    );
  }

  const suspended = status === "suspended";
  return (
    <AuthFrame
      eyebrow={suspended ? "Access paused" : "Not accepted"}
      title={suspended ? "Your access is paused." : "Your request was not accepted."}
      intro={
        suspended
          ? `An admin at ${college.name} paused your access. Your data is kept.`
          : `${college.name} did not accept this request. You can send a new one with the right details.`
      }
      college={frame}
    >
      <div className="flex flex-col gap-5">
        {reason ? (
          <Banner variant="warning" title="Reason from your college">
            <p>{reason}</p>
          </Banner>
        ) : null}
        <p className="text-[15px] text-ink-muted">
          {suspended
            ? "Contact your college admin if you think this is a mistake."
            : "If you think this is a mistake, contact your college admin."}
        </p>
        {!suspended ? (
          <div>
            <Button asChild size="lg">
              <Link href={`/c/${slug}/join`}>Try joining again</Link>
            </Button>
          </div>
        ) : null}
      </div>
    </AuthFrame>
  );
}
