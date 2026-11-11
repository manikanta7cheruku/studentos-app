"use client";

import * as React from "react";
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
import { Textarea } from "@/components/ui/textarea";
import { Spinner } from "@/components/app/spinner";
import { cn } from "cn";
import { friendlyMessage } from "@/lib/api-client";
import { api, type ContentKind, type RemovalReason } from "@/lib/api/endpoints";

export const REMOVAL_REASONS: { value: RemovalReason; label: string; hint: string }[] = [
  { value: "spam", label: "Spam", hint: "Ads, repeated or pointless posts" },
  { value: "inappropriate", label: "Inappropriate", hint: "Not fit for a college community" },
  { value: "harassment", label: "Harassment", hint: "Targets or hurts someone" },
  { value: "scam", label: "Scam or fake", hint: "Tries to cheat or mislead people" },
  { value: "duplicate", label: "Duplicate", hint: "The same thing is already posted" },
  { value: "other", label: "Other", hint: "Something else (add a note)" },
];

const KIND_WORD: Record<ContentKind, string> = {
  plan: "plan",
  thought: "buzz",
  event: "event",
  listing: "listing",
};

/**
 * A moderator or admin removes something. They must pick a reason, and the author is told that it was removed and
 * why (with the optional note). Nothing is deleted for good: the item is hidden and the removal is in the audit log.
 */
export function RemoveDialog({
  slug,
  kind,
  id,
  open,
  onOpenChange,
  onRemoved,
}: {
  slug: string;
  kind: ContentKind;
  id: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onRemoved: () => void;
}) {
  const [reason, setReason] = React.useState<RemovalReason | null>(null);
  const [note, setNote] = React.useState("");
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  async function remove() {
    if (!reason || busy) return;
    setBusy(true);
    setError(null);
    try {
      await api.admin.removeContent(slug, {
        kind,
        id,
        reason,
        ...(note.trim() ? { note: note.trim() } : {}),
      });
      onOpenChange(false);
      onRemoved();
    } catch (caught) {
      setError(friendlyMessage(caught, "We could not remove it. Please try again."));
    } finally {
      setBusy(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={(next) => !busy && onOpenChange(next)}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Remove this {KIND_WORD[kind]}?</DialogTitle>
          <DialogDescription>
            Pick a reason. The person who posted it is told it was removed and why.
          </DialogDescription>
        </DialogHeader>
        <fieldset className="flex flex-col gap-2">
          <legend className="sr-only">Reason</legend>
          {REMOVAL_REASONS.map((item) => (
            <label
              key={item.value}
              className={cn(
                "flex cursor-pointer items-start gap-3 rounded-2xl border px-3.5 py-2.5 focus-within:ring-2 focus-within:ring-ring",
                reason === item.value
                  ? "border-[#7d74e0]/60 bg-[#7d74e0]/10"
                  : "border-white/10 bg-white/[0.03] hover:border-white/25",
              )}
            >
              <input
                type="radio"
                name="reason"
                value={item.value}
                checked={reason === item.value}
                onChange={() => setReason(item.value)}
                className="mt-1 size-4 accent-[var(--primary)]"
              />
              <span>
                <span className="block text-[14px] font-semibold">{item.label}</span>
                <span className="block text-[12.5px] text-ink-muted">{item.hint}</span>
              </span>
            </label>
          ))}
        </fieldset>
        <Textarea
          value={note}
          onChange={(event) => setNote(event.target.value)}
          maxLength={300}
          rows={2}
          placeholder="A short note for the author (optional)"
          aria-label="A note for the author"
        />
        {error ? (
          <Banner variant="error">
            <p>{error}</p>
          </Banner>
        ) : null}
        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)} disabled={busy}>
            Keep it
          </Button>
          <Button variant="destructive" onClick={() => void remove()} disabled={busy || !reason}>
            {busy ? <Spinner /> : null} Remove and tell the author
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
