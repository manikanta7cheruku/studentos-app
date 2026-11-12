import { Suspense } from "react";
import { SessionProvider } from "@/features/session/session-provider";

// The tour knows who is signed in (SessionProvider), like the pages before a person is inside a college.
export const instant = false;

export default function WelcomeLayout({ children }: { children: React.ReactNode }) {
  return (
    <Suspense fallback={<div className="min-h-dvh bg-bg" aria-busy="true" />}>
      <SessionProvider>{children}</SessionProvider>
    </Suspense>
  );
}
