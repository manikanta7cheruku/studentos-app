"use client";

import * as React from "react";

let workerPromise: Promise<void> | null = null;

async function startWorkerSingleton(): Promise<void> {
  if (workerPromise) {
    return workerPromise;
  }

  workerPromise = (async () => {
    if (
      process.env.NODE_ENV === "development" &&
      process.env.NEXT_PUBLIC_API_MOCKING === "enabled" &&
      typeof window !== "undefined"
    ) {
      const { worker } = await import("./browser");
      // Check if network is already enabled (readyState 1 = ENABLED)
      if (Number(worker.readyState) !== 1) {
        try {
          await worker.start({
            onUnhandledFrame: "bypass",
          });
        } catch (err: unknown) {
          const msg = err instanceof Error ? err.message : String(err);
          // If already enabled by a concurrent call or hot-reload, ignore gracefully
          if (!msg.includes("already enabled")) {
            throw err;
          }
        }
      }
    }
  })();

  return workerPromise;
}

export function MSWProvider({ children }: { children: React.ReactNode }) {
  const [ready, setReady] = React.useState(() => {
    if (
      process.env.NODE_ENV !== "development" ||
      process.env.NEXT_PUBLIC_API_MOCKING !== "enabled"
    ) {
      return true;
    }
    return false;
  });

  React.useEffect(() => {
    let ignore = false;
    startWorkerSingleton()
      .then(() => {
        if (!ignore) {
          setReady(true);
        }
      })
      .catch(() => {
        if (!ignore) {
          setReady(true);
        }
      });

    return () => {
      ignore = true;
    };
  }, []);

  if (!ready) {
    return (
      <div className="flex min-h-screen items-center justify-center text-sm text-ink-muted">
        Starting mock API environment...
      </div>
    );
  }

  return <>{children}</>;
}
