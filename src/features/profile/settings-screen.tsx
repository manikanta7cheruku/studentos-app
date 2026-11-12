"use client";

import * as React from "react";
import Link from "next/link";
import { ChevronRightIcon, MessageSquareIcon } from "lucide-react";
import { Avatar } from "@/components/app/avatar";
import { Banner } from "@/components/ui/banner";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { LoadError } from "@/components/app/load-error";
import { OtpInput } from "@/components/app/otp-input";
import { PageHeader } from "@/components/app/page-header";
import { Spinner } from "@/components/app/spinner";
import { ApiError, friendlyMessage } from "@/lib/api-client";
import { api, type BlockedPerson } from "@/lib/api/endpoints";
import { useLoad } from "@/lib/use-load";
import { GLOBAL_SLUG, homePath } from "@/lib/home-path";
import { useCollege } from "@/features/college";
import { useSession } from "@/features/session/session-provider";

function Group({
  id,
  title,
  text,
  children,
}: {
  id: string;
  title: string;
  text?: string;
  children: React.ReactNode;
}) {
  return (
    <section aria-labelledby={id} className="flex flex-col gap-2.5">
      <div className="px-1">
        <h2
          id={id}
          className="text-[12px] font-semibold uppercase tracking-[0.08em] text-ink-muted"
        >
          {title}
        </h2>
        {text ? <p className="mt-0.5 text-[13px] text-ink-muted">{text}</p> : null}
      </div>
      <div className="glass-card divide-y divide-white/[0.07] rounded-[22px] px-4">{children}</div>
    </section>
  );
}

function Row({
  title,
  children,
  action,
}: {
  title: string;
  children: React.ReactNode;
  action: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-3 py-4 sm:flex-row sm:items-center sm:justify-between sm:gap-8">
      <div className="max-w-prose">
        <h3 className="text-[15px] font-semibold">{title}</h3>
        <div className="mt-0.5 text-[13.5px] leading-relaxed text-ink-muted">{children}</div>
      </div>
      <div className="shrink-0">{action}</div>
    </div>
  );
}

function Choice({
  checked,
  onChange,
  label,
  help,
  disabled,
}: {
  checked: boolean;
  onChange: (next: boolean) => void;
  label: string;
  help: string;
  disabled?: boolean;
}) {
  const id = React.useId();
  return (
    <div className="flex min-h-14 items-center justify-between gap-4 py-2.5">
      <label htmlFor={id} className="min-w-0 flex-1 text-[14px] leading-snug">
        <span className="block font-medium text-ink">{label}</span>
        <span className="block text-[13px] text-ink-muted">{help}</span>
      </label>
      <Switch
        id={id}
        checked={checked}
        disabled={disabled}
        onCheckedChange={(value) => onChange(value === true)}
      />
    </div>
  );
}

