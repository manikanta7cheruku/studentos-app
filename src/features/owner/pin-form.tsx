"use client";

import * as React from "react";
import { LockKeyholeIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Spinner } from "@/components/app/spinner";
import { unlockAction } from "@/app/owner/actions";

/** The one thing a signed-in owner sees until the PIN is right. */
export function PinForm({ email }: { email: string }) {
  const [state, formAction, pending] = React.useActionState(unlockAction, null);
  return (
    <main className="flex min-h-dvh items-center justify-center px-6 py-10">
      <form
        action={formAction}
        className="glass flex w-full max-w-sm flex-col gap-5 rounded-[26px] p-7"
        aria-labelledby="owner-title"
      >
        <span className="bg-brand inline-flex size-11 items-center justify-center rounded-2xl text-white">
          <LockKeyholeIcon aria-hidden="true" className="size-5" />
        </span>
        <div>
          <h1 id="owner-title" className="font-heading text-[1.5rem] font-extrabold tracking-tight">
            Owner access
          </h1>
          <p className="mt-1 text-[13.5px] text-ink-muted">
            Signed in as <b className="text-ink">{email}</b>. Enter your PIN to open the dashboard.
          </p>
        </div>
        <div className="flex flex-col gap-1.5">
          <label htmlFor="owner-pin" className="text-[13px] font-semibold">
            Owner PIN
          </label>
          <Input
            id="owner-pin"
            name="pin"
            type="password"
            autoComplete="off"
            spellCheck={false}
            autoFocus
            required
            aria-invalid={state?.error ? true : undefined}
            aria-describedby={state?.error ? "owner-pin-error" : undefined}
          />
          {state?.error ? (
            <p id="owner-pin-error" role="alert" className="text-[12.5px] text-danger">
              {state.error}
            </p>
          ) : null}
        </div>
        <Button type="submit" size="lg" disabled={pending}>
          {pending ? <Spinner /> : null} Unlock
        </Button>
        <p className="text-[12px] leading-relaxed text-ink-muted">
          It stays open for 30 minutes. Five wrong tries lock it for 15 minutes.
        </p>
      </form>
    </main>
  );
}
