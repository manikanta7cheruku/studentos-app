"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ScreenMessage } from "@/components/app/screen-message";

// The last safety net: a screen crashed. Say so in plain words, offer a retry, and never show a stack trace.
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <ScreenMessage
      eyebrow="Something went wrong"
      title="This screen could not be shown."
      requestId={error.digest}
      actions={
        <>
          <Button onClick={reset}>Try again</Button>
          <Button variant="outline" asChild>
            <Link href="/">Go to the home page</Link>
          </Button>
        </>
      }
    >
      It is not your fault, and nothing you typed was lost on our side. Try again in a moment.
    </ScreenMessage>
  );
}
