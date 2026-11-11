import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { Suspense } from "react";
import { LockIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/app/spinner";
import { Wordmark } from "@/features/auth/auth-frame";
import { OwnerNav } from "@/features/owner/owner-nav";
import { PinForm } from "@/features/owner/pin-form";
import { ownerState } from "@/modules/owner/owner-access";
import { lockAction } from "./actions";

export const metadata: Metadata = {
  title: "Owner | StudentOS",
  // The dashboard is not linked from anywhere and must not show up in search either.
  robots: { index: false, follow: false },
};

async function Gate({ children }: { children: React.ReactNode }) {
  const state = await ownerState();
  if (state.state === "signed-out") redirect("/signin?next=/owner");
  // Anyone who is not on the owner list gets the same page as for an address that does not exist.
  if (state.state === "not-owner") notFound();
  if (state.state === "locked") return <PinForm email={state.user.email ?? "your account"} />;

  return (
    <div className="min-h-dvh md:grid md:grid-cols-[14.5rem_minmax(0,1fr)]">
      <aside className="flex flex-col gap-4 border-b border-white/[0.07] p-4 md:sticky md:top-0 md:h-dvh md:border-b-0 md:border-r md:p-5">
        <div className="flex items-center justify-between gap-3 md:flex-col md:items-start">
          <Wordmark />
          <span className="rounded-full border border-white/10 bg-white/[0.05] px-2.5 py-0.5 text-[11.5px] font-semibold text-ink-muted">
            Owner
          </span>
        </div>
        <OwnerNav />
        <div className="mt-auto hidden flex-col gap-2 md:flex">
          <p className="truncate text-[12.5px] text-ink-muted">{state.user.email}</p>
          <form action={lockAction}>
            <Button type="submit" variant="secondary" size="sm" className="w-full">
              <LockIcon aria-hidden="true" /> Lock now
            </Button>
          </form>
        </div>
      </aside>
      <main id="main" className="min-w-0 px-5 py-6 md:px-9 md:py-9">
        <div className="mx-auto max-w-6xl">{children}</div>
        <form action={lockAction} className="mt-8 md:hidden">
          <Button type="submit" variant="secondary" size="sm">
            <LockIcon aria-hidden="true" /> Lock now
          </Button>
        </form>
      </main>
    </div>
  );
}

export default function OwnerLayout({ children }: { children: React.ReactNode }) {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-dvh items-center justify-center text-ink-muted" role="status">
          <Spinner className="mr-3" /> Opening
        </div>
      }
    >
      <Gate>{children}</Gate>
    </Suspense>
  );
}
