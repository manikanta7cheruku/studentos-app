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

export function SigninScreen() {
  const params = useSearchParams();
  const next = safeNext(params.get("next"));

  const [step, setStep] = React.useState<Step>("email");
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
            <span id="code-label" className="text-[15px] font-medium text-ink">
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
      intro="Use your email address. We will send you a code, so there is no password to remember. New here? The same steps create your account."
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
    </AuthFrame>
  );
}
