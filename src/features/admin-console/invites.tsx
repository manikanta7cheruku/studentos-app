"use client";

import * as React from "react";
import { CheckIcon, CopyIcon } from "lucide-react";
import { Banner } from "@/components/ui/banner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { FormField } from "@/components/ui/form-field";
import { Input } from "@/components/ui/input";
import { LoadError } from "@/components/app/load-error";
import { Spinner } from "@/components/app/spinner";
import { ApiError, friendlyMessage } from "@/lib/api-client";
import { api, type AdminInvite } from "@/lib/api/endpoints";
import { useAttempt } from "@/lib/use-attempt";
import { useLoad } from "@/lib/use-load";
import { useCollege } from "@/features/college";
import { dateInputOffset, deadlineFromDate } from "@/features/collaborate/labels";
import { ConsolePage, EmptyNote, ListSkeleton } from "./admin-shell";

const STATUS_WORDS: Record<string, string> = {
  active: "In use",
  exhausted: "All uses taken",
  expired: "Expired",
  revoked: "Revoked",
};

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = React.useState(false);
  return (
    <Button
      variant="outline"
      onClick={() => {
        void navigator.clipboard?.writeText(text).then(() => setCopied(true));
      }}
    >
      {copied ? <CheckIcon aria-hidden="true" /> : <CopyIcon aria-hidden="true" />}
      {copied ? "Copied" : "Copy the code"}
    </Button>
  );
}

function NewInvite({ onCreated }: { onCreated: (code: string | null) => void }) {
  const { slug } = useCollege();
  const attempt = useAttempt();
  const [label, setLabel] = React.useState("");
  const [uses, setUses] = React.useState("20");
  const [expires, setExpires] = React.useState(dateInputOffset(14));
  const [grants, setGrants] = React.useState<"active" | "pending">("active");
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [fields, setFields] = React.useState<Record<string, string>>({});

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (busy) return;
    const problems: Record<string, string> = {};
    if (!label.trim())
      problems.label = "Give it a name you will recognise, for example CSE batch 2027.";
    const max = Number(uses);
    if (!Number.isInteger(max) || max < 1 || max > 1000) problems.max_uses = "Between 1 and 1000.";
    if (!expires || expires <= dateInputOffset(0))
      problems.expires_at = "Pick a day in the future.";
    setFields(problems);
    if (Object.keys(problems).length) return;
    setBusy(true);
    setError(null);
    try {
      const result = await api.admin.createInvite(
        slug,
        {
          label: label.trim(),
          max_uses: max,
          expires_at: deadlineFromDate(expires)!,
          grants_status: grants,
        },
        attempt.get(),
      );
      attempt.reset();
      setLabel("");
      onCreated(result.code);
    } catch (caught) {
      if (!(caught instanceof ApiError && caught.isOffline)) attempt.reset();
      if (caught instanceof ApiError && caught.code === "VALIDATION_FAILED")
        setFields(caught.fieldErrors);
      setError(friendlyMessage(caught, "We could not create the code. Please try again."));
    } finally {
      setBusy(false);
    }
  }

  return (
    <form
      onSubmit={submit}
      className="flex max-w-xl flex-col gap-5 glass-card rounded-[22px] p-5"
      noValidate
    >
      <h2 className="text-[18px] font-semibold">New invite code</h2>
      <FormField label="Name" help="Only you see it." error={fields.label} required>
        <Input
          value={label}
          onChange={(e) => setLabel(e.target.value)}
          maxLength={80}
          placeholder="CSE batch 2027"
        />
      </FormField>
      <div className="grid gap-5 sm:grid-cols-2">
        <FormField label="How many people can use it" error={fields.max_uses} required>
          <Input
            inputMode="numeric"
            value={uses}
            onChange={(e) => setUses(e.target.value.replace(/\D/g, "").slice(0, 4))}
          />
        </FormField>
        <FormField label="Valid until" error={fields.expires_at} required>
          <Input
            type="date"
            value={expires}
            min={dateInputOffset(1)}
            onChange={(e) => setExpires(e.target.value)}
          />
        </FormField>
      </div>
      <fieldset className="flex flex-col gap-2">
        <legend className="text-[15px] font-medium">What happens when someone uses it</legend>
        {(
          [
            ["active", "They join at once"],
            ["pending", "They wait for an admin to approve"],
          ] as const
        ).map(([value, text]) => (
          <label key={value} className="flex min-h-11 items-center gap-3 text-[16px]">
            <input
              type="radio"
              name="grants"
              checked={grants === value}
              onChange={() => setGrants(value)}
              className="size-5 accent-[var(--primary)]"
            />
            {text}
          </label>
        ))}
      </fieldset>
      {error ? (
        <Banner variant="error">
          <p>{error}</p>
        </Banner>
      ) : null}
      <div>
        <Button type="submit" size="lg" disabled={busy}>
          {busy ? <Spinner /> : null} Create the code
        </Button>
      </div>
    </form>
  );
}

