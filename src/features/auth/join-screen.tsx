"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowRightIcon,
  GlobeIcon,
  KeyRoundIcon,
  MailIcon,
  UserRoundCheckIcon,
} from "lucide-react";
import { cn } from "cn";
import { Banner } from "@/components/ui/banner";
import { Button } from "@/components/ui/button";
import { FormField } from "@/components/ui/form-field";
import { Input } from "@/components/ui/input";
import { OtpInput } from "@/components/app/otp-input";
import { Spinner } from "@/components/app/spinner";
import { ApiError, friendlyMessage, newIdempotencyKey } from "@/lib/api-client";
import { api } from "@/lib/api/endpoints";
import { accentVars } from "@/lib/color";
import { GLOBAL_SLUG, homePath } from "@/lib/home-path";
import { useSession } from "@/features/session/session-provider";
import { AuthFrame } from "./auth-frame";
import { PublicStates } from "./public-states";
import { looksLikeEmail } from "./safe-next";
import { useCooldown } from "./use-cooldown";
import { useJoinContext } from "./use-join-context";

type Method = "invite_code" | "email_domain" | "manual" | "open";

const METHOD_LABEL: Record<Method, { label: string; hint: string; icon: React.ReactNode }> = {
  invite_code: {
    label: "Invite code",
    hint: "From your college or a classmate",
    icon: <KeyRoundIcon aria-hidden="true" />,
  },
  email_domain: {
    label: "College email",
    hint: "We send a code to your college address",
    icon: <MailIcon aria-hidden="true" />,
  },
  manual: {
    label: "Ask to join",
    hint: "An admin checks your details",
    icon: <UserRoundCheckIcon aria-hidden="true" />,
  },
  open: {
    label: "Join Global",
    hint: "Open to every student",
    icon: <GlobeIcon aria-hidden="true" />,
  },
};

const THIS_YEAR = new Date().getFullYear();

/** Where a person goes once the join call answered: straight in when verified, to the status page when it needs a person. */
function destination(slug: string, status: string): string {
  return status === "active" ? homePath(slug) : `/c/${slug}/pending`;
}

type FormProps = {
  slug: string;
  onJoined: (status: string) => Promise<void>;
};

function ErrorBanner({ error, requestId }: { error: string | null; requestId?: string }) {
  if (!error) return null;
  return (
    <div>
      <Banner variant="error">
        <p>{error}</p>
        {requestId ? (
          <p className="mt-1 text-sm text-ink-muted">Support code: {requestId}</p>
        ) : null}
      </Banner>
    </div>
  );
}

/** One attempt keeps one Idempotency-Key, so tapping twice or retrying after a dropped connection cannot join twice. */
function useAttempt() {
  const key = React.useRef<string | null>(null);
  return {
    get: () => (key.current ??= newIdempotencyKey()),
    reset: () => {
      key.current = null;
    },
  };
}

function InviteForm({ slug, onJoined }: FormProps) {
  const [code, setCode] = React.useState("");
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [requestId, setRequestId] = React.useState<string | undefined>();
  const attempt = useAttempt();

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (busy) return;
    const value = code.trim().toUpperCase();
    if (!value) {
      setError("Enter the invite code you were given.");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const result = await api.colleges.joinInvite(slug, value, attempt.get());
      attempt.reset();
      await onJoined(result.membership.status);
    } catch (caught) {
      if (!(caught instanceof ApiError && caught.isOffline)) attempt.reset();
      setError(friendlyMessage(caught, "We could not use that code. Please try again."));
      setRequestId(caught instanceof ApiError ? caught.requestId : undefined);
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} className="flex flex-col gap-5" noValidate>
      <FormField label="Invite code" help="Letters and numbers, as written on the invite." required>
        <Input
          name="invite"
          value={code}
          onChange={(event) => setCode(event.target.value.toUpperCase())}
          autoComplete="off"
          autoCapitalize="characters"
          spellCheck={false}
          className="font-mono uppercase tracking-widest"
          placeholder="ALPHA-2026"
        />
      </FormField>
      <ErrorBanner error={error} requestId={requestId} />
      <div>
        <Button type="submit" size="lg" disabled={busy}>
          {busy ? (
            <>
              <Spinner /> Joining
            </>
          ) : (
            <>
              Join with this code <ArrowRightIcon aria-hidden="true" />
            </>
          )}
        </Button>
      </div>
    </form>
  );
}

