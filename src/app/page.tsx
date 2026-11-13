import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRightIcon, ArrowUpRightIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SiteHeader } from "@/components/site/site-header";
import { SiteFooter } from "@/components/site/site-footer";
import { InstallApp } from "@/components/site/install-app";

export const instant = false;

export const metadata: Metadata = {
  title: "StudentOS | Plans, debates and people from your campus",
  description:
    "Make a plan, join a debate, share a buzz and meet students. StudentOS is where students do things together.",
};

const FEATURES = [
  {
    title: "Plans",
    text: "A turf match, a study group, a trip. Post it, see who joins, and make it happen.",
  },
  {
    title: "Buzz",
    text: "Say what is on your mind as easily as sending a message. The best buzz rise to the top.",
  },
  {
    title: "Debates",
    text: "Pick a side, argue it well and vote. Speak freely, with an anonymous option when you want it.",
  },
  {
    title: "Network",
    text: "Find students who share your interests, send a request and build your circle.",
  },
  {
    title: "Private messages",
    text: "Talk one to one with people you have connected with. Messages disappear after they are read.",
  },
  {
    title: "Events and turf",
    text: "See what is on this week and book a game with the people around you.",
  },
];

const AGENDA = [
  { when: "Tonight", what: "5v5 football at the turf", kind: "Plan", note: "7 going" },
  { when: "Tonight", what: "Open mic night", kind: "Event", note: "RSVP open" },
  { when: "Live", what: "Should attendance be optional?", kind: "Debate", note: "128 votes" },
  { when: "Saturday", what: "48 hour hackathon, need a designer", kind: "Plan", note: "3 spots" },
];

const PRIVACY = [
  {
    title: "Anonymous debates",
    text: "Take part without your name showing to other students.",
  },
  {
    title: "Messages that disappear",
    text: "Private messages are removed after they have been read.",
  },
  {
    title: "Control and reporting",
    text: "Block people, report anything and choose what your profile shows.",
  },
];

const STEPS = [
  {
    title: "Sign in",
    text: "Continue with Google or get a code by email. There is no password to remember.",
  },
  {
    title: "Tell us a little",
    text: "Your name, your college and a few interests, so what you see is relevant.",
  },
  { title: "Start doing things", text: "Join a plan, take a side in a debate, or post your own." },
];

const SOON = [
  { title: "Your college space", text: "A private space that stays inside your campus." },
  { title: "Marketplace", text: "Sell, rent and lend what you no longer need." },
  { title: "Lost and found", text: "Get lost things back to their owners, fast." },
];

const FAQ = [
  {
    q: "Is StudentOS free?",
    a: "Yes. StudentOS is free for students. If that ever changes, you will be told well before.",
  },
  {
    q: "Do I need a college email?",
    a: "No. Sign in with Google or an email code and start on Global, which is open to every student.",
  },
  {
    q: "Are my messages private?",
    a: "Messages are only visible to you and the person you write to, and they disappear after being read. They are not end-to-end encrypted, which the Privacy Notice explains in full.",
  },
  {
    q: "Can I post without my name?",
    a: "In debates you can take part anonymously. Other students will not see your name, but the community rules apply to everyone.",
  },
  {
    q: "When does my college space open?",
    a: "We are teaming up with colleges now and opening campus by campus. You can start on Global today.",
  },
  {
    q: "Is there a mobile app?",
    a: "Yes. Tap Download the app to add StudentOS to your home screen on iPhone or Android. It opens full screen with its own icon, and you can turn on alerts. No app store needed.",
  },
];

function Label({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-[12px] font-semibold uppercase tracking-[0.14em] text-ink-muted">
      {children}
    </p>
  );
}

