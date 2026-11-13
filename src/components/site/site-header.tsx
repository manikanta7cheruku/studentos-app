import Link from "next/link";
import { Button } from "@/components/ui/button";
import { InstallApp } from "./install-app";
import { Wordmark } from "@/features/auth/auth-frame";

/** The top bar of the public pages (landing and the written pages). */
export function SiteHeader({ landing = false }: { landing?: boolean }) {
  const prefix = landing ? "" : "/";
  return (
    <header className="sticky top-0 z-40 border-b border-white/[0.06] bg-[rgba(11,11,16,0.7)] backdrop-blur-xl">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-4 px-5">
        <Link
          href="/"
          className="rounded-lg outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <Wordmark />
        </Link>
        <nav
          aria-label="Main"
          className="hidden items-center gap-8 text-[14px] text-ink-muted lg:flex"
        >
          <a href={`${prefix}#features`} className="transition-colors hover:text-ink">
            Features
          </a>
          <a href={`${prefix}#privacy`} className="transition-colors hover:text-ink">
            Privacy
          </a>
          <a href={`${prefix}#how`} className="transition-colors hover:text-ink">
            How it works
          </a>
          <a href={`${prefix}#faq`} className="transition-colors hover:text-ink">
            FAQ
          </a>
        </nav>
        <div className="flex items-center gap-2">
          <InstallApp size="sm" label="Add to phone" className="hidden sm:inline-flex" />
          <Button asChild size="sm">
            <Link href="/signin">Sign in</Link>
          </Button>
        </div>
      </div>
    </header>
  );
}
