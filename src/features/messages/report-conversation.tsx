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
import { ChoiceChips } from "@/components/ui/choice-chips";
import { Textarea } from "@/components/ui/textarea";
import { Spinner } from "@/components/app/spinner";
import { ApiError, friendlyMessage } from "@/lib/api-client";
import { api } from "@/lib/api/endpoints";
import { useCollege } from "@/features/college";

const REASONS = [
  { value: "harassment", label: "Harassment" },
  { value: "spam", label: "Spam" },
  { value: "scam", label: "Scam" },
  { value: "inappropriate", label: "Inappropriate" },
  { value: "other", label: "Something else" },
] as const;

type Reason = (typeof REASONS)[number]["value"];

/**
 * Report the person from a conversation. The moderators of the college get the report with a copy of the recent messages,
 * because the messages themselves will be gone soon.
 */
export function ReportConversation({ userId, name }: { userId: string; name: string }) {
  const { slug } = useCollege();
  const [open, setOpen] = React.useState(false);
  const [reason, setReason] = React.useState<Reason>("harassment");
  const [details, setDetails] = React.useState("");
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [sent, setSent] = React.useState(false);

  async function send() {
    if (busy) return;
    setBusy(true);
    setError(null);
    try {
      await api.messages.report(slug, userId, {
        reason,
        ...(details.trim() ? { details: details.trim() } : {}),
      });
      setSent(true);
    } catch (caught) {
      setError(
        caught instanceof ApiError && caught.code === "CONFLICT"
          ? "You already reported this person. A moderator will look at it."
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
                  A moderator of your college will look at it. {name} is not told who reported.
                </DialogDescription>
              </DialogHeader>
              <DialogFooter>
                <Button onClick={() => setOpen(false)}>Close</Button>
              </DialogFooter>
            </>
          ) : (
            <>
              <DialogHeader>
                <DialogTitle>Report {name}</DialogTitle>
                <DialogDescription>
                  The moderators get a copy of the recent messages of this conversation. Only they
                  see it.
                </DialogDescription>
              </DialogHeader>
              <ChoiceChips
                label="What is wrong"
                value={reason}
                onChange={setReason}
                options={REASONS.map((item) => ({ value: item.value, label: item.label }))}
              />
              <Textarea
                aria-label="More detail (optional)"
                value={details}
                onChange={(event) => setDetails(event.target.value)}
                maxLength={500}
                rows={3}
                placeholder="More detail (optional)"
              />
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
