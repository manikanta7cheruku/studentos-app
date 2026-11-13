import type { Metadata } from "next";
import Link from "next/link";
import {
  ArrowRightIcon,
  BuildingIcon,
  CalendarDaysIcon,
  EyeOffIcon,
  FlagIcon,
  GraduationCapIcon,
  HourglassIcon,
  MessageCircleIcon,
  PackageSearchIcon,
  ScaleIcon,
  ShoppingBagIcon,
  SmartphoneIcon,
  UsersIcon,
  ShieldCheckIcon,
  SearchIcon,
  HomeIcon,
  FlameIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { SiteHeader } from "@/components/site/site-header";
import { SiteFooter } from "@/components/site/site-footer";

export const instant = false;

export const metadata: Metadata = {
  title: "StudentOS | Plans, debates and people from your campus",
  description:
    "Make a plan, join a debate, share a buzz and meet students. StudentOS is where students do things together.",
};

type Feature = { icon: React.ReactNode; title: string; text: string; tint: string };

const FEATURES: Feature[] = [
  {
    icon: <UsersIcon aria-hidden="true" />,
    title: "Plans",
    text: "A turf match, a study group, a trip. Post it, see who joins, and make it happen.",
    tint: "from-[#5b54d6] to-[#8a5fd0]",
  },
  {
    icon: <FlameIcon aria-hidden="true" />,
    title: "Buzz",
    text: "Say what is on your mind as easily as a message. The best buzz rise to the top.",
    tint: "from-[#d99a3a] to-[#e0566a]",
  },
  {
    icon: <ScaleIcon aria-hidden="true" />,
    title: "Debates",
    text: "Pick a side, argue it well and vote. Speak freely, with an anonymous option when you want it.",
    tint: "from-[#2f9fd0] to-[#4f6fe0]",
  },
  {
    icon: <GraduationCapIcon aria-hidden="true" />,
    title: "Network",
    text: "Find students who share your interests, send a request and build your circle.",
    tint: "from-[#2fb98a] to-[#2f90b9]",
  },
  {
    icon: <MessageCircleIcon aria-hidden="true" />,
    title: "Private messages",
    text: "Message people you have connected with. Messages disappear after they are read.",
    tint: "from-[#d6549a] to-[#e0866a]",
  },
  {
    icon: <CalendarDaysIcon aria-hidden="true" />,
    title: "Events and turf",
    text: "Discover what is on this week and book a game with the people around you.",
    tint: "from-[#8a5fd0] to-[#d6549a]",
  },
];

const STEPS = [
  {
    n: "1",
    title: "Sign in",
    text: "Continue with Google or get a code by email. No password to remember.",
  },
  {
    n: "2",
    title: "Tell us a little",
    text: "Your name, your college and a few interests, so what you see is relevant.",
  },
  {
    n: "3",
    title: "Start doing things",
    text: "Join a plan, take a side in a debate, or post your own. That is it.",
  },
];

const SOON = [
  {
    icon: <BuildingIcon aria-hidden="true" />,
    title: "Your college space",
    text: "A private space for your campus that stays inside your college.",
  },
  {
    icon: <ShoppingBagIcon aria-hidden="true" />,
    title: "Marketplace",
    text: "Sell, rent and lend what you no longer need, student to student.",
  },
  {
    icon: <PackageSearchIcon aria-hidden="true" />,
    title: "Lost and found",
    text: "Get lost things back to their owners, fast, inside your campus.",
  },
];

const FAQ = [
  {
    q: "Is StudentOS free?",
    a: "Yes. StudentOS is free for students. If that ever changes, you will be told well before.",
  },
  {
    q: "Do I need a college email?",
    a: "No. You can sign in with Google or an email code and start on Global, which is open to every student.",
  },
  {
    q: "Are my messages private?",
    a: "Messages are only visible to you and the person you write to, and they disappear after being read. They are not end-to-end encrypted, which the Privacy Notice explains in full.",
  },
  {
    q: "Can I post without my name?",
    a: "In debates you can take part anonymously. Other students will not see your name, but our community rules still apply to everyone.",
  },
  {
    q: "When is my college space coming?",
    a: "We are teaming up with colleges now and opening campus by campus. You can start on Global today.",
  },
  {
    q: "Is there a mobile app?",
    a: "The app is on its way for Android and iOS. Until then StudentOS works in your phone browser and can be added to your home screen.",
  },
];

/** A small, honest picture of the app: the Home screen as a phone, built from plain elements. */
function PhoneMock() {
  const rows = [
    {
      tag: "Football",
      title: "5v5 tonight at the turf",
      meta: "7 going · 2 spots",
      tint: "from-[#2fb98a] to-[#2f90b9]",
    },
    {
      tag: "Hackathon",
      title: "48 hours, need a designer",
      meta: "3 spots left",
      tint: "from-[#5b54d6] to-[#8a5fd0]",
    },
    {
      tag: "Debate",
      title: "Should attendance be optional?",
      meta: "128 votes · live",
      tint: "from-[#d99a3a] to-[#e0566a]",
    },
  ];
  return (
    <div
      aria-hidden="true"
      className="relative mx-auto w-[17.5rem] rounded-[2.4rem] border border-white/15 bg-[#12121a] p-2.5 shadow-[0_40px_80px_rgba(0,0,0,0.55),0_0_80px_rgba(111,102,214,0.25)]"
    >
      <div className="overflow-hidden rounded-[1.9rem] bg-[#0d0d14]">
        <div className="flex items-center justify-between px-4 pb-2 pt-4">
          <span className="font-heading text-[15px] font-extrabold">Home</span>
          <span className="bg-brand size-7 rounded-full" />
        </div>
        <div className="px-3 pb-3">
          <div className="flex gap-1.5 pb-3">
            {["All", "Plans", "Buzz", "Debates"].map((chip, i) => (
              <span
                key={chip}
                className={`rounded-full px-2.5 py-1 text-[10.5px] font-semibold ${
                  i === 0 ? "bg-white text-[#0b0b10]" : "bg-white/10 text-white/70"
                }`}
              >
                {chip}
              </span>
            ))}
          </div>
          <div className="flex flex-col gap-2">
            {rows.map((row) => (
              <div
                key={row.title}
                className="rounded-2xl border border-white/[0.08] bg-white/[0.05] p-2.5"
              >
                <span
                  className={`inline-block rounded-full bg-gradient-to-r px-2 py-0.5 text-[9.5px] font-bold text-white ${row.tint}`}
                >
                  {row.tag}
                </span>
                <p className="mt-1.5 text-[12.5px] font-bold leading-tight">{row.title}</p>
                <p className="mt-0.5 text-[10.5px] text-white/55">{row.meta}</p>
              </div>
            ))}
          </div>
        </div>
        <div className="mx-3 mb-3 flex items-center justify-around rounded-full border border-white/10 bg-white/[0.06] py-2.5 text-white/60">
          <HomeIcon className="size-4 text-white" />
          <UsersIcon className="size-4" />
          <span className="bg-brand -my-1 inline-flex size-8 items-center justify-center rounded-full text-white">
            +
          </span>
          <ScaleIcon className="size-4" />
          <SearchIcon className="size-4" />
        </div>
      </div>
    </div>
  );
}

function StoreButton({ label, store }: { label: string; store: string }) {
  return (
    <span
      aria-disabled="true"
      className="inline-flex items-center gap-3 rounded-2xl border border-white/12 bg-white/[0.05] px-4 py-2.5 opacity-80"
    >
      <SmartphoneIcon aria-hidden="true" className="size-6 text-ink-muted" />
      <span className="flex flex-col leading-tight">
        <span className="text-[10.5px] font-semibold uppercase tracking-wide text-ink-muted">
          {label}
        </span>
        <span className="text-[15px] font-bold">{store}</span>
      </span>
    </span>
  );
}

/** The public front page: what StudentOS is, what is in it, how it treats privacy, and the way in. */
export default function Home() {
  return (
    <div className="relative min-h-dvh overflow-x-clip">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-[46rem] bg-[radial-gradient(60%_60%_at_50%_0%,rgba(111,102,214,0.32),transparent_70%)]"
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
        <section className="mx-auto grid max-w-6xl items-center gap-12 px-5 pb-16 pt-12 md:grid-cols-[1.15fr_1fr] md:pb-24 md:pt-20">
          <div className="max-w-xl">
            <span className="glass-clear inline-flex items-center gap-2 rounded-full px-3 py-1 text-[12px] font-semibold text-ink-muted">
              <span className="bg-brand size-2 rounded-full" /> Made for students
            </span>
            <h1 className="mt-5 text-balance font-heading text-[2.6rem] font-extrabold leading-[1.02] tracking-tight sm:text-[3.7rem]">
              Your campus, <span className="text-brand">in your pocket.</span>
            </h1>
            <p className="mt-5 max-w-md text-pretty text-[17px] leading-relaxed text-ink-muted">
              Make a plan, join a debate, share a buzz and meet students who like what you like.
              StudentOS is where students do things together.
            </p>
            <div className="mt-8 flex flex-wrap items-center gap-3">
              <Button asChild size="lg" className="h-12 px-7 text-[15px]">
                <Link href="/signin">
                  Get started <ArrowRightIcon aria-hidden="true" />
                </Link>
              </Button>
              <Button asChild variant="outline" size="lg" className="h-12 px-6 text-[15px]">
                <a href="#features">See what is inside</a>
              </Button>
            </div>
            <p className="mt-4 text-[13px] text-ink-muted">
              Free for students. No password needed.
            </p>
          </div>
          <PhoneMock />
        </section>

        {/* Features */}
        <section
          id="features"
          aria-labelledby="features-h"
          className="mx-auto max-w-6xl scroll-mt-20 px-5 py-16"
        >
          <p className="text-[12px] font-bold uppercase tracking-[0.1em] text-ink-muted">
            Features
          </p>
          <h2
            id="features-h"
            className="mt-2 max-w-2xl text-balance font-heading text-[2rem] font-extrabold leading-tight tracking-tight sm:text-[2.6rem]"
          >
            Everything student life runs on, in one place.
          </h2>
          <ul className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {FEATURES.map((item) => (
              <li
                key={item.title}
                className="glass-card lift flex flex-col gap-4 rounded-[24px] p-6"
              >
                <span
                  className={`inline-flex size-12 items-center justify-center rounded-2xl bg-gradient-to-br text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.35)] [&_svg]:size-6 ${item.tint}`}
                >
                  {item.icon}
                </span>
                <div>
                  <h3 className="text-[1.15rem] font-bold">{item.title}</h3>
                  <p className="mt-1.5 text-[15px] leading-relaxed text-ink-muted">{item.text}</p>
                </div>
              </li>
            ))}
          </ul>
        </section>

        {/* Debates and privacy spotlight */}
        <section
          id="privacy"
          aria-labelledby="privacy-h"
          className="mx-auto max-w-6xl scroll-mt-20 px-5 py-16"
        >
          <div className="glass relative overflow-hidden rounded-[32px] p-7 sm:p-12">
            <span
              aria-hidden="true"
              className="bg-brand pointer-events-none absolute -right-16 -top-20 size-72 rounded-full opacity-20 blur-3xl"
            />
            <div className="relative grid gap-10 md:grid-cols-2">
              <div>
                <p className="text-[12px] font-bold uppercase tracking-[0.1em] text-ink-muted">
                  Your voice, your terms
                </p>
                <h2
                  id="privacy-h"
                  className="mt-2 text-balance font-heading text-[2rem] font-extrabold leading-tight tracking-tight sm:text-[2.4rem]"
                >
                  Say what you really think.
                </h2>
                <p className="mt-4 text-[16px] leading-relaxed text-ink-muted">
                  Some opinions are easier to share when your name is not on them. Join a debate
                  anonymously, choose a side and let the argument stand on its own. Every member
                  follows the same community rules, so it stays respectful.
                </p>
                <Button asChild variant="outline" className="mt-6">
                  <Link href="/guidelines">Read the community guidelines</Link>
                </Button>
              </div>
              <ul className="flex flex-col gap-3">
                {[
                  {
                    icon: <EyeOffIcon aria-hidden="true" />,
                    t: "Anonymous debates",
                    d: "Take part without your name showing to other students.",
                  },
                  {
                    icon: <HourglassIcon aria-hidden="true" />,
                    t: "Messages that disappear",
                    d: "Private messages are removed after they have been read.",
                  },
                  {
                    icon: <ShieldCheckIcon aria-hidden="true" />,
                    t: "You are in control",
                    d: "Block people, report anything and choose what your profile shows.",
                  },
                  {
                    icon: <FlagIcon aria-hidden="true" />,
                    t: "Reviewed by people",
                    d: "Reports are looked at by real people, not just filters.",
                  },
                ].map((point) => (
                  <li
                    key={point.t}
                    className="glass-clear flex items-start gap-3.5 rounded-2xl p-4"
                  >
                    <span className="bg-brand inline-flex size-10 shrink-0 items-center justify-center rounded-xl text-white [&_svg]:size-5">
                      {point.icon}
                    </span>
                    <span>
                      <span className="block text-[15px] font-bold">{point.t}</span>
                      <span className="mt-0.5 block text-[14px] leading-snug text-ink-muted">
                        {point.d}
                      </span>
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </section>

        {/* How it works */}
        <section
          id="how"
          aria-labelledby="how-h"
          className="mx-auto max-w-6xl scroll-mt-20 px-5 py-16"
        >
          <p className="text-[12px] font-bold uppercase tracking-[0.1em] text-ink-muted">
            How it works
          </p>
          <h2
            id="how-h"
            className="mt-2 font-heading text-[2rem] font-extrabold leading-tight tracking-tight sm:text-[2.6rem]"
          >
            Up and running in a minute.
          </h2>
          <ol className="mt-10 grid gap-4 md:grid-cols-3">
            {STEPS.map((step) => (
              <li key={step.n} className="glass-card rounded-[24px] p-6">
                <span className="bg-brand inline-flex size-10 items-center justify-center rounded-full font-heading text-[16px] font-extrabold text-white">
                  {step.n}
                </span>
                <h3 className="mt-4 text-[1.1rem] font-bold">{step.title}</h3>
                <p className="mt-1.5 text-[15px] leading-relaxed text-ink-muted">{step.text}</p>
              </li>
            ))}
          </ol>
        </section>

        {/* Coming soon */}
        <section
          id="coming"
          aria-labelledby="coming-h"
          className="mx-auto max-w-6xl scroll-mt-20 px-5 py-16"
        >
          <p className="text-[12px] font-bold uppercase tracking-[0.1em] text-[#f0c36a]">
            Coming soon
          </p>
          <h2
            id="coming-h"
            className="mt-2 max-w-2xl text-balance font-heading text-[2rem] font-extrabold leading-tight tracking-tight sm:text-[2.6rem]"
          >
            More for your campus is on its way.
          </h2>
          <ul className="mt-10 grid gap-4 md:grid-cols-3">
            {SOON.map((item) => (
              <li key={item.title} className="glass-card flex flex-col gap-3 rounded-[24px] p-6">
                <span className="inline-flex size-11 items-center justify-center rounded-2xl bg-white/10 text-ink [&_svg]:size-5">
                  {item.icon}
                </span>
                <h3 className="text-[1.1rem] font-bold">{item.title}</h3>
                <p className="text-[15px] leading-relaxed text-ink-muted">{item.text}</p>
              </li>
            ))}
          </ul>
        </section>

        {/* Mobile app */}
        <section aria-labelledby="app-h" className="mx-auto max-w-6xl px-5 py-16">
          <div className="glass-card flex flex-col items-start justify-between gap-6 rounded-[32px] p-7 sm:p-10 md:flex-row md:items-center">
            <div className="max-w-md">
              <h2
                id="app-h"
                className="font-heading text-[1.7rem] font-extrabold leading-tight tracking-tight sm:text-[2rem]"
              >
                Take it with you.
              </h2>
              <p className="mt-2 text-[15.5px] leading-relaxed text-ink-muted">
                The StudentOS app for Android and iOS is coming soon. Until then, open StudentOS in
                your phone browser.
              </p>
            </div>
            <div className="flex flex-wrap gap-3">
              <StoreButton label="Get it on" store="Google Play" />
              <StoreButton label="Download on the" store="App Store" />
            </div>
          </div>
        </section>

        {/* FAQ */}
        <section
          id="faq"
          aria-labelledby="faq-h"
          className="mx-auto max-w-3xl scroll-mt-20 px-5 py-16"
        >
          <h2
            id="faq-h"
            className="font-heading text-[2rem] font-extrabold leading-tight tracking-tight sm:text-[2.4rem]"
          >
            Questions
          </h2>
          <div className="mt-8 flex flex-col gap-3">
            {FAQ.map((item) => (
              <details key={item.q} className="glass-card group rounded-2xl px-5 py-4">
                <summary className="flex cursor-pointer list-none items-center justify-between gap-4 text-[16px] font-bold">
                  {item.q}
                  <span
                    aria-hidden="true"
                    className="text-ink-muted transition-transform group-open:rotate-45"
                  >
                    +
                  </span>
                </summary>
                <p className="mt-2 text-[15px] leading-relaxed text-ink-muted">{item.a}</p>
              </details>
            ))}
          </div>
        </section>

        {/* Colleges and final call */}
        <section className="mx-auto max-w-6xl px-5 pb-20 pt-8">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="glass relative overflow-hidden rounded-[28px] p-8 text-center md:text-left">
              <h2 className="font-heading text-[1.6rem] font-extrabold leading-tight">
                Ready to join?
              </h2>
              <p className="mt-2 text-[15px] text-ink-muted">Start on Global in under a minute.</p>
              <Button asChild size="lg" className="mt-5 h-12 px-7 text-[15px]">
                <Link href="/signin">
                  Get started <ArrowRightIcon aria-hidden="true" />
                </Link>
              </Button>
            </div>
            <div className="glass-card rounded-[28px] p-8 text-center md:text-left">
              <h2 className="font-heading text-[1.6rem] font-extrabold leading-tight">
                Running a college?
              </h2>
              <p className="mt-2 text-[15px] text-ink-muted">
                Bring a private space to your students and manage it yourself.
              </p>
              <Button asChild variant="outline" size="lg" className="mt-5">
                <Link href="/setup">Set up your campus</Link>
              </Button>
            </div>
          </div>
        </section>
      </main>

      <SiteFooter />
    </div>
  );
}
