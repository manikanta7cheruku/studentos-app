import Link from "next/link";
import { ClockIcon } from "lucide-react";
import { SiteHeader } from "@/components/site/site-header";
import { SiteFooter } from "@/components/site/site-footer";
import { legalMetadata } from "@/components/site/legal-page";

export const instant = false;

export const metadata = legalMetadata("Contact", "How to reach StudentOS.");

export default function Page() {
  return (
    <div className="min-h-dvh">
      <SiteHeader />
      <main id="main" className="mx-auto max-w-3xl px-5 pb-24 pt-16">
        <h1 className="font-heading text-[2.2rem] font-extrabold tracking-tight sm:text-[2.8rem]">
          Contact
        </h1>
        <div className="glass-card mt-8 flex items-start gap-4 rounded-[24px] p-6">
          <span className="bg-brand inline-flex size-11 shrink-0 items-center justify-center rounded-2xl text-white">
            <ClockIcon aria-hidden="true" className="size-5" />
          </span>
          <div>
            <h2 className="text-[1.1rem] font-bold">Updating soon</h2>
            <p className="mt-1 text-[15px] leading-relaxed text-ink-muted">
              We are setting up ways to reach us. Until then, signed-in members can send feedback or
              report a problem from inside the app.
            </p>
            <Link
              href="/"
              className="mt-4 inline-block text-[14px] font-medium text-ink underline underline-offset-4"
            >
              Back to home
            </Link>
          </div>
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}
