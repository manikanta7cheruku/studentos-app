import { Suspense } from "react";
import { SessionProvider } from "@/features/session/session-provider";

// The pages before a person is inside a college: the college front door, join, waiting. They know who is signed in
// (SessionProvider) but do not need to be a member.
export const instant = false;

export default function CollegePublicLayout({ children }: { children: React.ReactNode }) {
  return (
    <Suspense fallback={<div className="min-h-dvh bg-bg" aria-busy="true" />}>
      <SessionProvider>{children}</SessionProvider>
    </Suspense>
  );
}
