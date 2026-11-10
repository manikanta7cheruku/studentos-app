"use client";

import * as React from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { ArrowRightIcon, MailIcon } from "lucide-react";
import { Banner } from "@/components/ui/banner";
import { Button } from "@/components/ui/button";
import { FormField } from "@/components/ui/form-field";
import { Input } from "@/components/ui/input";
import { OtpInput } from "@/components/app/otp-input";
import { Spinner } from "@/components/app/spinner";
import { ApiError, friendlyMessage } from "@/lib/api-client";
import { api } from "@/lib/api/endpoints";
import { homeFor } from "@/features/session/session-provider";
import { AuthFrame } from "./auth-frame";
import { looksLikeEmail, safeNext } from "./safe-next";
import { useCooldown } from "./use-cooldown";

// Sign in with an email and a six digit code. No password. Two steps on one page: ask for the email, then the code.
// After the code is right the person goes to the address they were trying to open (`next`), or to their college.

type Step = "email" | "code";

const GOOGLE_ON = process.env.NEXT_PUBLIC_GOOGLE_SIGNIN === "enabled";
// Email codes are on unless an environment switches them off (until an email sender is set up). Then the email form
// is shown disabled with "Coming soon".
const EMAIL_ON = process.env.NEXT_PUBLIC_EMAIL_SIGNIN !== "disabled";

// What the server tells us in `?error=` after a Continue with Google that did not work.
const GOOGLE_ERRORS: Record<string, string> = {
  google_unavailable: "Google sign in is not available right now. Please try again later.",
  google_cancelled: "You cancelled the Google sign in. You can try again.",
  google_failed: "Google sign in did not work. Please try again.",
};

function GoogleMark() {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" className="size-5">
      <path
        fill="#4285F4"
        d="M23.5 12.27c0-.85-.08-1.67-.22-2.45H12v4.64h6.45a5.52 5.52 0 0 1-2.39 3.62v3h3.87c2.27-2.09 3.57-5.17 3.57-8.81Z"
      />
      <path
        fill="#34A853"
        d="M12 24c3.24 0 5.96-1.07 7.94-2.91l-3.87-3a7.2 7.2 0 0 1-10.72-3.78H1.35v3.09A12 12 0 0 0 12 24Z"
      />
      <path
        fill="#FBBC05"
        d="M5.35 14.31a7.2 7.2 0 0 1 0-4.62V6.6H1.35a12 12 0 0 0 0 10.8l4-3.09Z"
      />
      <path
        fill="#EA4335"
        d="M12 4.75c1.76 0 3.34.61 4.59 1.8l3.44-3.44A12 12 0 0 0 1.35 6.6l4 3.09A7.2 7.2 0 0 1 12 4.75Z"
      />
    </svg>
  );
}

