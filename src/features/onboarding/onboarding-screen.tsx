"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { CalendarDaysIcon, ClockIcon, MessageCircleHeartIcon, UsersIcon } from "lucide-react";
import { Banner } from "@/components/ui/banner";
import { Button } from "@/components/ui/button";
import { FormField } from "@/components/ui/form-field";
import { Input } from "@/components/ui/input";
import { Spinner } from "@/components/app/spinner";
import { Wordmark } from "@/features/auth/auth-frame";
import { safeNext } from "@/features/auth/safe-next";
import { collegeNameProblem } from "@/lib/college-name";
import { markJustOnboarded } from "@/lib/just-onboarded";
import { clearReferral, takeReferral } from "@/lib/referral";
import { ApiError, friendlyMessage } from "@/lib/api-client";
import { api } from "@/lib/api/endpoints";
import { useLoad } from "@/lib/use-load";
import { homeFor, useSession } from "@/features/session/session-provider";
import { CollegePicker } from "@/features/profile/college-picker";
import {
  CASUAL_INTERESTS,
  InterestChips,
  tidy,
  TECH_INTERESTS,
} from "@/features/profile/about-fields";

const MIN_INTERESTS = 3;
const MAX_INTERESTS = 20;
const HANDLE = /^[a-z0-9_]{3,30}$/;

/** A name like "Riya Sharma" as a username to start from: riya_sharma. */
const suggestHandle = (name: string) =>
  name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 24);

const STEPS = ["About you", "Your interests", "Quick tour"] as const;

/**
 * A short welcome for a new person: who they are (name, a unique username, the college), what they are into (casual and
 * technical interests, at least three), then a quick look at what the app does. Everything else (gender, branch, year, city,
 * birth year, a line about yourself) is asked later, from "Finish your profile" on Home. Each step is saved when you go on, so
 * closing the tab after step 2 still leaves a finished profile.
 */
export function OnboardingScreen({ next }: { next?: string | null }) {
  const router = useRouter();
  const session = useSession();
  const mine = useLoad(() => api.profile.get(), []);
  const [step, setStep] = React.useState(0);
  // A brand new person first sees why the app is worth it; someone only finishing their profile skips that.
  const [intro, setIntro] = React.useState(true);
  const [finishing, setFinishing] = React.useState(false);
  const [finishError, setFinishError] = React.useState<string | null>(null);

  if (session.status === "signed-out") {
    router.replace("/signin?next=%2Fwelcome");
    return null;
  }

  const finish = async () => {
    if (finishing) return;
    setFinishing(true);
    setFinishError(null);
    // Count the invitation (if the person came through a friend's link), once. It never holds the person back for long.
    const code = takeReferral();
    if (code) {
      await Promise.race([
        api.invite.apply(code).then(
          () => clearReferral(),
          () => clearReferral(),
        ),
        new Promise((resolve) => window.setTimeout(resolve, 1500)),
      ]);
    }
    // Make sure the finished profile reads back as finished before leaving. If it does not, say so here, instead of sending
    // the person on to a page that would send them straight back.
    let finished = false;
    for (let attempt = 0; attempt < 4 && !finished; attempt += 1) {
      try {
        finished = (await api.profile.get()).onboarded;
      } catch {
        finished = false;
      }
      if (!finished) await new Promise((resolve) => window.setTimeout(resolve, 600));
    }
    if (!finished) {
      setFinishError(
        "We could not confirm your profile yet. Check your name, username, college and interests, then try again.",
      );
      setFinishing(false);
      return;
    }
    markJustOnboarded();
    // A full page load, not a soft move: the app then reads the finished profile fresh.
    window.location.replace(safeNext(next ?? null) ?? homeFor(session.colleges));
  };

  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-md flex-col gap-6 px-5 pb-10 pt-6">
      <header className="flex items-center justify-between">
        <Wordmark />
        <span className="text-[12.5px] font-semibold text-ink-muted" aria-live="polite">
          Step {step + 1} of {STEPS.length}
        </span>
      </header>
      <div
        role="progressbar"
        aria-label="Progress"
        aria-valuemin={1}
        aria-valuemax={STEPS.length}
        aria-valuenow={step + 1}
        className="flex gap-1.5"
      >
        {STEPS.map((label, index) => (
          <span
            key={label}
            className={`h-1.5 flex-1 rounded-full transition-colors duration-300 ${index <= step ? "bg-brand" : "bg-white/[0.12]"}`}
          />
        ))}
      </div>

      {mine.status === "loading" ? (
        <p className="text-ink-muted" aria-busy="true">
          Loading…
        </p>
      ) : mine.status === "error" ? (
        <Banner variant="error">
          <p>We could not load your profile. Please reload the page.</p>
        </Banner>
      ) : intro && !mine.data.handle ? (
        <Why onStart={() => setIntro(false)} />
      ) : step === 0 ? (
        <AboutYou saved={mine.data} onDone={() => setStep(1)} />
      ) : step === 1 ? (
        <Interests saved={mine.data} onBack={() => setStep(0)} onDone={() => setStep(2)} />
      ) : (
        <Tour onDone={finish} busy={finishing} error={finishError} onReview={() => setStep(0)} />
      )}
    </main>
  );
}

