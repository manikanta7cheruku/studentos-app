"use client";

import * as React from "react";
import { CheckIcon, TimerIcon } from "lucide-react";
import { cn } from "cn";
import { GlassSheet } from "@/components/app/glass-sheet";
import { Spinner } from "@/components/app/spinner";
import { ApiError, friendlyMessage } from "@/lib/api-client";
import { api } from "@/lib/api/endpoints";
import { useCollege } from "@/features/college";
import { TIMER_OPTIONS, timerLabel, type TimerMinutes } from "./timer";

type Disappear = {
  minutes: number;
  set_by_me: boolean;
  set_by_name: string | null;
  set_at: string | null;
  can_change: boolean;
};

/**
 * "Disappearing messages" for one chat, on a glass sheet: three choices, saved the moment one is tapped. Either person can change
 * it, it only affects messages sent from then on, and the other person sees who changed it. While the chat is still a request
 * the choices are shown but cannot be used.
 */
export function TimerSheet({
  open,
  onOpenChange,
  userId,
  name,
  disappear,
  onChanged,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  userId: string;
  name: string;
  disappear: Disappear;
  onChanged: () => void;
}) {
  const { slug } = useCollege();
  const [busy, setBusy] = React.useState<number | null>(null);
  const [error, setError] = React.useState<string | null>(null);
  const first = name.split(" ")[0] ?? name;

  async function choose(minutes: TimerMinutes) {
    if (busy !== null || !disappear.can_change) return;
    if (minutes === disappear.minutes) {
      onOpenChange(false);
      return;
    }
    setBusy(minutes);
    setError(null);
    try {
      await api.messages.setTimer(slug, userId, minutes);
      onChanged();
      // A beat to see the tick before the sheet goes.
      window.setTimeout(() => onOpenChange(false), 260);
    } catch (caught) {
      setError(
        caught instanceof ApiError && caught.code === "CONFLICT"
          ? "You can change this once the conversation has started."
          : friendlyMessage(caught, "We could not change it. Please try again."),
      );
    } finally {
      setBusy(null);
    }
  }

  return (
    <GlassSheet
      open={open}
      onOpenChange={onOpenChange}
      title="Disappearing messages"
      description={`How long a message stays after ${first} or you open it.`}
    >
      <div className="pro-scroll -mx-1 min-h-0 flex-1 overflow-y-auto overscroll-contain px-1 pt-1 pb-2">
        <ul role="radiogroup" aria-label="Disappearing messages" className="flex flex-col gap-2.5">
          {TIMER_OPTIONS.map((option) => {
            const chosen = option.minutes === disappear.minutes;
            return (
              <li key={option.minutes}>
                <button
                  type="button"
                  role="radio"
                  aria-checked={chosen}
                  disabled={!disappear.can_change && !chosen}
                  onClick={() => void choose(option.minutes)}
                  className={cn(
                    "flex w-full items-center gap-3.5 rounded-[18px] border px-4 py-3.5 text-left outline-none transition-[background-color,border-color,transform,opacity] duration-200 focus-visible:ring-2 focus-visible:ring-ring active:scale-[0.985] disabled:opacity-45",
                    chosen
                      ? "border-white/25 bg-white/[0.13] shadow-[inset_0_1px_0_rgba(255,255,255,0.2)]"
                      : "border-white/10 bg-white/[0.04] hover:border-white/20 hover:bg-white/[0.07]",
                  )}
                >
                  <span className="min-w-0 flex-1">
                    <span className="block text-[15.5px] font-semibold">{option.label}</span>
                    <span className="block text-[13px] text-ink-muted">{option.text}</span>
                  </span>
                  <span
                    aria-hidden="true"
                    className={cn(
                      "inline-flex size-6 shrink-0 items-center justify-center rounded-full border transition-colors duration-200",
                      chosen
                        ? "border-transparent bg-[#7d74e0] text-white"
                        : "border-white/20 text-transparent",
                    )}
                  >
                    {busy === option.minutes ? <Spinner /> : <CheckIcon className="size-3.5" />}
                  </span>
                </button>
              </li>
            );
          })}
        </ul>

        <p className="mt-4 flex items-start gap-2 text-[13px] leading-relaxed text-ink-muted">
          <TimerIcon aria-hidden="true" className="mt-0.5 size-4 shrink-0" />
          <span>
            {disappear.can_change
              ? disappear.set_by_name
                ? `${disappear.set_by_me ? "You" : disappear.set_by_name} set this to ${timerLabel(disappear.minutes)}. It applies to new messages. `
                : "It applies to new messages, and either of you can change it. "
              : `You can change this once ${first} has replied. `}
            A message you never open goes after 3 days. Anyone can still screenshot a message before
            it disappears.
          </span>
        </p>
        {error ? <p className="mt-3 text-[13px] text-danger">{error}</p> : null}
      </div>
    </GlassSheet>
  );
}
