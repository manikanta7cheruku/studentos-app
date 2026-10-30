import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRightIcon, ShieldCheckIcon, UsersIcon, BriefcaseIcon, FolderGit2Icon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { FaqAccordion, type FaqItem } from "@/features/landing/faq-accordion";

export const metadata: Metadata = {
  title: "StudentOS - One place for your college",
  description:
    "Find teammates for projects and hackathons, track internship applications, and build a verified portfolio in a private space run by your college.",
};

const FAQ_ITEMS: FaqItem[] = [
  {
    id: "free",
    question: "Is it free?",
    answer: "Yes. StudentOS is free for students.",
  },
  {
    id: "which-colleges",
    question: "Which colleges?",
    answer:
      "We are launching college by college during our pilot. Join the waitlist with your college name to help bring StudentOS to your campus next.",
  },
  {
    id: "profile-visibility",
    question: "Who can see my profile?",
    answer:
      "Only verified members of your own college can see your profile and team posts. Your internship application tracker is always private to you and is never visible to other students or administrators.",
  },
  {
    id: "verification",
    question: "How do I verify?",
    answer:
      "Verification methods depend on your college: college email address, invite code, class roster, or administrator approval.",
  },
  {
    id: "data-collection",
    question: "What data do you collect?",
    answer:
      "We collect only what is necessary to verify your affiliation with your college and provide the service. We never sell or share your data with advertisers.",
  },
  {
    id: "content-removal",
    question: "Can my college remove content?",
    answer:
      "Yes. College moderators can review reported posts and remove content that violates campus guidelines through our built-in moderation queue.",
  },
  {
    id: "delete-account",
    question: "How do I delete my account?",
    answer:
      "You will be able to delete your account and all associated personal data at any time directly from your account settings.",
  },
  {
    id: "college-not-listed",
    question: "What if my college is not on StudentOS?",
    answer:
      "Join the waitlist with your college name. We prioritise opening new campuses based on student and faculty requests.",
  },
];