export function SigninScreen() {
  const params = useSearchParams();
  const next = safeNext(params.get("next"));

  const [step, setStep] = React.useState<Step>("email");
  const googleError = GOOGLE_ERRORS[params.get("error") ?? ""] ?? null;
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

  async function sendCode(event?: React.FormEvent) {
    event?.preventDefault();
    if (busy) return;
    const address = email.trim();
    if (!looksLikeEmail(address)) {
      setEmailError("Enter your email address, for example name@college.edu.");
      return;
    }
    setEmailError(null);
    setError(null);
    setBusy(true);
    try {
      const sent = await api.auth.requestCode(address);
      cooldown.start(sent.retry_after_seconds || 30);
      setCode("");
      setStep("code");
    } catch (caught) {
      if (caught instanceof ApiError && caught.code === "VALIDATION_FAILED") {
        setEmailError("That does not look like an email address.");
      } else {
        fail(caught, "We could not send the code. Please try again.");
      }
    } finally {
      setBusy(false);
    }
  }

  async function verify(digits: string) {
    if (busy) return;
    setError(null);
    setBusy(true);
    try {
      await api.auth.verifyCode(email.trim(), digits);
      const colleges = await api.colleges.mine();
      // A full page load, not a client navigation: Next keeps the screens you left (including the college gate that
      // saw you signed out) alive in the background, and they would show the old answer for a moment.
      window.location.replace(next ?? homeFor(colleges));
    } catch (caught) {
      setCode("");
      fail(caught, "We could not check the code. Please try again.");
      setBusy(false);
    }
  }

  if (step === "code") {
    return (
      <AuthFrame
        eyebrow="Check your email"
        title="Enter the code we sent you."
        intro={
          <>
            We sent a six digit code to <strong className="font-semibold text-ink">{email}</strong>.
            It works for ten minutes.
          </>
        }
        footer={
          <p>
            Wrong address?{" "}
            <button
              type="button"
              onClick={() => {
                setStep("email");
                setError(null);
              }}
              className="min-h-11 font-medium text-primary underline underline-offset-4 hover:no-underline"
            >
              Use a different email
            </button>
          </p>
        }
      >
        <form
          onSubmit={(event) => {
            event.preventDefault();
            if (code.length === 6) void verify(code);
          }}
          className="flex flex-col gap-5"
          noValidate
        >
          <div className="flex flex-col gap-3">
            <span id="code-label" className="text-[13.5px] font-medium text-ink">
              Six digit code
            </span>
            <OtpInput
              label="Six digit code from your email"
              value={code}
              onChange={setCode}
              onComplete={(digits) => void verify(digits)}
              disabled={busy}
              invalid={Boolean(error)}
              describedBy={error ? "signin-error" : undefined}
              autoFocus
            />
          </div>
          {error ? (
            <div id="signin-error">
              <Banner variant="error">
                <p>{error}</p>
                {requestId ? (
                  <p className="mt-1 text-sm text-ink-muted">Support code: {requestId}</p>
                ) : null}
              </Banner>
            </div>
          ) : null}
          <div className="flex flex-wrap items-center gap-3">
            <Button type="submit" size="lg" disabled={busy || code.length !== 6}>
              {busy ? (
                <>
                  <Spinner /> Checking
                </>
              ) : (
                <>
                  Sign in <ArrowRightIcon aria-hidden="true" />
                </>
              )}
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="lg"
              disabled={busy || cooldown.remaining > 0}
              onClick={() => void sendCode()}
            >
              {cooldown.remaining > 0 ? `Send again in ${cooldown.remaining}s` : "Send a new code"}
            </Button>
          </div>
        </form>
      </AuthFrame>
    );
  }

  return (
    <AuthFrame
      eyebrow="Sign in"
      title="Sign in to your college."
      intro={
        EMAIL_ON
          ? "Use your email address. We will send you a code, so there is no password to remember. New here? The same steps create your account."
          : "Sign in with your Google account. There is no password to remember. New here? The same step creates your account."
      }
      footer={
        <p>
          By continuing you agree to the{" "}
          <Link href="/terms" className="font-medium text-primary underline underline-offset-4">
            terms
          </Link>{" "}
          and the{" "}
          <Link href="/privacy" className="font-medium text-primary underline underline-offset-4">
            privacy policy
          </Link>
          .
        </p>
      }
    >
      {GOOGLE_ON ? (
        <div className="mb-6 flex flex-col gap-5">
          <Button asChild variant="outline" size="lg" className="w-full sm:w-auto">
            <a href={`/api/v1/auth/google${next ? `?next=${encodeURIComponent(next)}` : ""}`}>
              <GoogleMark /> Continue with Google
            </a>
          </Button>
          <p className="flex items-center gap-3 text-[13px] text-ink-muted">
            <span aria-hidden="true" className="h-px flex-1 bg-border" />
            {EMAIL_ON ? "or use your email" : "or"}
            <span aria-hidden="true" className="h-px flex-1 bg-border" />
          </p>
        </div>
      ) : null}
      {googleError ? (
        <div className="mb-5">
          <Banner variant="error">
            <p>{googleError}</p>
          </Banner>
        </div>
      ) : null}
      {EMAIL_ON ? null : (
        <div
          aria-disabled="true"
          className="flex flex-col gap-4 rounded-card border border-dashed border-border-strong p-5"
        >
          <p className="flex flex-wrap items-center gap-2 text-[15px] font-semibold text-ink">
            Sign in with an email code
            <span className="rounded-full bg-accent-soft px-2.5 py-0.5 text-[12px] font-semibold text-ink-muted">
              Coming soon
            </span>
          </p>
          <FormField label="Email address" help="Not available yet. Please use Google for now.">
            <Input type="email" disabled placeholder="name@college.edu" />
          </FormField>
          <div>
            <Button type="button" size="lg" disabled className="w-full sm:w-auto">
              <MailIcon aria-hidden="true" /> Email me a code
            </Button>
          </div>
        </div>
      )}
      {EMAIL_ON ? (
        <form onSubmit={sendCode} className="flex flex-col gap-5" noValidate>
          <FormField
            label="Email address"
            help="Your college email works best. Any email you can open is fine."
            error={emailError ?? undefined}
            required
          >
            <Input
              type="email"
              name="email"
              inputMode="email"
              autoComplete="email"
              autoCapitalize="none"
              spellCheck={false}
              autoFocus
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="name@college.edu"
            />
          </FormField>
          {error ? (
            <div>
              <Banner variant="error">
                <p>{error}</p>
                {requestId ? (
                  <p className="mt-1 text-sm text-ink-muted">Support code: {requestId}</p>
                ) : null}
              </Banner>
            </div>
          ) : null}
          <div>
            <Button type="submit" size="lg" disabled={busy} className="w-full sm:w-auto">
              {busy ? (
                <>
                  <Spinner /> Sending
                </>
              ) : (
                <>
                  <MailIcon aria-hidden="true" /> Email me a code
                </>
              )}
            </Button>
          </div>
        </form>
      ) : null}
    </AuthFrame>
  );
}