function InviteRow({ item, onChanged }: { item: AdminInvite; onChanged: () => void }) {
  const { slug } = useCollege();
  const [confirm, setConfirm] = React.useState(false);
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  async function revoke() {
    setBusy(true);
    setError(null);
    try {
      await api.admin.revokeInvite(slug, item.id);
      setConfirm(false);
      onChanged();
    } catch (caught) {
      setError(friendlyMessage(caught, "We could not revoke it. Please try again."));
    } finally {
      setBusy(false);
    }
  }

  return (
    <li className="flex flex-col gap-2 py-4 sm:flex-row sm:items-center sm:justify-between sm:gap-6">
      <div className="min-w-0">
        <p className="text-[17px] font-semibold">{item.label}</p>
        <p className="tabular text-[14px] text-ink-muted">
          {STATUS_WORDS[item.status] ?? item.status} · {item.used_count} of {item.max_uses} used ·
          until{" "}
          {new Date(item.expires_at).toLocaleDateString(undefined, {
            day: "numeric",
            month: "short",
            year: "numeric",
          })}{" "}
          · {item.grants_status === "active" ? "joins at once" : "needs approval"}
        </p>
      </div>
      {item.status === "active" ? (
        <>
          <Button variant="ghost" onClick={() => setConfirm(true)}>
            Revoke
          </Button>
          <Dialog open={confirm} onOpenChange={(open) => !busy && setConfirm(open)}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Revoke &ldquo;{item.label}&rdquo;?</DialogTitle>
                <DialogDescription>
                  No one can use this code anymore. People who already joined stay.
                </DialogDescription>
              </DialogHeader>
              {error ? (
                <Banner variant="error">
                  <p>{error}</p>
                </Banner>
              ) : null}
              <DialogFooter>
                <Button variant="ghost" onClick={() => setConfirm(false)} disabled={busy}>
                  Keep it
                </Button>
                <Button variant="destructive" onClick={() => void revoke()} disabled={busy}>
                  {busy ? <Spinner /> : null} Revoke
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </>
      ) : null}
    </li>
  );
}

/** Invite codes: make one, copy it once, revoke it. The code is shown only when it is created. */
export function InvitesScreen() {
  const { slug } = useCollege();
  const state = useLoad(() => api.admin.invites(slug), [slug]);
  const [fresh, setFresh] = React.useState<string | null>(null);

  return (
    <ConsolePage
      title="Invite codes"
      description="Give a code to students of one batch or club. Each code has a limit and an end date."
    >
      {fresh ? (
        <Banner variant="success" title="Your new code">
          <p className="mt-1 break-all font-mono text-[22px] font-semibold tracking-widest">
            {fresh}
          </p>
          <p className="mt-2 text-[15px]">
            Copy it now. For safety we keep only a scrambled version, so it cannot be shown again.
          </p>
          <div className="mt-3">
            <CopyButton text={fresh} />
          </div>
        </Banner>
      ) : null}
      <NewInvite
        onCreated={(code) => {
          setFresh(code);
          state.reload();
        }}
      />
      {state.status === "loading" ? (
        <ListSkeleton />
      ) : state.status === "error" ? (
        <LoadError error={state.error} onRetry={state.reload} what="the invite codes" />
      ) : state.data.length === 0 ? (
        <EmptyNote>No invite codes yet. Make one above and share it with your students.</EmptyNote>
      ) : (
        <ul className="glass-card divide-y divide-white/[0.07] rounded-[22px] px-4">
          {state.data.map((item) => (
            <InviteRow key={item.id} item={item} onChanged={state.reload} />
          ))}
        </ul>
      )}
    </ConsolePage>
  );
}
