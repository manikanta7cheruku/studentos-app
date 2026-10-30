"use client";

import * as React from "react";
import { FlagIcon, CheckCircle2Icon, AlertCircleIcon, SendIcon } from "lucide-react";
import { cn } from "cn";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import type { CreateReportInput, ReportItem, ReportReason } from "./types";
import { submitReport } from "./sample-data";

export interface ReportDialogProps {
  targetType: "team_post" | "announcement" | "profile" | "comment";
  targetId: string;
  targetTitle?: string;
  trigger?: React.ReactNode;
  onReportSubmitted?: (report: ReportItem) => void;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}

const REPORT_REASONS: { id: ReportReason; label: string; description: string }[] = [
  {
    id: "spam",
    label: "Spam or commercial promotion",
    description: "Advertisements, paid assignment writing, or unwanted marketing.",
  },
  {
    id: "harassment",
    label: "Harassment or bullying",
    description: "Targeted attacks, threats, hate speech, or intimidatory messages.",
  },
  {
    id: "inappropriate",
    label: "Inappropriate or offensive content",
    description: "Explicit material or content that violates college community rules.",
  },
  {
    id: "impersonation",
    label: "Impersonation or fake account",
    description: "Claiming a false student identity or someone else's credentials.",
  },
  {
    id: "other",
    label: "Other policy violation",
    description: "Any other issue that concerns campus safety or college guidelines.",
  },
];

/**
 * ReportDialog enables 3-tap reporting:
 * Tap 1: Open Dialog
 * Tap 2: Choose Reason
 * Tap 3: Submit Report
 *
 * Traps focus and closes with Escape key natively via Radix Dialog.
 */
export function ReportDialog({
  targetType,
  targetId,
  targetTitle,
  trigger,
  onReportSubmitted,
  open: controlledOpen,
  onOpenChange: setControlledOpen,
}: ReportDialogProps) {
  const [internalOpen, setInternalOpen] = React.useState(false);
  const isControlled = controlledOpen !== undefined;
  const isOpen = isControlled ? controlledOpen : internalOpen;
  const setIsOpen = (next: boolean) => {
    if (isControlled) {
      setControlledOpen?.(next);
    } else {
      setInternalOpen(next);
    }
  };

  const [selectedReason, setSelectedReason] = React.useState<ReportReason>("spam");
  const [details, setDetails] = React.useState("");
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [submitted, setSubmitted] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedReason) {
      setError("Please select a reason for your report.");
      return;
    }

    setIsSubmitting(true);
    setError(null);
    try {
      const input: CreateReportInput = {
        target_type: targetType,
        target_id: targetId,
        target_title: targetTitle,
        reason: selectedReason,
        details: details.trim() || undefined,
      };

      const result = await submitReport(input);
      setSubmitted(true);
      onReportSubmitted?.(result.data);
    } catch {
      setError("Unable to submit report. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const resetForm = () => {
    setSelectedReason("spam");
    setDetails("");
    setSubmitted(false);
    setError(null);
  };

  return (
    <Dialog
      open={isOpen}
      onOpenChange={(open) => {
        setIsOpen(open);
        if (!open) {
          resetForm();
        }
      }}
    >
      <DialogTrigger asChild>
        {trigger || (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="flex items-center gap-1.5 text-muted-foreground hover:text-danger"
            aria-label={`Report ${targetTitle || "content"}`}
          >
            <FlagIcon className="size-4" aria-hidden="true" />
            <span>Report</span>
          </Button>
        )}
      </DialogTrigger>

      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Report content</DialogTitle>
          <DialogDescription>
            Help keep your college community safe and constructive. Reports are private and sent
            directly to campus moderators.
          </DialogDescription>
        </DialogHeader>

        {submitted ? (
          <div
            data-testid="report-submitted-success"
            className="flex flex-col items-center gap-3 py-6 text-center"
          >
            <CheckCircle2Icon className="size-12 text-success" aria-hidden="true" />
            <h3 className="font-heading text-xl font-semibold">Report received</h3>
            <p className="text-base text-muted-foreground">
              Thank you for notifying us. A moderator from your college will review this content
              promptly.
            </p>
            <Button
              type="button"
              variant="default"
              onClick={() => setIsOpen(false)}
              className="mt-2"
            >
              Done
            </Button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            {targetTitle && (
              <div className="rounded-input border border-border bg-accent/20 px-3 py-2 text-base text-muted-foreground">
                Reporting: <strong className="text-foreground">{targetTitle}</strong>
              </div>
            )}

            {error && (
              <div
                role="alert"
                className="flex items-center gap-2 rounded-input border border-destructive bg-destructive/10 p-3 text-base text-destructive"
              >
                <AlertCircleIcon className="size-5 shrink-0" aria-hidden="true" />
                <span>{error}</span>
              </div>
            )}

            <div className="flex flex-col gap-2">
              <Label id="report-reason-group-label" className="text-base font-semibold">
                Reason for reporting{" "}
                <span className="font-normal text-muted-foreground">(Tap to select)</span>
              </Label>
              <div
                role="radiogroup"
                aria-labelledby="report-reason-group-label"
                className="flex flex-col gap-2"
              >
                {REPORT_REASONS.map((r) => {
                  const isSelected = selectedReason === r.id;
                  return (
                    <button
                      key={r.id}
                      type="button"
                      role="radio"
                      aria-checked={isSelected}
                      onClick={() => {
                        setSelectedReason(r.id);
                        if (error) setError(null);
                      }}
                      className={cn(
                        "flex min-h-11 flex-col items-start justify-center rounded-input border p-3 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                        isSelected
                          ? "border-primary bg-accent/40 font-semibold ring-1 ring-primary"
                          : "border-border bg-surface text-foreground hover:bg-accent/20",
                      )}
                    >
                      <span className="flex items-center gap-2 text-base font-medium">
                        <span
                          className={cn(
                            "flex size-4 items-center justify-center rounded-full border border-border-strong",
                            isSelected && "border-primary bg-primary text-surface",
                          )}
                          aria-hidden="true"
                        >
                          {isSelected && <span className="size-2 rounded-full bg-surface" />}
                        </span>
                        {r.label}
                      </span>
                      <span className="pl-6 text-base text-muted-foreground font-normal">
                        {r.description}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="flex flex-col gap-2">
              <Label htmlFor="report-details" className="text-base font-semibold">
                Additional context{" "}
                <span className="font-normal text-muted-foreground">(optional)</span>
              </Label>
              <Textarea
                id="report-details"
                value={details}
                onChange={(e) => setDetails(e.target.value)}
                placeholder="Explain what is wrong with this post or provide relevant details..."
                rows={3}
                maxLength={1000}
                disabled={isSubmitting}
              />
            </div>

            <DialogFooter className="pt-2">
              <Button
                type="button"
                variant="outline"
                disabled={isSubmitting}
                onClick={() => setIsOpen(false)}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                variant="destructive"
                disabled={isSubmitting}
                className="flex items-center gap-2"
              >
                <SendIcon className="size-4" aria-hidden="true" />
                <span>{isSubmitting ? "Sending..." : "Submit report"}</span>
              </Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
