"use client";

import * as React from "react";
import { CheckIcon, CopyIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Spinner } from "@/components/app/spinner";
import type { OwnerActionState } from "@/app/owner/actions";

/**
 * A form that changes something. It always asks for the owner PIN again, even though the dashboard is unlocked, so a
 * screen left open cannot change a college, a code or an account. The answer (an error, a done line, or a new code)
 * shows under the button.
 */
export function ConfirmForm({
  action,
  hidden = {},
  submitLabel,
  danger = false,
  children,
}: {
  action: (previous: OwnerActionState, form: FormData) => Promise<OwnerActionState>;
  hidden?: Record<string, string>;
  submitLabel: string;
  danger?: boolean;
  children?: React.ReactNode;
}) {
  const [state, formAction, pending] = React.useActionState(action, null);
  const [copied, setCopied] = React.useState(false);
  const pinId = React.useId();

  async function copy() {
    if (!state?.code) return;
    try {
      await navigator.clipboard.writeText(state.code);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1800);
    } catch {
      // The code is on the screen, so it can be copied by hand.
    }
  }

  return (
    <form action={formAction} className="flex flex-col gap-3">
      {Object.entries(hidden).map(([name, value]) => (
        <input key={name} type="hidden" name={name} value={value} />
      ))}
      {children}
      <div className="flex flex-col gap-1.5">
        <label htmlFor={pinId} className="text-[12.5px] font-semibold text-ink-muted">
          Owner PIN to confirm
        </label>
        <Input
          id={pinId}
          name="pin"
          type="password"
          autoComplete="off"
          spellCheck={false}
          required
          className="max-w-xs"
        />
      </div>
      <div className="flex flex-wrap items-center gap-3">
        <Button type="submit" variant={danger ? "destructive" : "default"} disabled={pending}>
          {pending ? <Spinner /> : null} {submitLabel}
        </Button>
        {state?.error ? (
          <p role="alert" className="text-[13.5px] text-danger">
            {state.error}
          </p>
        ) : null}
        {state?.ok && !state.code ? (
          <p role="status" className="text-[13.5px] text-success">
            {state.ok}
          </p>
        ) : null}
      </div>
      {state?.code ? (
        <div role="status" className="rounded-2xl border border-white/15 bg-white/[0.06] p-4">
          <p className="text-[13px] text-ink-muted">{state.ok}</p>
          <div className="mt-2 flex items-center gap-3">
            <code className="font-heading text-[1.8rem] font-extrabold tracking-[0.2em]">
              {state.code}
            </code>
            <Button type="button" variant="secondary" size="sm" onClick={() => void copy()}>
              {copied ? <CheckIcon aria-hidden="true" /> : <CopyIcon aria-hidden="true" />}
              {copied ? "Copied" : "Copy"}
            </Button>
          </div>
        </div>
      ) : null}
    </form>
  );
}
