"use client";

import * as React from "react";
import Link from "next/link";
import {
  ArrowRightIcon,
  CheckIcon,
  ClipboardCheckIcon,
  LinkIcon,
  MailIcon,
  XIcon,
} from "lucide-react";
import { cn } from "cn";
import { Banner } from "@/components/ui/banner";
import { Button } from "@/components/ui/button";
import { FormField } from "@/components/ui/form-field";
import { Input } from "@/components/ui/input";
import { ChoiceCard } from "@/components/app/choice-card";
import { OtpInput } from "@/components/app/otp-input";
import { Spinner } from "@/components/app/spinner";
import { ApiError, friendlyMessage } from "@/lib/api-client";
import { api } from "@/lib/api/endpoints";
import { SessionProvider, useSession } from "@/features/session/session-provider";
import { AuthFrame } from "./auth-frame";

// A college admin makes their own space with a one-time code from the platform owner (decision D-30).
// Four steps: the code, the college, how students join, done. Everything is checked again by the server at the end.

type Step = "code" | "college" | "join" | "done";
type JoinMethod = "email" | "invite" | "approval";

const STEPS: Step[] = ["code", "college", "join", "done"];

/** A web address part from a college name: "Alpha Institute of Technology" becomes "alpha-institute-of-technology". */
export function slugFrom(name: string): string {
  return name
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40);
}

const DOMAIN = /^(?!-)[a-z0-9-]+(\.[a-z0-9-]+)+$/;

function Progress({ step }: { step: Step }) {
  const index = STEPS.indexOf(step);
  return (
    <ol className="mb-6 flex gap-1.5" aria-label={`Step ${index + 1} of ${STEPS.length}`}>
      {STEPS.map((item, i) => (
        <li
          key={item}
          aria-hidden="true"
          className={cn(
            "h-1 flex-1 rounded-full transition-colors duration-500",
            i <= index ? "bg-brand" : "bg-white/10",
          )}
        />
      ))}
    </ol>
  );
}

