"use client";

import Link from "next/link";
import { WifiOffIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { ScreenMessage } from "@/components/app/screen-message";
import { friendlyMessage, type ApiError } from "@/lib/api-client";
import { AuthFrame } from "./auth-frame";
import type { JoinContext } from "./use-join-context";

/** The loading, missing and error versions of the pages before a college. Returns null when the screen can render. */
export function PublicStates({ context }: { context: JoinContext }) {
  if (context.state === "loading") {
    return (
      <AuthFrame title="One moment" intro="Loading your college.">
        <div aria-busy="true" className="flex flex-col gap-4">
          <Skeleton className="h-11 w-full" />
          <Skeleton className="h-11 w-full" />
          <Skeleton className="h-12 w-40" />
        </div>
      </AuthFrame>
    );
  }
  if (context.state === "missing") {
    return (
      <ScreenMessage
        eyebrow="Not found"
        title="We could not find that college."
        actions={
          <Button asChild>
            <Link href="/find">Find your college</Link>
          </Button>
        }
      >
        Check the address, or ask your college for its StudentOS link.
      </ScreenMessage>
    );
  }
  if (context.state === "error") {
    const error: ApiError | null = context.error;
    return (
      <ScreenMessage
        eyebrow="Connection problem"
        title="We could not load this page."
        requestId={error?.requestId}
        actions={
          <Button onClick={context.retry}>
            <WifiOffIcon aria-hidden="true" /> Try again
          </Button>
        }
      >
        {friendlyMessage(error, "Something went wrong on our side.")}
      </ScreenMessage>
    );
  }
  return null;
}
