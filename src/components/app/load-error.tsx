"use client";

import { RotateCcwIcon, WifiOffIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ApiError, friendlyMessage } from "@/lib/api-client";

/**
 * The error state of a data screen: plain words about what went wrong, a retry button, and the request code that
 * support can look up. Offline problems say so, so nobody blames their own input.
 */
export function LoadError({
  error,
  onRetry,
  what = "this",
}: {
  error: unknown;
  onRetry: () => void;
  what?: string;
}) {
  const api = error instanceof ApiError ? error : null;
  return (
    <div role="alert" className="flex flex-col items-start gap-4 glass-card rounded-[22px] p-6">
      <span className="inline-flex size-10 items-center justify-center rounded-full bg-danger/15 text-danger">
        <WifiOffIcon aria-hidden="true" className="size-5" />
      </span>
      <div className="flex flex-col gap-1">
        <p className="text-lg font-semibold">We could not load {what}.</p>
        <p className="text-ink-muted">{friendlyMessage(error)}</p>
      </div>
      <Button variant="outline" onClick={onRetry}>
        <RotateCcwIcon aria-hidden="true" /> Try again
      </Button>
      {api?.requestId ? (
        <p className="text-sm text-ink-muted">
          Code for support: <code className="font-mono text-[12px] text-ink">{api.requestId}</code>
        </p>
      ) : null}
    </div>
  );
}