function EmailForm({ slug, onJoined }: FormProps) {
  const [step, setStep] = React.useState<"email" | "code">("email");
  const [email, setEmail] = React.useState("");
  const [code, setCode] = React.useState("");
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [emailError, setEmailError] = React.useState<string | null>(null);
  const [requestId, setRequestId] = React.useState<string | undefined>();
  const cooldown = useCooldown();

  function fail(caught: unknown, fallback: string) {
    setError(friendlyMessage(caught, fallback));
    setRequestId(caught instanceof ApiError ? caught.requestId : undefined);
  }

  async function send(event?: React.FormEvent) {
    event?.preventDefault();
    if (busy) return;
    if (!looksLikeEmail(email)) {
      setEmailError("Enter your college email address, for example name@college.edu.");
      return;
    }
    setEmailError(null);
    setError(null);
    setBusy(true);
    try {
      const sent = await api.colleges.emailStart(slug, email.trim());
      cooldown.start(sent.retry_after_seconds || 30);
      setCode("");
      setStep("code");
    } catch (caught) {
      fail(caught, "We could not send the code. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  async function complete(digits: string) {
    if (busy) return;
    setBusy(true);
    setError(null);
    try {
      const result = await api.colleges.emailComplete(slug, email.trim(), digits);
      await onJoined(result.membership.status);
    } catch (caught) {
      setCode("");
      fail(caught, "We could not check the code. Please try again.");
      setBusy(false);
    }
  }

  if (step === "code") {
    return (
      <form
        onSubmit={(event) => {
          event.preventDefault();
          if (code.length === 6) void complete(code);
        }}
        className="flex flex-col gap-5"
        noValidate
      >
        <p className="text-[15px] text-ink-muted">
          We sent a six digit code to{" "}
          <strong className="font-semibold text-ink">{email.trim()}</strong>.
        </p>
        <OtpInput
          label="Six digit code from your college email"
          value={code}
          onChange={setCode}
          onComplete={(digits) => void complete(digits)}
          disabled={busy}
          invalid={Boolean(error)}
          autoFocus
        />
        <ErrorBanner error={error} requestId={requestId} />
        <div className="flex flex-wrap items-center gap-3">
          <Button type="submit" size="lg" disabled={busy || code.length !== 6}>
            {busy ? (
              <>
                <Spinner /> Checking
              </>
            ) : (
              "Verify and join"
            )}
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="lg"
            disabled={busy || cooldown.remaining > 0}
            onClick={() => void send()}
          >
            {cooldown.remaining > 0 ? `Send again in ${cooldown.remaining}s` : "Send a new code"}
          </Button>
          <Button type="button" variant="ghost" size="lg" onClick={() => setStep("email")}>
            Change address
          </Button>
        </div>
      </form>
    );
  }

  return (
    <form onSubmit={send} className="flex flex-col gap-5" noValidate>
      <FormField
        label="College email address"
        help="It must end with your college's email domain."
        error={emailError ?? undefined}
        required
      >
        <Input
          type="email"
          name="college-email"
          inputMode="email"
          autoComplete="email"
          autoCapitalize="none"
          spellCheck={false}
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          placeholder="name@college.edu"
        />
      </FormField>
      <ErrorBanner error={error} requestId={requestId} />
      <div>
        <Button type="submit" size="lg" disabled={busy}>
          {busy ? (
            <>
              <Spinner /> Sending
            </>
          ) : (
            "Email me a code"
          )}
        </Button>
      </div>
    </form>
  );
}

function OpenForm({ slug, onJoined }: FormProps) {
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [requestId, setRequestId] = React.useState<string | undefined>();
  const attempt = useAttempt();

  async function join() {
    if (busy) return;
    setBusy(true);
    setError(null);
    try {
      const result = await api.colleges.joinOpen(slug, attempt.get());
      attempt.reset();
      await onJoined(result.membership.status);
    } catch (caught) {
      if (!(caught instanceof ApiError && caught.isOffline)) attempt.reset();
      setError(friendlyMessage(caught, "We could not join Global. Please try again."));
      setRequestId(caught instanceof ApiError ? caught.requestId : undefined);
      setBusy(false);
    }
  }

  return (
    <div className="flex flex-col gap-5">
      <ul className="glass-card divide-y divide-white/[0.07] rounded-[22px] px-4 text-[15px]">
        <li className="py-3">Find teammates and join projects and events open to everyone.</li>
        <li className="py-3">Track your own applications privately.</li>
        <li className="py-3">
          Your profile shows that you are{" "}
          <strong className="font-semibold">not verified by a college</strong>.
        </li>
      </ul>
      <ErrorBanner error={error} requestId={requestId} />
      <div>
        <Button size="lg" onClick={() => void join()} disabled={busy}>
          {busy ? (
            <>
              <Spinner /> Joining
            </>
          ) : (
            <>
              Join Global <ArrowRightIcon aria-hidden="true" />
            </>
          )}
        </Button>
      </div>
    </div>
  );
}

function ManualForm({ slug, onJoined }: FormProps) {
  const [enrollment, setEnrollment] = React.useState("");
  const [program, setProgram] = React.useState("");
  const [year, setYear] = React.useState("");
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [fields, setFields] = React.useState<Record<string, string>>({});
  const [requestId, setRequestId] = React.useState<string | undefined>();
  const attempt = useAttempt();

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (busy) return;
    const problems: Record<string, string> = {};
    if (enrollment.trim().length < 3) problems.enrollment_number = "Enter your enrolment number.";
    if (!program.trim()) problems.program = "Enter your course, for example B.Tech CSE.";
    const gradYear = Number(year);
    if (!Number.isInteger(gradYear) || gradYear < THIS_YEAR - 1 || gradYear > THIS_YEAR + 8) {
      problems.grad_year = `Enter the year you finish, between ${THIS_YEAR - 1} and ${THIS_YEAR + 8}.`;
    }
    setFields(problems);
    if (Object.keys(problems).length) return;

    setBusy(true);
    setError(null);
    try {
      const result = await api.colleges.joinManual(
        slug,
        { enrollment_number: enrollment.trim(), program: program.trim(), grad_year: gradYear },
        attempt.get(),
      );
      attempt.reset();
      await onJoined(result.membership.status);
    } catch (caught) {
      if (!(caught instanceof ApiError && caught.isOffline)) attempt.reset();
      if (caught instanceof ApiError && caught.code === "VALIDATION_FAILED") {
        setFields(caught.fieldErrors);
      }
      setError(friendlyMessage(caught, "We could not send your request. Please try again."));
      setRequestId(caught instanceof ApiError ? caught.requestId : undefined);
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} className="flex flex-col gap-5" noValidate>
      <FormField
        label="Enrolment number"
        help="Only an admin can match it. We store it scrambled."
        error={fields.enrollment_number}
        required
      >
        <Input
          name="enrollment"
          value={enrollment}
          onChange={(event) => setEnrollment(event.target.value)}
          autoComplete="off"
        />
      </FormField>
      <FormField label="Course" error={fields.program} required>
        <Input
          name="program"
          value={program}
          onChange={(event) => setProgram(event.target.value)}
          autoComplete="off"
          placeholder="B.Tech CSE"
        />
      </FormField>
      <FormField label="Year you finish" error={fields.grad_year} required>
        <Input
          name="grad-year"
          inputMode="numeric"
          value={year}
          onChange={(event) => setYear(event.target.value.replace(/\D/g, "").slice(0, 4))}
          autoComplete="off"
          placeholder={String(THIS_YEAR + 2)}
        />
      </FormField>
      <ErrorBanner error={error} requestId={requestId} />
      <div>
        <Button type="submit" size="lg" disabled={busy}>
          {busy ? (
            <>
              <Spinner /> Sending
            </>
          ) : (
            "Ask to join"
          )}
        </Button>
      </div>
    </form>
  );
}

export function JoinScreen({ slug }: { slug: string }) {
  const router = useRouter();
  const session = useSession();
  const context = useJoinContext(slug);

  const status = context.state === "ready" ? context.entry?.membership.status : undefined;
  const target =
    status && status !== "left" && status !== "rejected" ? destination(slug, status) : null;

  React.useEffect(() => {
    if (target) router.replace(target);
  }, [target, router]);

  const college = context.state === "ready" ? context.college : null;
  const methods = React.useMemo<Method[]>(
    () =>
      (["invite_code", "email_domain", "manual", "open"] as Method[]).filter((m) =>
        college?.allowed_methods.includes(m),
      ),
    [college],
  );
  const [chosen, setChosen] = React.useState<Method | null>(null);

  if (context.state !== "ready" || !college || target) {
    return <PublicStates context={context.state === "ready" ? { state: "loading" } : context} />;
  }

  const active: Method | undefined = chosen && methods.includes(chosen) ? chosen : methods[0];

  async function joined(newStatus: string) {
    await session.refresh();
    router.replace(destination(slug, newStatus));
  }

  return (
    <AuthFrame
      eyebrow="Join"
      title={`Join ${college.name}.`}
      intro={
        slug === GLOBAL_SLUG
          ? "Global is for every student, also if your college is not on StudentOS yet or has no college email. It is not checked by a college."
          : college.require_admin_approval
            ? "Your college checks every new member. You will see your campus as soon as an admin says yes."
            : "Pick the way your college gave you. You will see your campus as soon as it is checked."
      }
      footer={
        slug === GLOBAL_SLUG ? null : (
          <p>
            Your college is not here, or it has no college email?{" "}
            <Link
              href={`/c/${GLOBAL_SLUG}/join`}
              className="font-medium text-primary underline underline-offset-4"
            >
              Join Global instead
            </Link>
            .
          </p>
        )
      }
      college={{
        name: college.name,
        shortName: college.short_name,
        accentVars: accentVars(college.accent_hex),
      }}
    >
      {methods.length === 0 || !active ? (
        <Banner variant="info" title="Joining is not open yet">
          <p>
            Your college has not opened self sign up. Ask a college admin to add you, then come back
            to this page.
          </p>
        </Banner>
      ) : (
        <div className="flex flex-col gap-6">
          {methods.length > 1 ? (
            <div role="group" aria-label="How do you want to join" className="flex flex-col gap-2">
              {methods.map((method) => {
                const info = METHOD_LABEL[method];
                const selected = method === active;
                return (
                  <button
                    key={method}
                    type="button"
                    aria-pressed={selected}
                    onClick={() => setChosen(method)}
                    className={cn(
                      "flex min-h-14 items-center gap-3 rounded-card border px-4 py-2.5 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
                      selected
                        ? "border-primary bg-primary/5"
                        : "border-border bg-surface hover:border-border-strong",
                    )}
                  >
                    <span
                      className={cn("[&_svg]:size-5", selected ? "text-primary" : "text-ink-muted")}
                    >
                      {info.icon}
                    </span>
                    <span className="flex flex-col">
                      <span className="text-[14px] font-semibold text-ink">{info.label}</span>
                      <span className="text-[13px] text-ink-muted">{info.hint}</span>
                    </span>
                  </button>
                );
              })}
            </div>
          ) : null}
          <div key={active}>
            {active === "invite_code" ? <InviteForm slug={slug} onJoined={joined} /> : null}
            {active === "email_domain" ? <EmailForm slug={slug} onJoined={joined} /> : null}
            {active === "manual" ? <ManualForm slug={slug} onJoined={joined} /> : null}
            {active === "open" ? <OpenForm slug={slug} onJoined={joined} /> : null}
          </div>
        </div>
      )}
    </AuthFrame>
  );
}