function PrivacySection() {
  const state = useLoad(async () => {
    const [profile, reminders] = await Promise.all([api.profile.get(), api.reminders.get()]);
    return { profile, reminders };
  }, []);
  const [override, setOverride] = React.useState<{
    visible?: boolean;
    portfolio?: boolean;
    reminders?: boolean;
    phone?: boolean;
  }>({});
  const [, setBusy] = React.useState<string | null>(null);
  const [message, setMessage] = React.useState<string>("");
  const [error, setError] = React.useState<string | null>(null);

  if (state.status === "loading")
    return (
      <div aria-busy="true" className="flex flex-col gap-3 py-6">
        <Skeleton className="h-11 w-2/3" />
        <Skeleton className="h-11 w-1/2" />
      </div>
    );
  if (state.status === "error")
    return <LoadError error={state.error} onRetry={state.reload} what="your settings" />;

  const visible = override.visible ?? state.data.profile.visibility === "college";
  const portfolio = override.portfolio ?? state.data.profile.portfolio_public;
  const reminders = override.reminders ?? state.data.reminders.enabled;
  const phoneShared = override.phone ?? state.data.profile.phone_visibility === "hosts";

  async function run(key: string, done: string, call: () => Promise<unknown>, undo: () => void) {
    setBusy(key);
    setError(null);
    setMessage("");
    try {
      await call();
      setMessage(done);
    } catch (caught) {
      undo();
      setError(friendlyMessage(caught, "We could not save that. Please try again."));
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="flex flex-col gap-2">
      <Group id="privacy" title="Privacy and reminders">
        <Choice
          checked={visible}
          label="Show my profile to my college"
          help="Verified members can find you in People. Turn it off to hide your profile from everyone."
          onChange={(next) => {
            setOverride((o) => ({ ...o, visible: next }));
            void run(
              "visible",
              next ? "Your profile is visible to your college." : "Your profile is hidden.",
              () => api.profile.patch({ visibility: next ? "college" : "hidden" }),
              () => setOverride((o) => ({ ...o, visible: !next })),
            );
          }}
        />
        <Choice
          checked={portfolio}
          label="Let my portfolio be public"
          help="Anyone with the link can see the portfolio you build later. Off by default."
          onChange={(next) => {
            setOverride((o) => ({ ...o, portfolio: next }));
            void run(
              "portfolio",
              next ? "Your portfolio can be public." : "Your portfolio is private.",
              () => api.profile.patch({ portfolio_public: next }),
              () => setOverride((o) => ({ ...o, portfolio: !next })),
            );
          }}
        />
        {state.data.profile.phone ? (
          <Choice
            checked={phoneShared}
            label="Share my number with plan hosts"
            help="The host of a plan you join sees it until a day after the plan. Never on your profile."
            onChange={(next) => {
              setOverride((o) => ({ ...o, phone: next }));
              void run(
                "phone",
                next ? "Hosts of plans you join can see your number." : "Your number is hidden.",
                () => api.profile.patch({ phone_visibility: next ? "hosts" : "hidden" }),
                () => setOverride((o) => ({ ...o, phone: !next })),
              );
            }}
          />
        ) : null}
        <Choice
          checked={reminders}
          label="Remind me before a saved deadline"
          help="A notification 48 hours before the deadline of an opportunity you saved."
          onChange={(next) => {
            setOverride((o) => ({ ...o, reminders: next }));
            void run(
              "reminders",
              next ? "Deadline reminders are on." : "Deadline reminders are off.",
              () => api.reminders.set(next),
              () => setOverride((o) => ({ ...o, reminders: !next })),
            );
          }}
        />
      </Group>
      <p role="status" className="min-h-5 px-1 text-[13px] text-ink-muted">
        {message}
      </p>
      {error ? (
        <Banner variant="error">
          <p>{error}</p>
        </Banner>
      ) : null}
    </div>
  );
}

function LeaveCollege() {
  const { slug, college } = useCollege();
  const [open, setOpen] = React.useState(false);
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  async function leave() {
    setBusy(true);
    setError(null);
    try {
      await api.colleges.leave(slug);
      window.location.replace("/find");
    } catch (caught) {
      setError(friendlyMessage(caught, "We could not do that. Please try again."));
      setBusy(false);
    }
  }

  return (
    <>
      <Row
        title="Leave this college"
        action={
          <Button variant="outline" onClick={() => setOpen(true)}>
            Leave {college.short_name || college.name}
          </Button>
        }
      >
        You lose access to {college.name}. Your profile stays on your account, and you can join
        again with a new invite or email.
      </Row>
      <Dialog open={open} onOpenChange={(next) => !busy && setOpen(next)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Leave {college.name}?</DialogTitle>
            <DialogDescription>
              You will no longer see this campus, its teams or its announcements.
            </DialogDescription>
          </DialogHeader>
          {error ? (
            <Banner variant="error">
              <p>{error}</p>
            </Banner>
          ) : null}
          <DialogFooter>
            <Button variant="ghost" onClick={() => setOpen(false)} disabled={busy}>
              Stay
            </Button>
            <Button variant="destructive" onClick={() => void leave()} disabled={busy}>
              {busy ? <Spinner /> : null} Leave college
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

function DeleteAccount() {
  const session = useSession();
  const [open, setOpen] = React.useState(false);
  const [step, setStep] = React.useState<"ask" | "code">("ask");
  const [code, setCode] = React.useState("");
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  function close(next: boolean) {
    if (busy) return;
    setOpen(next);
    if (!next) {
      setStep("ask");
      setCode("");
      setError(null);
    }
  }

  async function request() {
    setBusy(true);
    setError(null);
    try {
      await api.account.requestDeletion();
      setStep("code");
    } catch (caught) {
      setError(
        caught instanceof ApiError && caught.code === "CONFLICT"
          ? "You are the only admin of a college. Make someone else an admin first."
          : friendlyMessage(caught, "We could not send the code. Please try again."),
      );
    } finally {
      setBusy(false);
    }
  }

  async function confirm(digits: string) {
    if (busy || digits.length !== 6) return;
    setBusy(true);
    setError(null);
    try {
      await api.account.confirmDeletion(digits);
      await session.signOut();
    } catch (caught) {
      setCode("");
      setError(friendlyMessage(caught, "We could not delete the account. Please try again."));
      setBusy(false);
    }
  }

  return (
    <>
      <Row
        title="Delete my account"
        action={
          <Button variant="destructive" onClick={() => setOpen(true)}>
            Delete account
          </Button>
        }
      >
        This removes your account and everything you added: profile, skills, saved opportunities and
        applications. It cannot be undone. We email you a code first to be sure it is you.
      </Row>
      <Dialog open={open} onOpenChange={close}>
        <DialogContent>
          {step === "ask" ? (
            <>
              <DialogHeader>
                <DialogTitle>Delete your account for good?</DialogTitle>
                <DialogDescription>
                  Everything you added is removed and cannot be brought back. We will email a six
                  digit code to your address to confirm.
                </DialogDescription>
              </DialogHeader>
              {error ? (
                <Banner variant="error">
                  <p>{error}</p>
                </Banner>
              ) : null}
              <DialogFooter>
                <Button variant="ghost" onClick={() => close(false)} disabled={busy}>
                  Keep my account
                </Button>
                <Button variant="destructive" onClick={() => void request()} disabled={busy}>
                  {busy ? <Spinner /> : null} Email me the code
                </Button>
              </DialogFooter>
            </>
          ) : (
            <>
              <DialogHeader>
                <DialogTitle>Enter the code to delete</DialogTitle>
                <DialogDescription>
                  We sent a six digit code to your email. When you enter it, your account is deleted
                  at once.
                </DialogDescription>
              </DialogHeader>
              <OtpInput
                label="Six digit code from your email"
                value={code}
                onChange={setCode}
                onComplete={(digits) => void confirm(digits)}
                disabled={busy}
                invalid={Boolean(error)}
                autoFocus
              />
              {error ? (
                <Banner variant="error">
                  <p>{error}</p>
                </Banner>
              ) : null}
              <DialogFooter>
                <Button variant="ghost" onClick={() => close(false)} disabled={busy}>
                  Cancel
                </Button>
                <Button
                  variant="destructive"
                  onClick={() => void confirm(code)}
                  disabled={busy || code.length !== 6}
                >
                  {busy ? <Spinner /> : null} Delete my account
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}

function SignOutRow() {
  const session = useSession();
  const [busy, setBusy] = React.useState(false);
  return (
    <Row
      title="Sign out"
      action={
        <Button
          variant="outline"
          disabled={busy}
          onClick={async () => {
            setBusy(true);
            await session.signOut();
          }}
        >
          {busy ? <Spinner /> : null} Sign out
        </Button>
      }
    >
      End your session on this device.
    </Row>
  );
}

function SpacesSection() {
  const { slug } = useCollege();
  const session = useSession();
  const spaces = session.colleges.filter((item) => item.membership.status === "active");
  const inGlobal = spaces.some((item) => item.college.slug === GLOBAL_SLUG);
  return (
    <div className="flex flex-col gap-2">
      <Group id="spaces" title="Your spaces">
        {spaces.map((item) => {
          const current = item.college.slug === slug;
          return (
            <div
              key={item.college.slug}
              className="flex min-h-14 items-center justify-between gap-4 py-2"
            >
              <span className="text-[15px] font-medium">
                {item.college.slug === GLOBAL_SLUG ? "Global" : item.college.name}
                {current ? (
                  <span className="ml-2 text-[13px] font-normal text-ink-muted">you are here</span>
                ) : null}
              </span>
              {current ? null : (
                <Button asChild variant="outline">
                  <Link href={homePath(item.college.slug)}>Open</Link>
                </Button>
              )}
            </div>
          );
        })}
      </Group>
      {inGlobal ? null : (
        <p className="text-[13.5px] text-ink-muted">
          Not in Global yet. It is open to every student, with no college email needed.{" "}
          <Link
            href={`/c/${GLOBAL_SLUG}/join`}
            className="font-medium text-primary underline underline-offset-4"
          >
            Join Global
          </Link>
        </p>
      )}
    </div>
  );
}

function BlockedSection() {
  const state = useLoad(() => api.blocks.list(), []);
  const [freed, setFreed] = React.useState<string[]>([]);
  const [busy, setBusy] = React.useState<string | null>(null);
  const [error, setError] = React.useState<string | null>(null);

  async function unblock(person: BlockedPerson) {
    setBusy(person.user_id);
    setError(null);
    try {
      await api.blocks.unblock(person.user_id);
      setFreed((current) => [...current, person.user_id]);
    } catch (caught) {
      setError(friendlyMessage(caught, "We could not unblock them. Please try again."));
    } finally {
      setBusy(null);
    }
  }

  const people =
    state.status === "ready" ? state.data.filter((p) => !freed.includes(p.user_id)) : [];
  return (
    <div className="flex flex-col gap-2">
      <Group
        id="blocked"
        title="Blocked people"
        text="They cannot message you. Unblock to let them again."
      >
        {state.status === "loading" ? (
          <div aria-busy="true" className="py-4">
            <Skeleton className="h-10 w-2/3" />
          </div>
        ) : state.status === "error" ? (
          <div className="py-3">
            <LoadError error={state.error} onRetry={state.reload} what="your blocked list" />
          </div>
        ) : people.length === 0 ? (
          <p className="py-4 text-[14px] text-ink-muted">You have not blocked anyone.</p>
        ) : (
          people.map((person) => (
            <div
              key={person.user_id}
              className="flex min-h-14 items-center justify-between gap-3 py-2"
            >
              <span className="flex min-w-0 items-center gap-3">
                <Avatar name={person.display_name} src={person.avatar_url} size="sm" />
                <span className="truncate text-[15px] font-medium">{person.display_name}</span>
              </span>
              <Button
                variant="outline"
                size="sm"
                disabled={busy === person.user_id}
                onClick={() => void unblock(person)}
                aria-label={`Unblock ${person.display_name}`}
              >
                {busy === person.user_id ? <Spinner /> : null} Unblock
              </Button>
            </div>
          ))
        )}
      </Group>
      {error ? (
        <Banner variant="error">
          <p>{error}</p>
        </Banner>
      ) : null}
    </div>
  );
}

function HelpSection() {
  const { slug } = useCollege();
  return (
    <Group id="help" title="Help">
      <Link
        href={`/c/${slug}/feedback`}
        className="flex min-h-14 items-center justify-between gap-3 py-2 outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        <span className="flex items-center gap-3">
          <MessageSquareIcon aria-hidden="true" className="size-5 text-ink-muted" />
          <span>
            <span className="block text-[15px] font-medium">Send feedback</span>
            <span className="block text-[13px] text-ink-muted">
              A bug, an idea, or something that confused you.
            </span>
          </span>
        </span>
        <ChevronRightIcon aria-hidden="true" className="size-4 text-ink-muted" />
      </Link>
    </Group>
  );
}

export function SettingsScreen() {
  const { slug } = useCollege();
  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-7 px-5 pt-4 pb-2 md:px-8 md:py-8">
      <PageHeader
        title="Settings"
        description="Who sees you, what we remind you about, and your account."
        back={{ href: `/c/${slug}/me`, label: "My profile" }}
      />
      <PrivacySection />
      <BlockedSection />
      <SpacesSection />
      <HelpSection />
      <Group id="account" title="Account">
        <SignOutRow />
        <LeaveCollege />
        <DeleteAccount />
      </Group>
    </div>
  );
}
