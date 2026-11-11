import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRightIcon, GraduationCapIcon, LightbulbIcon, UsersIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Wordmark } from "@/features/auth/auth-frame";
import { WelcomeHero } from "@/features/auth/welcome-hero";

export const metadata: Metadata = {
  title: "StudentOS | Plans, teams and ideas for students",
  description:
    "Find a team for Saturday, join a hackathon, share an idea. StudentOS is where students make plans together.",
};

const FEATURES = [
  {
    icon: <UsersIcon aria-hidden="true" />,
    title: "Make a plan",
    text: "A turf match, badminton doubles, a late-night study group. Post it and see who joins.",
  },
  {
    icon: <LightbulbIcon aria-hidden="true" />,
    title: "Share an idea",
    text: "Say what you would build or change. The best ideas rise and people join the talk.",
  },
  {
    icon: <GraduationCapIcon aria-hidden="true" />,
    title: "Your college, private",
    text: "Join your college space with your college email, or stay on Global and meet everyone.",
  },
];

/** The first page a visitor sees: what StudentOS is, one way in, and a quiet way in for colleges. */
export default function Home() {
  return (
    <div className="relative min-h-dvh overflow-hidden">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-[40rem] bg-[radial-gradient(60%_60%_at_50%_0%,rgba(111,102,214,0.3),transparent_70%)]"
      />
      <a
        href="#main-content"
        className="sr-only z-50 rounded-xl bg-surface px-4 py-3 font-medium text-ink focus:not-sr-only focus:fixed focus:left-3 focus:top-3 focus:ring-2 focus:ring-ring"
      >
        Skip to content
      </a>
      <header>
        <div className="mx-auto flex h-16 max-w-5xl items-center justify-between px-6">
          <Link
            href="/"
            className="rounded-lg outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <Wordmark />
          </Link>
          <Button asChild variant="secondary" size="sm">
            <Link href="/signin">Sign in</Link>
          </Button>
        </div>
      </header>

      <main id="main-content" className="page-enter mx-auto max-w-5xl px-6 pb-16">
        <section className="grid items-center gap-8 pt-6 md:grid-cols-[1.1fr_1fr] md:gap-12 md:pt-16">
          <div className="max-w-xl">
            <p className="text-[11.5px] font-semibold uppercase tracking-[0.1em] text-ink-muted">
              For students
            </p>
            <h1 className="mt-3 text-balance text-[2.5rem] font-extrabold leading-[1.02] tracking-tight sm:text-[3.4rem]">
              Your campus, <span className="text-brand">in your pocket.</span>
            </h1>
            <p className="mt-4 max-w-md text-pretty text-[16px] leading-relaxed text-ink-muted">
              Find a team for Saturday, join a hackathon, share an idea. Real students, real plans.
            </p>
            <div className="mt-7 flex flex-wrap items-center gap-3">
              <Button asChild size="lg" className="h-12 px-7 text-[15px]">
                <Link href="/signin">
                  Get started <ArrowRightIcon aria-hidden="true" />
                </Link>
              </Button>
              <span className="text-[13px] text-ink-muted">Free for students.</span>
            </div>
          </div>
          <WelcomeHero />
        </section>

        <section aria-labelledby="what" className="mt-16 md:mt-24">
          <h2 id="what" className="sr-only">
            What you can do
          </h2>
          <ul className="grid gap-4 md:grid-cols-3">
            {FEATURES.map((item) => (
              <li
                key={item.title}
                className="lift rounded-[22px] border border-white/[0.08] bg-surface p-5"
              >
                <span className="bg-brand inline-flex size-10 items-center justify-center rounded-xl text-white [&_svg]:size-5">
                  {item.icon}
                </span>
                <h3 className="mt-4 text-[1.1rem] font-bold">{item.title}</h3>
                <p className="mt-1.5 text-[14.5px] leading-relaxed text-ink-muted">{item.text}</p>
              </li>
            ))}
          </ul>
        </section>

        <section
          aria-labelledby="colleges"
          className="glass mt-10 flex flex-col items-start justify-between gap-4 rounded-[24px] p-6 sm:flex-row sm:items-center"
        >
          <div>
            <h2 id="colleges" className="font-heading text-[1.3rem] font-extrabold">
              Running a college?
            </h2>
            <p className="mt-1 max-w-md text-[14.5px] text-ink-muted">
              Create a private space for your students and manage it yourself.
            </p>
          </div>
          <Button asChild variant="outline" size="lg">
            <Link href="/setup">Set up your campus</Link>
          </Button>
        </section>
      </main>

      <footer className="border-t border-white/[0.07]">
        <nav
          aria-label="Footer"
          className="mx-auto flex max-w-5xl flex-wrap gap-x-6 gap-y-2 px-6 py-6 text-[13px] text-ink-muted"
        >
          <Link href="/privacy" className="hover:text-ink">
            Privacy
          </Link>
          <Link href="/terms" className="hover:text-ink">
            Terms
          </Link>
          <Link href="/safety" className="hover:text-ink">
            Safety
          </Link>
          <Link href="/contact" className="hover:text-ink">
            Contact
          </Link>
        </nav>
      </footer>
    </div>
  );
}
