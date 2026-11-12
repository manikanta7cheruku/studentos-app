"use client";

import * as React from "react";
import { FlagIcon } from "lucide-react";
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
import { Textarea } from "@/components/ui/textarea";
import { Spinner } from "@/components/app/spinner";
import { ApiError, friendlyMessage } from "@/lib/api-client";
import { api } from "@/lib/api/endpoints";
import { useAttempt } from "@/lib/use-attempt";
import { useCollege } from "@/features/college";

const REASONS = [
  ["spam", "Spam"],
  ["harassment", "Harassment"],
  ["inappropriate", "Inappropriate"],
  ["impersonation", "Pretending to be someone"],
  ["scam", "Scam"],
  ["other", "Something else"],
] as const;

/** "Report" for a team post or a profile. The college's moderators see it; the person is not told who reported. */
export function ReportButton({
  targetType,
  targetId,
  what,
}: {
  targetType: "team_post" | "profile" | "idea" | "idea_comment" | "event" | "listing" | "venue";
  targetId: string;
  what: string;
}) {
  const { slug } = useCollege();
  const attempt = useAttempt();
  const [open, setOpen] = React.useState(false);
  const [reason, setReason] = React.useState<(typeof REASONS)[number][0]>("spam");
  const [details, setDetails] = React.useState("");
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [sent, setSent] = React.useState(false);

  async function send() {
    if (busy) return;
    setBusy(true);
    setError(null);
    try {
      await api.reports.create(
        slug,
        {
          target_type: targetType,
          target_id: targetId,
          reason,
          ...(details.trim() ? { details: details.trim() } : {}),
        },
        attempt.get(),
      );
      attempt.reset();
      setSent(true);
    } catch (caught) {
      if (!(caught instanceof ApiError && caught.isOffline)) attempt.reset();
      setError(
        caught instanceof ApiError && caught.code === "CONFLICT"
          ? "You already reported this. A moderator will look at it."
          : friendlyMessage(caught, "We could not send the report. Please try again."),
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <Button variant="ghost" size="sm" onClick={() => setOpen(true)}>
        <FlagIcon aria-hidden="true" /> Report
      </Button>
      <Dialog open={open} onOpenChange={(next) => !busy && setOpen(next)}>
        <DialogContent>
          {sent ? (
            <>
              <DialogHeader>
                <DialogTitle>Thank you</DialogTitle>
                <DialogDescription>
                  A moderator of your college will look at it. The person is not told who reported.
                </DialogDescription>
              </DialogHeader>
              <DialogFooter>
                <Button onClick={() => setOpen(false)}>Close</Button>
              </DialogFooter>
            </>
          ) : (
            <>
              <DialogHeader>
                <DialogTitle>Report {what}</DialogTitle>
                <DialogDescription>
                  Tell the moderators what is wrong. Only they see this.
                </DialogDescription>
              </DialogHeader>
              <fieldset className="flex flex-col gap-1">
                <legend className="mb-1 text-[15px] font-medium">What is wrong</legend>
                {REASONS.map(([value, label]) => (
                  <label key={value} className="flex min-h-11 items-center gap-3 text-[16px]">
                    <input
                      type="radio"
                      name="reason"
                      checked={reason === value}
                      onChange={() => setReason(value)}
                      className="size-5 accent-[var(--primary)]"
                    />
                    {label}
                  </label>
                ))}
              </fieldset>
              <FormField label="More detail" help="Optional.">
                <Textarea
                  value={details}
                  onChange={(e) => setDetails(e.target.value)}
                  maxLength={1000}
                  rows={3}
                />
              </FormField>
              {error ? (
                <Banner variant="error">
                  <p>{error}</p>
                </Banner>
              ) : null}
              <DialogFooter>
                <Button variant="ghost" onClick={() => setOpen(false)} disabled={busy}>
                  Cancel
                </Button>
                <Button onClick={() => void send()} disabled={busy}>
                  {busy ? <Spinner /> : null} Send report
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
