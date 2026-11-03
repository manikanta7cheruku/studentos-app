"use client";

import * as React from "react";

export function MSWProvider({ children }: { children: React.ReactNode }) {
  const [ready, setReady] = React.useState(() => {
    // If not in development or mocking is not enabled, mark ready immediately
    if (
      process.env.NODE_ENV !== "development" ||
      process.env.NEXT_PUBLIC_API_MOCKING !== "enabled"
    ) {
      return true;
    }
    return false;
  });

  React.useEffect(() => {
    async function startWorker() {
      if (
        process.env.NODE_ENV === "development" &&
        process.env.NEXT_PUBLIC_API_MOCKING === "enabled" &&
        typeof window !== "undefined"
      ) {
        const { worker } = await import("./browser");
        await worker.start({
          onUnhandledFrame: "bypass",
        });
      }
      setReady(true);
    }

    if (!ready) {
      void startWorker();
    }
  }, [ready]);

  if (!ready) {
    return (
      <div className="flex min-h-screen items-center justify-center text-sm text-ink-muted">
        Starting mock API environment...
      </div>
    );
  }

  return <>{children}</>;
}
