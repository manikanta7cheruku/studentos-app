"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { CalendarDaysIcon, MapPinnedIcon, MessageCircleHeartIcon, UsersIcon } from "lucide-react";
import { Banner } from "@/components/ui/banner";
import { Button } from "@/components/ui/button";
import { FormField } from "@/components/ui/form-field";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Spinner } from "@/components/app/spinner";
import { Wordmark } from "@/features/auth/auth-frame";
import { safeNext } from "@/features/auth/safe-next";
import { clearReferral, takeReferral } from "@/lib/referral";
import { ApiError, friendlyMessage } from "@/lib/api-client";
import { api } from "@/lib/api/endpoints";
import { useLoad } from "@/lib/use-load";
import { homeFor, useSession } from "@/features/session/session-provider";
import {
  BirthYearPicker,
  CASUAL_INTERESTS,
  InterestChips,
  PHONE_OK,
  PhoneFields,
  SexField,
  StudyFields,
  tidy,
  TECH_INTERESTS,
  normalisePhone,
  type Sex,
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

const STEPS = ["About you", "Your interests", "A bit more", "Quick tour"] as const;

/**
 * A short tour for a new person: who they are (name, a unique username, sex, birth year), what they are into (casual and
 * technical interests, at least three), what excites them and an optional mobile number, then a quick look at what the app
 * does. Name, username, sex and interests are required; the rest can be skipped. Each step is saved when you go on, so
 * closing the tab after step 2 still leaves a finished profile.
 */
export function OnboardingScreen({ next }: { next?: string | null }) {
  const router = useRouter();
  const session = useSession();
  const mine = useLoad(() => api.profile.get(), []);
  const [step, setStep] = React.useState(0);
  // A brand new person first sees why the app is worth it; someone only finishing their profile skips that.
  const [intro, setIntro] = React.useState(true);

  if (session.status === "signed-out") {
    router.replace("/signin?next=%2Fwelcome");
    return null;
  }

  const finish = async () => {
    // Count the invitation (if the person came through a friend's link), once.
    const code = takeReferral();
    if (code) {
      try {
        await api.invite.apply(code);
      } catch {
        // The invitation is a nicety: never hold the person back for it.
      }
      clearReferral();
    }
    // A full page load, not a soft move: the app then reads the finished profile fresh, so it can never think the tour is
    // still to do (a soft move could keep the old answer until a reload).
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
      ) : step === 2 ? (
        <MoreAboutYou saved={mine.data} onDone={() => setStep(3)} onSkip={() => setStep(3)} />
      ) : (
        <Tour onDone={finish} />
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
  const [sex, setSex] = React.useState<Sex | null>(saved.sex);
  const [year, setYear] = React.useState<number | null>(saved.birth_year);
  const [college, setCollege] = React.useState(saved.college_name ?? "");
  const [branch, setBranch] = React.useState(saved.branch ?? "");
  const [gradYear, setGradYear] = React.useState<number | null>(saved.grad_year);
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
    if (!sex) problems.sex = "Pick one. “Prefer not to say” is fine.";
    if (tidy(college).length < 2) problems.college = "Type the name of your college.";
    if (!tidy(branch)) problems.branch = "Pick your branch, or choose Other and type it.";
    if (!gradYear) problems.year = "Pick the year you graduate.";
    setFields(problems);
    if (Object.keys(problems).length) return;
    setBusy(true);
    setError(null);
    try {
      await api.profile.patch({
        display_name: name.trim(),
        handle: clean,
        sex: sex!,
        birth_year: year,
        college_name: tidy(college),
        branch: tidy(branch),
        grad_year: gradYear!,
      });
      onDone();
    } catch (caught) {
      if (caught instanceof ApiError && caught.code === "CONFLICT")
        setFields({ handle: "That username is taken. Try another." });
      else setError(friendlyMessage(caught, "We could not save that. Please try again."));
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} noValidate className="flex flex-col gap-5">
      <StepTitle
        title="Hi, who are you?"
        text="This takes a minute. Your username is yours alone, nobody else can have it."
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
        help="Lowercase letters, numbers and underscores."
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
      <div className="flex flex-col gap-2">
        <p className="text-[13px] font-semibold text-ink/90">
          Gender <span className="font-normal text-ink-muted">(required)</span>
        </p>
        <SexField value={sex} onChange={setSex} />
        {fields.sex ? <p className="text-[12.5px] font-medium text-danger">{fields.sex}</p> : null}
        <p className="text-[12.5px] text-ink-muted">
          Private unless you choose to show it on your profile. It helps keep women-only plans safe.
        </p>
      </div>
      <StudyFields
        college={college}
        branch={branch}
        year={gradYear}
        onCollege={setCollege}
        onBranch={setBranch}
        onYear={setGradYear}
        errors={fields}
      />
      <FormField label="Birth year" help="Optional and private. We only keep the year.">
        <BirthYearPicker value={year} onChange={setYear} />
      </FormField>
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

function MoreAboutYou({
  saved,
  onDone,
  onSkip,
}: {
  saved: Saved;
  onDone: () => void;
  onSkip: () => void;
}) {
  const [excited, setExcited] = React.useState(saved.excited_by ?? "");
  const [phone, setPhone] = React.useState(saved.phone ?? "");
  const [share, setShare] = React.useState(saved.phone_visibility === "hosts");
  const [phoneError, setPhoneError] = React.useState<string | undefined>();
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (busy) return;
    const number = phone.trim() ? normalisePhone(phone) : "";
    if (number && !PHONE_OK.test(number)) {
      setPhoneError("Use the form +919876543210.");
      return;
    }
    setPhoneError(undefined);
    const patch: Parameters<typeof api.profile.patch>[0] = {};
    if (excited.trim() !== (saved.excited_by ?? "")) patch.excited_by = excited.trim() || null;
    if ((number || null) !== saved.phone) patch.phone = number || null;
    const visibility = number && share ? "hosts" : "hidden";
    if (visibility !== saved.phone_visibility) patch.phone_visibility = visibility;
    if (Object.keys(patch).length === 0) return onDone();
    setBusy(true);
    setError(null);
    try {
      await api.profile.patch(patch);
      onDone();
    } catch (caught) {
      setError(friendlyMessage(caught, "We could not save that. Please try again."));
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} noValidate className="flex flex-col gap-5">
      <StepTitle
        title="Anything else?"
        text="All optional. You can fill this in later from your profile."
      />
      <FormField
        label="What makes you excited?"
        help="One line classmates will see on your profile."
      >
        <Textarea
          value={excited}
          onChange={(event) => setExcited(event.target.value)}
          maxLength={200}
          rows={3}
          placeholder="Late night football, building small apps, trying every café nearby"
        />
      </FormField>
      <PhoneFields
        phone={phone}
        onPhone={setPhone}
        share={share}
        onShare={setShare}
        error={phoneError}
      />
      {error ? (
        <Banner variant="error">
          <p>{error}</p>
        </Banner>
      ) : null}
      <div className="flex gap-3">
        <Button type="button" variant="ghost" size="lg" onClick={onSkip}>
          Skip
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
    text: "Official events from your college and personal ones from students.",
  },
  {
    icon: <MapPinnedIcon aria-hidden="true" />,
    title: "Turf and courts",
    text: "Find a ground, pick a free hour, ask to book it.",
  },
  {
    icon: <MessageCircleHeartIcon aria-hidden="true" />,
    title: "Buzz and Market",
    text: "Say anything in seconds. Buy, sell, or find what you lost.",
  },
];

function Tour({ onDone }: { onDone: () => void }) {
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
      <Button size="lg" onClick={onDone}>
        Let&rsquo;s go
      </Button>
    </div>
  );
}