export default function Home() {
  return (
    <div className="flex min-h-screen flex-col bg-background text-foreground">
      {/* Header */}
      <header className="border-b border-border bg-surface">
        <div className="mx-auto flex h-16 w-full max-w-5xl items-center justify-between px-4 sm:px-6">
          <Link
            href="/"
            className="flex items-center gap-2 font-heading text-xl font-semibold text-foreground outline-none hover:text-primary focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
          >
            <span>StudentOS</span>
          </Link>

          <nav aria-label="Main navigation" className="flex items-center gap-4 sm:gap-6">
            <Link
              href="/colleges"
              className="text-base font-medium text-muted-foreground outline-none hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
            >
              Colleges
            </Link>
            <Link
              href="/safety"
              className="text-base font-medium text-muted-foreground outline-none hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
            >
              Safety
            </Link>
            <Button asChild size="default">
              <a href="#waitlist">Join the waitlist</a>
            </Button>
          </nav>
        </div>
      </header>

      {/* Main Content */}
      <main id="main-content" className="mx-auto flex w-full max-w-5xl flex-col gap-16 px-4 py-12 text-base sm:gap-20 sm:px-6 sm:py-16">
        {/* S1: Hero */}
        <section aria-labelledby="hero-title" className="flex flex-col gap-8 md:flex-row md:items-center md:justify-between">
          <div className="flex max-w-2xl flex-col gap-6">
            <div className="inline-flex items-center gap-2 self-start rounded-card border border-border bg-surface px-3 py-1.5 text-base font-medium text-muted-foreground">
              <span className="size-2 rounded-full bg-primary" aria-hidden="true" />
              <span>In development &middot; Pilot waitlist open</span>
            </div>

            <h1 id="hero-title" className="font-heading text-3xl font-semibold tracking-tight text-foreground sm:text-4xl lg:text-5xl">
              One place for your college.
            </h1>

            <p className="text-lg text-muted-foreground sm:text-xl">
              Find teammates for projects and hackathons, keep track of your internship applications,
              and build a portfolio &mdash; in a space run by your own college.
            </p>

            <div className="flex flex-col items-start gap-4 sm:flex-row sm:items-center">
              <Button asChild size="lg">
                <a href="#waitlist">Join the waitlist</a>
              </Button>
              <Link
                href="/colleges"
                className="inline-flex min-h-11 items-center gap-2 font-medium text-primary underline underline-offset-4 outline-none hover:text-primary/90 focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              >
                <span>Bringing StudentOS to a college?</span>
                <ArrowRightIcon aria-hidden="true" className="size-4" />
              </Link>
            </div>

            <p className="text-base text-muted-foreground">
              Free for students. Currently in development.
            </p>
          </div>

          {/* Visual: Typographic Editorial Diagram */}
          <div
            aria-label="Platform overview diagram"
            className="flex w-full max-w-sm flex-col gap-3 rounded-card border border-border bg-surface p-6 shadow-xs"
          >
            <div className="flex items-center justify-between border-b border-border pb-3">
              <span className="font-heading text-lg font-semibold text-foreground">Your College Space</span>
              <span className="rounded-input border border-border bg-secondary px-2 py-0.5 text-base font-medium text-secondary-foreground">
                Verified
              </span>
            </div>
            <ul className="flex flex-col gap-2 pt-2 text-base text-muted-foreground">
              <li className="flex items-center gap-3">
                <UsersIcon aria-hidden="true" className="size-5 shrink-0 text-primary" />
                <span>Team Finder &middot; Role requests</span>
              </li>
              <li className="flex items-center gap-3">
                <BriefcaseIcon aria-hidden="true" className="size-5 shrink-0 text-primary" />
                <span>Application Tracker &middot; Private</span>
              </li>
              <li className="flex items-center gap-3">
                <FolderGit2Icon aria-hidden="true" className="size-5 shrink-0 text-primary" />
                <span>Student Portfolio &middot; Projects</span>
              </li>
              <li className="flex items-center gap-3">
                <ShieldCheckIcon aria-hidden="true" className="size-5 shrink-0 text-primary" />
                <span>Moderation &middot; Campus safety</span>
              </li>
            </ul>
          </div>
        </section>

        {/* S2: Problem Framing */}
        <section
          aria-labelledby="problem-title"
          className="rounded-card border border-border bg-surface p-6 sm:p-8"
        >
          <div className="max-w-2xl flex flex-col gap-3">
            <h2 id="problem-title" className="font-heading text-2xl font-semibold text-foreground">
              The problem, in student words
            </h2>
            <p className="text-lg text-muted-foreground">
              Teams get formed in group chats. Applications live in spreadsheets. Projects disappear
              when the semester ends.
            </p>
          </div>
        </section>

        {/* S3: What You Can Do (Alternating Layout) */}
        <section aria-labelledby="features-title" className="flex flex-col gap-8">
          <div className="flex flex-col gap-2">
            <h2 id="features-title" className="font-heading text-2xl font-semibold text-foreground sm:text-3xl">
              What you can do
            </h2>
            <p className="text-lg text-muted-foreground">
              Essential student workflows organised in one clean, private place.
            </p>
          </div>

          <div className="flex flex-col gap-6">
            {/* Block 1 */}
            <div className="flex flex-col gap-6 rounded-card border border-border bg-surface p-6 md:flex-row md:items-center md:justify-between sm:p-8">
              <div className="flex max-w-xl flex-col gap-3">
                <div className="flex items-center gap-2">
                  <UsersIcon aria-hidden="true" className="size-6 text-primary" />
                  <h3 className="font-heading text-xl font-semibold text-foreground">Find your team</h3>
                </div>
                <p className="text-base text-muted-foreground">
                  Post the roles you need for class projects, hackathons, or clubs. Review requests
                  from interested classmates, view their profiles, and accept or decline.
                </p>
              </div>
              <div className="flex shrink-0 items-center justify-center rounded-card border border-border bg-background p-4 text-base font-medium text-muted-foreground">
                <span>Roles &middot; Applications &middot; Teammates</span>
              </div>
            </div>

            {/* Block 2 (Alternating orientation) */}
            <div className="flex flex-col gap-6 rounded-card border border-border bg-surface p-6 md:flex-row-reverse md:items-center md:justify-between sm:p-8">
              <div className="flex max-w-xl flex-col gap-3">
                <div className="flex items-center gap-2">
                  <BriefcaseIcon aria-hidden="true" className="size-6 text-primary" />
                  <h3 className="font-heading text-xl font-semibold text-foreground">Track every application</h3>
                </div>
                <p className="text-base text-muted-foreground">
                  Keep track of internship and job applications with statuses, deadlines, and personal
                  notes. Your tracker is private to you and never visible to anyone else.
                </p>
              </div>
              <div className="flex shrink-0 items-center justify-center rounded-card border border-border bg-background p-4 text-base font-medium text-muted-foreground">
                <span>Deadlines &middot; Private &middot; Reminders</span>
              </div>
            </div>

            {/* Block 3 */}
            <div className="flex flex-col gap-6 rounded-card border border-border bg-surface p-6 md:flex-row md:items-center md:justify-between sm:p-8">
              <div className="flex max-w-xl flex-col gap-3">
                <div className="flex items-center gap-2">
                  <FolderGit2Icon aria-hidden="true" className="size-6 text-primary" />
                  <h3 className="font-heading text-xl font-semibold text-foreground">Show what you have built</h3>
                </div>
                <p className="text-base text-muted-foreground">
                  Create a profile and portfolio highlighting your projects, links, and repositories
                  that you can easily share across campus.
                </p>
              </div>
              <div className="flex shrink-0 items-center justify-center rounded-card border border-border bg-background p-4 text-base font-medium text-muted-foreground">
                <span>Projects &middot; Skills &middot; Campus Profile</span>
              </div>
            </div>

            {/* Coming next banner */}
            <div className="rounded-card border border-border bg-secondary/50 p-6">
              <p className="text-base font-medium text-foreground">
                <span className="font-semibold">Coming next:</span> campus announcements, Lost and
                Found, and events. These features are in development and not yet available.
              </p>
            </div>
          </div>
        </section>

        {/* S4: Your college, your rules (Trust) */}
        <section aria-labelledby="trust-title" className="flex flex-col gap-6 rounded-card border border-border bg-surface p-6 sm:p-8">
          <div className="flex flex-col gap-3">
            <h2 id="trust-title" className="font-heading text-2xl font-semibold text-foreground sm:text-3xl">
              Your college, your rules
            </h2>
            <p className="text-lg text-muted-foreground">
              Privacy, boundary controls, and safety built from the ground up for campus communities.
            </p>
          </div>

          <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
            <div className="flex flex-col gap-2">
              <h3 className="font-heading text-lg font-semibold text-foreground">Private college space</h3>
              <p className="text-base text-muted-foreground">
                Each college has its own private space. Content, posts, and member directories are
                isolated to your campus community.
              </p>
            </div>

            <div className="flex flex-col gap-2">
              <h3 className="font-heading text-lg font-semibold text-foreground">Verified members</h3>
              <p className="text-base text-muted-foreground">
                Members are verified using a college email, invite codes, class roster, or admin
                approval, depending on your college.
              </p>
            </div>

            <div className="flex flex-col gap-2">
              <h3 className="font-heading text-lg font-semibold text-foreground">Private tracker</h3>
              <p className="text-base text-muted-foreground">
                Your application tracker is never visible to anyone else, including college
                administrators or faculty.
              </p>
            </div>

            <div className="flex flex-col gap-2">
              <h3 className="font-heading text-lg font-semibold text-foreground">Built-in moderation</h3>
              <p className="text-base text-muted-foreground">
                Reporting and moderation tools let the community and designated campus moderators
                keep conversations respectful.
              </p>
            </div>
          </div>

          <div className="pt-2">
            <Link
              href="/safety"
              className="inline-flex min-h-11 items-center gap-2 font-medium text-primary underline underline-offset-4 outline-none hover:text-primary/90 focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
            >
              <span>Read how verification, privacy, and moderation work on our Safety page</span>
              <ArrowRightIcon aria-hidden="true" className="size-4" />
            </Link>
          </div>
        </section>

        {/* S5: How it starts */}
        <section aria-labelledby="start-title" className="flex flex-col gap-6">
          <div className="flex flex-col gap-2">
            <h2 id="start-title" className="font-heading text-2xl font-semibold text-foreground sm:text-3xl">
              How it starts
            </h2>
            <p className="text-lg text-muted-foreground">
              Getting started takes three simple steps.
            </p>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div className="flex flex-col gap-2 rounded-card border border-border bg-surface p-6">
              <span className="font-heading text-2xl font-semibold text-primary">1</span>
              <h3 className="font-heading text-lg font-semibold text-foreground">Your college joins</h3>
              <p className="text-base text-muted-foreground">
                A college space is opened for your campus during our pilot program.
              </p>
            </div>

            <div className="flex flex-col gap-2 rounded-card border border-border bg-surface p-6">
              <span className="font-heading text-2xl font-semibold text-primary">2</span>
              <h3 className="font-heading text-lg font-semibold text-foreground">You verify you belong</h3>
              <p className="text-base text-muted-foreground">
                Verify your affiliation using your college email address or an invite code.
              </p>
            </div>

            <div className="flex flex-col gap-2 rounded-card border border-border bg-surface p-6">
              <span className="font-heading text-2xl font-semibold text-primary">3</span>
              <h3 className="font-heading text-lg font-semibold text-foreground">You start</h3>
              <p className="text-base text-muted-foreground">
                Find teammates, post roles, track applications, and share your work.
              </p>
            </div>
          </div>

          <p className="text-base text-muted-foreground">
            Verification methods differ by college.
          </p>
        </section>

        {/* S6: For colleges */}
        <section
          id="colleges"
          aria-labelledby="colleges-title"
          className="flex flex-col gap-4 rounded-card border border-border bg-surface p-6 sm:p-8"
        >
          <div className="max-w-2xl flex flex-col gap-3">
            <h2 id="colleges-title" className="font-heading text-2xl font-semibold text-foreground sm:text-3xl">
              For colleges
            </h2>
            <p className="text-lg text-muted-foreground">
              Control who joins your campus space, and post official notices and opportunities for
              your student body.
            </p>
          </div>

          <div className="pt-2">
            <Link
              href="/colleges"
              className="inline-flex min-h-11 items-center gap-2 font-medium text-primary underline underline-offset-4 outline-none hover:text-primary/90 focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
            >
              <span>Learn how to bring StudentOS to your college</span>
              <ArrowRightIcon aria-hidden="true" className="size-4" />
            </Link>
          </div>
        </section>

        {/* S7: FAQ */}
        <section aria-labelledby="faq-title" className="flex flex-col gap-6">
          <div className="flex flex-col gap-2">
            <h2 id="faq-title" className="font-heading text-2xl font-semibold text-foreground sm:text-3xl">
              Frequently asked questions
            </h2>
            <p className="text-lg text-muted-foreground">
              Straightforward answers about privacy, verification, and how StudentOS works.
            </p>
          </div>

          <FaqAccordion items={FAQ_ITEMS} />
        </section>

        {/* S8: Waitlist Form Placeholder */}
        <section
          id="waitlist"
          aria-labelledby="waitlist-title"
          className="flex flex-col gap-4 rounded-card border border-border bg-surface p-6 sm:p-8"
        >
          <h2 id="waitlist-title" className="font-heading text-2xl font-semibold text-foreground sm:text-3xl">
            Join the waitlist
          </h2>
          <p className="text-base text-muted-foreground">
            The waitlist form will be connected here.
          </p>
        </section>
      </main>

      {/* S9: Footer */}
      <footer className="border-t border-border bg-surface py-12 text-base text-muted-foreground">
        <div className="mx-auto flex w-full max-w-5xl flex-col gap-8 px-4 sm:px-6">
          <div className="flex flex-col justify-between gap-6 sm:flex-row sm:items-center">
            <div className="flex flex-col gap-1">
              <span className="font-heading text-lg font-semibold text-foreground">StudentOS</span>
              <p className="text-base text-muted-foreground">Working name: StudentOS.</p>
            </div>

            <nav aria-label="Footer legal and support navigation" className="flex flex-wrap gap-x-6 gap-y-2">
              <Link
                href="/colleges"
                className="outline-none hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              >
                Colleges
              </Link>
              <Link
                href="/safety"
                className="outline-none hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              >
                Safety
              </Link>
              <Link
                href="/privacy"
                className="outline-none hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              >
                Privacy Notice
              </Link>
              <Link
                href="/terms"
                className="outline-none hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              >
                Terms of Service
              </Link>
              <Link
                href="/contact"
                className="outline-none hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              >
                Contact
              </Link>
            </nav>
          </div>

          <div className="flex flex-col justify-between gap-4 border-t border-border pt-6 sm:flex-row sm:items-center">
            <p className="text-base text-muted-foreground">
              &copy; 2026 StudentOS. All rights reserved.
            </p>
            <p className="text-base text-muted-foreground">
              Questions? Email{" "}
              <a
                href="mailto:hello@studentos.test"
                className="font-medium text-foreground underline underline-offset-4 outline-none hover:text-primary focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              >
                hello@studentos.test
              </a>
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