type Saved = NonNullable<
  ReturnType<typeof useLoad<Awaited<ReturnType<typeof api.profile.get>>>>["data"]
>;

function StepTitle({ title, text }: { title: string; text: string }) {
  return (
    <div>
      <h1 className="font-heading text-[1.7rem] font-extrabold leading-tight tracking-tight">
        {title}
      </h1>
      <p className="mt-1.5 text-[14.5px] text-ink-muted">{text}</p>
    </div>
  );
}

const WHY = [
  {
    title: "Find your people",
    text: "Teammates for a project, a fourth for football, someone who knows the subject you are stuck on.",
  },
  {
    title: "Ask and get real answers",
    text: "Post a question or a poll. Students from your college and beyond answer, with your name or without.",
  },
  {
    title: "Nothing sticks around",
    text: "Messages disappear an hour after they are read. You choose what others see about you.",
  },
] as const;

function Why({ onStart }: { onStart: () => void }) {
  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="font-heading text-[2rem] font-extrabold leading-tight tracking-tight">
          Welcome to <span className="text-brand">StudentOS</span>
        </h1>
        <p className="mt-2 text-[15px] text-ink-muted">
          The place for students to meet, ask, plan and help each other. Here is why it is worth
          your time.
        </p>
      </div>
      <ul className="stagger flex flex-col gap-3">
        {WHY.map((item, index) => (
          <li key={item.title} className="glass-card flex gap-4 rounded-[22px] p-4">
            <span className="bg-brand tabular inline-flex size-9 shrink-0 items-center justify-center rounded-xl font-heading text-[15px] font-extrabold text-white">
              {index + 1}
            </span>
            <span>
              <span className="block text-[16px] font-bold leading-tight">{item.title}</span>
              <span className="mt-1 block text-[13.5px] leading-snug text-ink-muted">
                {item.text}
              </span>
            </span>
          </li>
        ))}
      </ul>
      <Button size="lg" onClick={onStart}>
        Get started
      </Button>
      <p className="text-center text-[12.5px] text-ink-muted">It takes about a minute.</p>
    </div>
  );
}

function AboutYou({ saved, onDone }: { saved: Saved; onDone: () => void }) {
  const [name, setName] = React.useState(saved.display_name);
  const [handle, setHandle] = React.useState(saved.handle ?? suggestHandle(saved.display_name));
  const [college, setCollege] = React.useState(saved.college_name ?? "");
  const [fields, setFields] = React.useState<Record<string, string>>({});
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (busy) return;
    const problems: Record<string, string> = {};
    if (!name.trim()) problems.name = "Tell us your name.";
    const clean = handle.trim().toLowerCase();
    if (!HANDLE.test(clean))
      problems.handle = "3 to 30 letters, numbers or underscores, for example riya_sharma.";
    const collegeProblem = collegeNameProblem(college);
    if (!tidy(college)) problems.college = "Choose your college, or pick Other and type it.";
    else if (collegeProblem) problems.college = collegeProblem;
    setFields(problems);
    if (Object.keys(problems).length) return;
    setBusy(true);
    setError(null);
    try {
      await api.profile.patch({
        display_name: name.trim(),
        handle: clean,
        college_name: tidy(college),
      });
      onDone();
    } catch (caught) {
      if (caught instanceof ApiError && caught.code === "CONFLICT")
        setFields({ handle: "That username is taken. Try another." });
      else setError(friendlyMessage(caught, "We could not save that. Please try again."));
      setBusy(false);
    }
  }

  const collegeId = React.useId();
  return (
    <form onSubmit={submit} noValidate className="flex flex-col gap-5">
      <StepTitle
        title="Hi, who are you?"
        text="Just three things. You can add the rest to your profile whenever you like."
      />
      <FormField label="Name" error={fields.name} required>
        <Input
          value={name}
          onChange={(event) => setName(event.target.value)}
          maxLength={80}
          autoComplete="name"
          autoFocus
        />
      </FormField>
      <FormField
        label="Username"
        help="Lowercase letters, numbers and underscores. Nobody else can have it."
        error={fields.handle}
        required
      >
        <Input
          value={handle}
          onChange={(event) => setHandle(event.target.value.toLowerCase())}
          maxLength={30}
          autoCapitalize="none"
          autoComplete="username"
          spellCheck={false}
        />
      </FormField>
      <div className="flex flex-col gap-1.5">
        <span id={`${collegeId}-label`} className="text-[13px] font-semibold text-ink/90">
          College <span className="font-normal text-ink-muted">(required)</span>
        </span>
        <CollegePicker
          id={collegeId}
          labelledBy={`${collegeId}-label`}
          value={college}
          invalid={Boolean(fields.college)}
          describedBy={`${collegeId}-help`}
          onPick={(next) => {
            setCollege(next);
            setFields((current) => ({ ...current, college: "" }));
          }}
        />
        <p
          id={`${collegeId}-help`}
          className={`text-[12.5px] ${fields.college ? "font-medium text-danger" : "text-ink-muted"}`}
        >
          {fields.college || "Shown on your profile so people know where you are from."}
        </p>
      </div>
      {error ? (
        <Banner variant="error">
          <p>{error}</p>
        </Banner>
      ) : null}
      <Button type="submit" size="lg" disabled={busy}>
        {busy ? <Spinner /> : null} Continue
      </Button>
    </form>
  );
}