function SetupFlow() {
  const session = useSession();
  const [step, setStep] = React.useState<Step>("code");
  const [code, setCode] = React.useState("");
  const [name, setName] = React.useState("");
  const [shortName, setShortName] = React.useState("");
  const [slug, setSlug] = React.useState("");
  const [slugTouched, setSlugTouched] = React.useState(false);
  const [city, setCity] = React.useState("");
  const [state, setState] = React.useState("");
  const [domains, setDomains] = React.useState<string[]>([]);
  const [domainDraft, setDomainDraft] = React.useState("");
  const [method, setMethod] = React.useState<JoinMethod>("email");
  const [fields, setFields] = React.useState<Record<string, string>>({});
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [created, setCreated] = React.useState<{ slug: string } | null>(null);
  const [copied, setCopied] = React.useState(false);

  if (session.status === "loading") {
    return (
      <div className="flex min-h-dvh items-center justify-center text-ink-muted" role="status">
        <Spinner className="mr-3" /> Opening StudentOS
      </div>
    );
  }
  if (session.status === "signed-out") {
    return (
      <AuthFrame
        eyebrow="For colleges"
        title="Set up your campus"
        intro="Sign in first. Then enter the code the StudentOS team gave you to create your college space."
      >
        <Button asChild size="lg" className="h-12 w-full text-[15px]">
          <Link href="/signin?next=/setup">
            Sign in to continue <ArrowRightIcon aria-hidden="true" />
          </Link>
        </Button>
      </AuthFrame>
    );
  }

  function addDomain() {
    const value = domainDraft.trim().toLowerCase().replace(/^@/, "");
    if (!value) return true;
    if (!DOMAIN.test(value)) {
      setFields((f) => ({ ...f, domains: "Use a domain like alpha.edu" }));
      return false;
    }
    if (domains.length >= 5) {
      setFields((f) => ({ ...f, domains: "You can add up to 5 domains." }));
      return false;
    }
    setFields((f) => ({ ...f, domains: "" }));
    if (!domains.includes(value)) setDomains((d) => [...d, value]);
    setDomainDraft("");
    return true;
  }

  function onName(value: string) {
    setName(value);
    if (!slugTouched) setSlug(slugFrom(value));
  }

  function nextFromCollege(event: React.FormEvent) {
    event.preventDefault();
    const problems: Record<string, string> = {};
    if (name.trim().length < 3) problems.name = "Enter the college name.";
    if (!/^[a-z0-9-]{3,40}$/.test(slug))
      problems.slug = "Use 3 to 40 lowercase letters, digits or dashes.";
    if (shortName.length > 12) problems.short = "At most 12 characters.";
    if (domainDraft.trim() && !addDomain()) return;
    setFields(problems);
    if (Object.keys(problems).length) return;
    setStep("join");
  }

  async function create() {
    if (busy) return;
    setBusy(true);
    setError(null);
    try {
      const made = await api.colleges.setup({
        code,
        slug,
        name: name.trim(),
        ...(shortName.trim() ? { short_name: shortName.trim() } : {}),
        city: city.trim(),
        state: state.trim(),
        domains,
        join_method: method,
      });
      setCreated({ slug: made.slug });
      setStep("done");
    } catch (caught) {
      if (caught instanceof ApiError && caught.code === "FORBIDDEN") {
        setCode("");
        setStep("code");
        setError("That code did not work. Check it, or ask the StudentOS team for a new one.");
      } else if (caught instanceof ApiError && caught.code === "CONFLICT") {
        setStep("college");
        setFields({ slug: "That address is taken. Try another." });
      } else if (caught instanceof ApiError && caught.code === "VALIDATION_FAILED") {
        setStep("college");
        setFields(caught.fieldErrors);
        setError(friendlyMessage(caught, "Please check the college details."));
      } else {
        setError(friendlyMessage(caught, "We could not create the college. Please try again."));
      }
    } finally {
      setBusy(false);
    }
  }

  async function copyLink() {
    if (!created) return;
    try {
      await navigator.clipboard.writeText(`${window.location.origin}/c/${created.slug}`);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      // The browser blocked the clipboard. The link is shown on screen, so nothing is lost.
    }
  }

  if (step === "code") {
    return (
      <AuthFrame
        eyebrow="For colleges"
        title="Enter your setup code"
        intro="The StudentOS team gave you an 8 digit code. It creates a private space for your college and makes you its admin. It works once."
      >
        <Progress step={step} />
        <form
          onSubmit={(event) => {
            event.preventDefault();
            if (code.length === 8) setStep("college");
          }}
          className="flex flex-col gap-5"
        >
          <OtpInput
            label="Eight digit setup code"
            length={8}
            value={code}
            onChange={setCode}
            onComplete={() => setStep("college")}
            invalid={Boolean(error)}
            autoFocus
          />
          {error ? (
            <Banner variant="error">
              <p>{error}</p>
            </Banner>
          ) : null}
          <Button
            type="submit"
            size="lg"
            className="h-12 w-full text-[15px]"
            disabled={code.length !== 8}
          >
            Continue <ArrowRightIcon aria-hidden="true" />
          </Button>
          <p className="text-[13px] text-ink-muted">
            No code yet? Write to the StudentOS team and we will set up your college.
          </p>
        </form>
      </AuthFrame>
    );
  }

  if (step === "college") {
    return (
      <AuthFrame
        eyebrow="Step 2 of 4"
        title="About your college"
        intro="Students see this when they find your space."
      >
        <Progress step={step} />
        <form onSubmit={nextFromCollege} className="flex flex-col gap-4" noValidate>
          <FormField label="College name" error={fields.name} required>
            <Input
              value={name}
              onChange={(event) => onName(event.target.value)}
              maxLength={120}
              placeholder="Alpha Institute of Technology"
              autoFocus
            />
          </FormField>
          <div className="grid grid-cols-2 gap-3">
            <FormField label="Short name" error={fields.short}>
              <Input
                value={shortName}
                onChange={(event) => setShortName(event.target.value)}
                maxLength={12}
                placeholder="Alpha"
              />
            </FormField>
            <FormField label="City">
              <Input
                value={city}
                onChange={(event) => setCity(event.target.value)}
                maxLength={80}
              />
            </FormField>
          </div>
          <FormField label="State">
            <Input
              value={state}
              onChange={(event) => setState(event.target.value)}
              maxLength={80}
            />
          </FormField>
          <FormField
            label="Web address"
            help={`studentos.app/c/${slug || "your-college"}`}
            error={fields.slug}
            required
          >
            <Input
              value={slug}
              onChange={(event) => {
                setSlugTouched(true);
                setSlug(event.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ""));
              }}
              maxLength={40}
              autoCapitalize="none"
              spellCheck={false}
            />
          </FormField>
          <FormField
            label="College email domains"
            help="Students with these addresses can join. Press Enter to add one."
            error={fields.domains}
          >
            <div className="flex flex-col gap-2">
              {domains.length ? (
                <ul className="flex flex-wrap gap-2">
                  {domains.map((domain) => (
                    <li
                      key={domain}
                      className="inline-flex h-8 items-center gap-1.5 rounded-full border border-white/10 bg-white/[0.06] pl-3 pr-1.5 text-[13px] font-semibold"
                    >
                      @{domain}
                      <button
                        type="button"
                        aria-label={`Remove ${domain}`}
                        onClick={() => setDomains((d) => d.filter((x) => x !== domain))}
                        className="inline-flex size-5 items-center justify-center rounded-full outline-none hover:bg-white/15 focus-visible:ring-2 focus-visible:ring-ring"
                      >
                        <XIcon aria-hidden="true" className="size-3" />
                      </button>
                    </li>
                  ))}
                </ul>
              ) : null}
              <Input
                value={domainDraft}
                onChange={(event) => setDomainDraft(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter") {
                    event.preventDefault();
                    addDomain();
                  }
                }}
                autoCapitalize="none"
                spellCheck={false}
                placeholder="alpha.edu"
              />
            </div>
          </FormField>
          <div className="mt-2 flex gap-3">
            <Button type="button" variant="ghost" size="lg" onClick={() => setStep("code")}>
              Back
            </Button>
            <Button type="submit" size="lg" className="h-12 flex-1 text-[15px]">
              Continue <ArrowRightIcon aria-hidden="true" />
            </Button>
          </div>
        </form>
      </AuthFrame>
    );
  }

  if (step === "join") {
    return (
      <AuthFrame
        eyebrow="Step 3 of 4"
        title="How do students join?"
        intro="Pick the simplest rule that keeps your space private. You can change it later."
      >
        <Progress step={step} />
        <div className="flex flex-col gap-3">
          <div role="radiogroup" aria-label="How students join" className="flex flex-col gap-3">
            <ChoiceCard
              selected={method === "email"}
              onSelect={() => setMethod("email")}
              icon={<MailIcon aria-hidden="true" />}
              title="College email"
              text="Anyone with a college address joins after a code. Recommended."
            />
            <ChoiceCard
              selected={method === "invite"}
              onSelect={() => setMethod("invite")}
              icon={<LinkIcon aria-hidden="true" />}
              title="Invite link"
              text="Only people with your link can join."
            />
            <ChoiceCard
              selected={method === "approval"}
              onSelect={() => setMethod("approval")}
              icon={<ClipboardCheckIcon aria-hidden="true" />}
              title="Approve each student"
              text="You review every request. Best for small groups."
            />
          </div>
          {error ? (
            <Banner variant="error">
              <p>{error}</p>
            </Banner>
          ) : null}
          <div className="mt-2 flex gap-3">
            <Button type="button" variant="ghost" size="lg" onClick={() => setStep("college")}>
              Back
            </Button>
            <Button
              size="lg"
              className="h-12 flex-1 text-[15px]"
              onClick={() => void create()}
              disabled={busy}
            >
              {busy ? (
                <>
                  <Spinner /> Creating
                </>
              ) : (
                "Create my campus"
              )}
            </Button>
          </div>
        </div>
      </AuthFrame>
    );
  }

  return (
    <AuthFrame
      title={`${name.trim()} is live.`}
      intro="Your campus is private. Only your students and admins can see it."
    >
      <Progress step={step} />
      <div className="flex flex-col gap-4">
        <span className="bg-brand inline-flex size-10 items-center justify-center rounded-full text-white motion-safe:animate-[pop_0.5s_var(--spring)]">
          <CheckIcon aria-hidden="true" className="size-5" strokeWidth={2.6} />
        </span>
        <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4">
          <p className="text-[11.5px] font-semibold uppercase tracking-[0.1em] text-ink-muted">
            Student link
          </p>
          <div className="mt-2 flex items-center gap-2 rounded-xl border border-dashed border-white/20 bg-black/30 p-1.5 pl-3.5">
            <code className="min-w-0 flex-1 truncate text-[13.5px]">
              {typeof window === "undefined" ? "" : window.location.host}/c/{created?.slug}
            </code>
            <Button type="button" size="xs" variant="secondary" onClick={() => void copyLink()}>
              {copied ? "Copied" : "Copy"}
            </Button>
          </div>
        </div>
        <Button asChild size="lg" className="h-12 w-full text-[15px]">
          <Link href={`/c/${created?.slug}/admin`}>
            Open the admin console <ArrowRightIcon aria-hidden="true" />
          </Link>
        </Button>
      </div>
    </AuthFrame>
  );
}

export function SetupScreen() {
  return (
    <SessionProvider>
      <SetupFlow />
    </SessionProvider>
  );
}