/** The public front page: what StudentOS is, what is in it, how it treats privacy, and the way in. */
export default function Home() {
  return (
    <div className="relative min-h-dvh overflow-x-clip">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-[40rem] bg-[radial-gradient(70%_60%_at_20%_0%,rgba(111,102,214,0.16),transparent_70%)]"
      />
      <a
        href="#main-content"
        className="sr-only z-50 rounded-xl bg-surface px-4 py-3 font-medium text-ink focus:not-sr-only focus:fixed focus:left-3 focus:top-3 focus:ring-2 focus:ring-ring"
      >
        Skip to content
      </a>
      <SiteHeader landing />

      <main id="main-content">
        {/* Hero */}
        <section className="mx-auto grid max-w-6xl gap-14 px-5 pb-24 pt-16 md:pt-28 lg:grid-cols-[1.25fr_1fr] lg:items-end">
          <div className="page-enter">
            <Label>For students</Label>
            <h1 className="mt-5 text-balance font-heading text-[2.8rem] font-extrabold leading-[1] tracking-[-0.035em] sm:text-[4.4rem] lg:text-[5.2rem]">
              Everything on campus,
              <br />
              <span className="text-ink-muted">in one place.</span>
            </h1>
            <p className="mt-7 max-w-lg text-pretty text-[18px] leading-relaxed text-ink-muted">
              Make a plan, join a debate, share a buzz and meet students who like what you like.
              Free for students, with no password to remember.
            </p>
            <div className="mt-9 flex flex-wrap items-center gap-4">
              <Button asChild size="lg" className="h-14 rounded-xl px-8 text-[16px]">
                <Link href="/signin">
                  Get started <ArrowRightIcon aria-hidden="true" />
                </Link>
              </Button>
              <InstallApp />
            </div>
          </div>

          <div
            aria-hidden="true"
            className="page-enter border-t border-white/15 lg:border-l lg:border-t-0 lg:pl-10"
          >
            <div className="flex items-center justify-between pt-5 lg:pt-0">
              <Label>Today on campus</Label>
              <span className="inline-flex items-center gap-2 text-[12px] text-ink-muted">
                <span className="size-1.5 rounded-full bg-[#4ade80] motion-safe:animate-pulse" />{" "}
                Sample
              </span>
            </div>
            <ul className="mt-5 divide-y divide-white/10">
              {AGENDA.map((row) => (
                <li
                  key={row.what}
                  className="grid grid-cols-[5.2rem_1fr_auto] items-baseline gap-4 py-4"
                >
                  <span className="text-[13px] text-ink-muted">{row.when}</span>
                  <span>
                    <span className="block text-[15.5px] font-semibold leading-snug">
                      {row.what}
                    </span>
                    <span className="mt-0.5 block text-[12.5px] text-ink-muted">{row.kind}</span>
                  </span>
                  <span className="text-[13px] text-ink-muted">{row.note}</span>
                </li>
              ))}
            </ul>
          </div>
        </section>

        {/* Features */}
        <section
          id="features"
          aria-labelledby="features-h"
          className="mx-auto max-w-6xl scroll-mt-20 px-5 py-20"
        >
          <div className="reveal grid gap-10 lg:grid-cols-[1fr_1.7fr]">
            <div>
              <Label>What is inside</Label>
              <h2
                id="features-h"
                className="mt-4 text-balance font-heading text-[2.2rem] font-extrabold leading-[1.05] tracking-[-0.03em] sm:text-[3rem]"
              >
                Student life, organised.
              </h2>
            </div>
            <ol className="border-t border-white/15">
              {FEATURES.map((item, index) => (
                <li
                  key={item.title}
                  className="group grid grid-cols-[3rem_1fr] gap-4 border-b border-white/10 py-7 transition-colors hover:bg-white/[0.025] sm:grid-cols-[4rem_1fr_1.3fr] sm:gap-6"
                >
                  <span className="pt-1 text-[13px] tabular-nums text-ink-muted">
                    {String(index + 1).padStart(2, "0")}
                  </span>
                  <h3 className="text-[1.45rem] font-bold leading-tight tracking-tight">
                    {item.title}
                  </h3>
                  <p className="col-start-2 text-[15.5px] leading-relaxed text-ink-muted sm:col-start-auto">
                    {item.text}
                  </p>
                </li>
              ))}
            </ol>
          </div>
        </section>

        {/* Privacy and anonymous debates */}
        <section
          id="privacy"
          aria-labelledby="privacy-h"
          className="mx-auto max-w-6xl scroll-mt-20 px-5 py-20"
        >
          <div className="reveal border-t border-white/15 pt-14">
            <Label>Your voice, your terms</Label>
            <h2
              id="privacy-h"
              className="mt-4 max-w-3xl text-balance font-heading text-[2.2rem] font-extrabold leading-[1.05] tracking-[-0.03em] sm:text-[3.4rem]"
            >
              Say what you really think.
            </h2>
            <p className="mt-6 max-w-xl text-[17px] leading-relaxed text-ink-muted">
              Some opinions are easier to share when your name is not on them. Join a debate
              anonymously and let the argument stand on its own. Every member follows the same
              community rules, so it stays respectful.
            </p>
            <ul className="mt-12 grid gap-px overflow-hidden rounded-2xl border border-white/10 bg-white/10 md:grid-cols-3">
              {PRIVACY.map((point) => (
                <li key={point.title} className="bg-[#0e0e15] p-7">
                  <h3 className="text-[1.1rem] font-bold tracking-tight">{point.title}</h3>
                  <p className="mt-2 text-[15px] leading-relaxed text-ink-muted">{point.text}</p>
                </li>
              ))}
            </ul>
            <div className="mt-8 flex flex-wrap gap-x-7 gap-y-2 text-[14px]">
              <Link
                href="/guidelines"
                className="inline-flex items-center gap-1 underline underline-offset-4 hover:text-ink"
              >
                Community guidelines <ArrowUpRightIcon aria-hidden="true" className="size-4" />
              </Link>
              <Link
                href="/privacy"
                className="inline-flex items-center gap-1 underline underline-offset-4 hover:text-ink"
              >
                Privacy Notice <ArrowUpRightIcon aria-hidden="true" className="size-4" />
              </Link>
            </div>
          </div>
        </section>

        {/* How it works */}
        <section
          id="how"
          aria-labelledby="how-h"
          className="mx-auto max-w-6xl scroll-mt-20 px-5 py-20"
        >
          <div className="reveal border-t border-white/15 pt-14">
            <Label>How it works</Label>
            <h2
              id="how-h"
              className="mt-4 font-heading text-[2.2rem] font-extrabold leading-[1.05] tracking-[-0.03em] sm:text-[3rem]"
            >
              Up and running in a minute.
            </h2>
            <ol className="mt-12 grid gap-10 md:grid-cols-3">
              {STEPS.map((step, index) => (
                <li key={step.title} className="border-t border-white/25 pt-5">
                  <span className="text-[13px] tabular-nums text-ink-muted">
                    {String(index + 1).padStart(2, "0")}
                  </span>
                  <h3 className="mt-3 text-[1.3rem] font-bold tracking-tight">{step.title}</h3>
                  <p className="mt-2 text-[15.5px] leading-relaxed text-ink-muted">{step.text}</p>
                </li>
              ))}
            </ol>
          </div>
        </section>

        {/* Coming soon */}
        <section
          id="coming"
          aria-labelledby="coming-h"
          className="mx-auto max-w-6xl scroll-mt-20 px-5 py-20"
        >
          <div className="reveal grid gap-10 border-t border-white/15 pt-14 lg:grid-cols-[1fr_1.7fr]">
            <div>
              <Label>Coming soon</Label>
              <h2
                id="coming-h"
                className="mt-4 text-balance font-heading text-[2.2rem] font-extrabold leading-[1.05] tracking-[-0.03em] sm:text-[3rem]"
              >
                More for your campus is on its way.
              </h2>
            </div>
            <ul className="divide-y divide-white/10 border-y border-white/10">
              {SOON.map((item) => (
                <li key={item.title} className="flex items-center justify-between gap-6 py-6">
                  <div>
                    <h3 className="text-[1.2rem] font-bold tracking-tight">{item.title}</h3>
                    <p className="mt-1 text-[15px] text-ink-muted">{item.text}</p>
                  </div>
                  <span className="shrink-0 rounded-full border border-white/15 px-3 py-1 text-[11px] font-semibold uppercase tracking-wider text-[#f0c36a]">
                    Soon
                  </span>
                </li>
              ))}
            </ul>
          </div>
        </section>

        {/* The app */}
        <section
          id="app"
          aria-labelledby="app-h"
          className="mx-auto max-w-6xl scroll-mt-20 px-5 py-20"
        >
          <div className="reveal rounded-[28px] border border-white/10 bg-white/[0.03] px-7 py-14 sm:px-14">
            <Label>Mobile app</Label>
            <h2
              id="app-h"
              className="mt-4 max-w-2xl text-balance font-heading text-[2.2rem] font-extrabold leading-[1.05] tracking-[-0.03em] sm:text-[3rem]"
            >
              StudentOS in your pocket.
            </h2>
            <p className="mt-5 max-w-lg text-[17px] leading-relaxed text-ink-muted">
              The Android and iOS apps are coming soon. Until then, open StudentOS in your phone
              browser.
            </p>
            <InstallApp className="mt-8" variant="default" />
          </div>
        </section>

        {/* FAQ */}
        <section
          id="faq"
          aria-labelledby="faq-h"
          className="mx-auto max-w-6xl scroll-mt-20 px-5 py-20"
        >
          <div className="reveal grid gap-10 border-t border-white/15 pt-14 lg:grid-cols-[1fr_1.7fr]">
            <div>
              <Label>FAQ</Label>
              <h2
                id="faq-h"
                className="mt-4 font-heading text-[2.2rem] font-extrabold leading-[1.05] tracking-[-0.03em] sm:text-[3rem]"
              >
                Questions.
              </h2>
            </div>
            <div className="border-t border-white/10">
              {FAQ.map((item) => (
                <details key={item.q} className="group border-b border-white/10 py-5">
                  <summary className="flex cursor-pointer list-none items-center justify-between gap-4 text-[1.1rem] font-semibold tracking-tight">
                    {item.q}
                    <span
                      aria-hidden="true"
                      className="text-[22px] font-light text-ink-muted transition-transform duration-200 group-open:rotate-45"
                    >
                      +
                    </span>
                  </summary>
                  <p className="mt-3 max-w-xl text-[15.5px] leading-relaxed text-ink-muted">
                    {item.a}
                  </p>
                </details>
              ))}
            </div>
          </div>
        </section>

        {/* Final call */}
        <section className="mx-auto max-w-6xl px-5 pb-28 pt-12">
          <div className="reveal border-t border-white/15 pt-14">
            <h2 className="max-w-3xl text-balance font-heading text-[2.6rem] font-extrabold leading-[1] tracking-[-0.035em] sm:text-[4.4rem]">
              Your campus is waiting.
            </h2>
            <div className="mt-9 flex flex-wrap items-center gap-x-8 gap-y-4">
              <Button asChild size="lg" className="h-14 rounded-xl px-8 text-[16px]">
                <Link href="/signin">
                  Get started <ArrowRightIcon aria-hidden="true" />
                </Link>
              </Button>
              <Link
                href="/setup"
                className="inline-flex items-center gap-1 text-[15px] underline underline-offset-4 hover:text-ink"
              >
                Running a college? Set up your campus{" "}
                <ArrowUpRightIcon aria-hidden="true" className="size-4" />
              </Link>
            </div>
          </div>
        </section>
      </main>

      <SiteFooter />
    </div>
  );
}