function Interests({
  saved,
  onBack,
  onDone,
}: {
  saved: Saved;
  onBack: () => void;
  onDone: () => void;
}) {
  const [casual, setCasual] = React.useState<string[]>(saved.interests);
  const [tech, setTech] = React.useState<string[]>(saved.tech_interests);
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const total = casual.length + tech.length;
  const room = MAX_INTERESTS;

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (busy) return;
    if (total < MIN_INTERESTS) {
      setError(`Pick at least ${MIN_INTERESTS}. You can change them any time.`);
      return;
    }
    setBusy(true);
    setError(null);
    try {
      await api.profile.patch({ interests: casual, tech_interests: tech });
      onDone();
    } catch (caught) {
      setError(friendlyMessage(caught, "We could not save your interests. Please try again."));
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} noValidate className="flex flex-col gap-6">
      <StepTitle
        title="What are you into?"
        text="Pick a few from each list, or add your own. We use them to show you plans and people you will like."
      />
      <InterestChips
        title="For fun"
        suggestions={CASUAL_INTERESTS}
        value={casual}
        onChange={setCasual}
        room={room - total}
        placeholder="Something else you love"
      />
      <InterestChips
        title="Tech and career"
        suggestions={TECH_INTERESTS}
        value={tech}
        onChange={setTech}
        room={room - total}
        placeholder="Another skill or field"
      />
      <p className="tabular text-[13px] text-ink-muted" aria-live="polite">
        {total} picked{total < MIN_INTERESTS ? `, ${MIN_INTERESTS - total} more to go` : ""}
      </p>
      {error ? (
        <Banner variant="error">
          <p>{error}</p>
        </Banner>
      ) : null}
      <div className="flex gap-3">
        <Button type="button" variant="ghost" size="lg" onClick={onBack}>
          Back
        </Button>
        <Button type="submit" size="lg" className="flex-1" disabled={busy}>
          {busy ? <Spinner /> : null} Continue
        </Button>
      </div>
    </form>
  );
}

const TOUR = [
  {
    icon: <UsersIcon aria-hidden="true" />,
    title: "Plans",
    text: "Post a match or a hangout and people join with one tap. Join someone else's.",
  },
  {
    icon: <CalendarDaysIcon aria-hidden="true" />,
    title: "Events",
    text: "Official events from colleges and personal ones from students.",
  },
  {
    icon: <MessageCircleHeartIcon aria-hidden="true" />,
    title: "Buzz and Debates",
    text: "Say anything in seconds, or pick a side and argue your point.",
  },
  {
    icon: <ClockIcon aria-hidden="true" />,
    title: "Coming soon",
    text: "Your college space, the Marketplace and Lost and found open as we team up with colleges.",
  },
];

function Tour({
  onDone,
  busy,
  error,
  onReview,
}: {
  onDone: () => void;
  busy: boolean;
  error: string | null;
  onReview: () => void;
}) {
  return (
    <div className="flex flex-col gap-5">
      <StepTitle
        title="You are in."
        text="Here is what you can do. The + button is always there to start something. Double tap it for shortcuts."
      />
      <ul className="flex flex-col gap-2.5">
        {TOUR.map((item) => (
          <li
            key={item.title}
            className="glass-card flex items-center gap-3.5 rounded-[18px] px-4 py-3"
          >
            <span className="bg-brand inline-flex size-10 shrink-0 items-center justify-center rounded-xl text-white [&_svg]:size-5">
              {item.icon}
            </span>
            <span>
              <span className="block text-[15px] font-bold leading-tight">{item.title}</span>
              <span className="block text-[13px] text-ink-muted">{item.text}</span>
            </span>
          </li>
        ))}
      </ul>
      {error ? (
        <Banner variant="error">
          <p>{error}</p>
          <button
            type="button"
            onClick={onReview}
            className="mt-1 text-[13px] font-semibold underline underline-offset-2"
          >
            Review my details
          </button>
        </Banner>
      ) : null}
      <Button size="lg" onClick={onDone} disabled={busy}>
        {busy ? <Spinner /> : null} Let&rsquo;s go
      </Button>
    </div>
  );
}
