"use client";

import * as React from "react";
import { PlusCircleIcon, SendIcon } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { FormField } from "@/components/ui/form-field";
import { CheckboxField } from "@/components/ui/checkbox";
import { ErrorSummary } from "@/components/ui/error-summary";
import type { AnnouncementItem, CreateAnnouncementInput, UserRole } from "./types";
import { createAnnouncement } from "./sample-data";

export interface AnnouncementFormProps {
  userRole?: UserRole;
  onAnnouncementCreated?: (item: AnnouncementItem) => void;
  className?: string;
}

interface FormErrors {
  title?: string;
  body?: string;
}

/**
 * AnnouncementForm allows college admins and moderators to post campus announcements.
 *
 * Security:
 * // TODO: ANN-02. UI hiding is not security - the server enforces that only users
 * // with admin or moderator roles can invoke the ANN-02 operation via RLS policies.
 * Students must never see this form.
 */
export function AnnouncementForm({
  userRole = "student",
  onAnnouncementCreated,
  className,
}: AnnouncementFormProps) {
  // Enforce role check: only admins and moderators can access this form
  const isAuthorized = userRole === "admin" || userRole === "moderator";

  const [isOpen, setIsOpen] = React.useState(false);
  const [title, setTitle] = React.useState("");
  const [body, setBody] = React.useState("");
  const [pinned, setPinned] = React.useState(false);
  const [errors, setErrors] = React.useState<FormErrors>({});
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [successMessage, setSuccessMessage] = React.useState<string | null>(null);

  if (!isAuthorized) {
    return null;
  }

  const validate = (): boolean => {
    const nextErrors: FormErrors = {};

    if (!title.trim()) {
      nextErrors.title = "Please enter an announcement title.";
    } else if (title.trim().length < 5) {
      nextErrors.title = "Title must be at least 5 characters long.";
    } else if (title.trim().length > 120) {
      nextErrors.title = "Title must be 120 characters or fewer.";
    }

    if (!body.trim()) {
      nextErrors.body = "Please enter the announcement details.";
    } else if (body.trim().length < 10) {
      nextErrors.body = "Announcement details must be at least 10 characters long.";
    } else if (body.trim().length > 5000) {
      nextErrors.body = "Announcement details must be 5000 characters or fewer.";
    }

    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSuccessMessage(null);

    if (!validate()) {
      return;
    }

    setIsSubmitting(true);
    try {
      const input: CreateAnnouncementInput = {
        title: title.trim(),
        body: body.trim(),
        pinned,
      };

      const result = await createAnnouncement(input);
      setTitle("");
      setBody("");
      setPinned(false);
      setErrors({});
      setSuccessMessage("Announcement posted to your college community.");
      setIsOpen(false);
      onAnnouncementCreated?.(result.data);
    } catch {
      setErrors({
        body: "Failed to publish announcement. Please try again.",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const errorSummaryItems = [
    errors.title ? { fieldId: "announcement-title", message: errors.title } : null,
    errors.body ? { fieldId: "announcement-body", message: errors.body } : null,
  ].filter(Boolean) as { fieldId: string; message: string }[];

  return (
    <div className={className} data-slot="announcement-moderator-tools">
      {!isOpen ? (
        <div className="flex flex-col gap-2">
          {successMessage && (
            <div
              role="status"
              className="rounded-card border border-border bg-accent/40 p-3 text-base font-medium text-foreground"
            >
              {successMessage}
            </div>
          )}
          <Button
            type="button"
            variant="default"
            onClick={() => setIsOpen(true)}
            className="flex items-center gap-2 self-start"
          >
            <PlusCircleIcon className="size-5" aria-hidden="true" />
            <span>Post an announcement</span>
          </Button>
        </div>
      ) : (
        <form
          onSubmit={handleSubmit}
          noValidate
          className="flex flex-col gap-4 rounded-card border border-border-strong bg-surface p-6"
          aria-label="Post announcement form"
        >
          <div className="flex flex-col gap-1 border-b border-border pb-3">
            <h2 className="font-heading text-xl font-semibold">Post a campus announcement</h2>
            <p className="text-base text-muted-foreground">
              Official notices are visible to all verified members of your college.
            </p>
          </div>

          {errorSummaryItems.length > 0 && (
            <ErrorSummary title="Please correct the following errors" errors={errorSummaryItems} />
          )}

          <FormField
            id="announcement-title"
            label="Announcement title"
            required
            help="Short, informative headline (5-120 characters)."
            error={errors.title}
          >
            <Input
              value={title}
              onChange={(e) => {
                setTitle(e.target.value);
                if (errors.title) setErrors((prev) => ({ ...prev, title: undefined }));
              }}
              placeholder="e.g. Schedule for Mid-Term Examinations"
              maxLength={120}
              disabled={isSubmitting}
            />
          </FormField>

          <FormField
            id="announcement-body"
            label="Announcement details"
            required
            help="Full information for students (plain text, up to 5000 characters)."
            error={errors.body}
          >
            <Textarea
              value={body}
              onChange={(e) => {
                setBody(e.target.value);
                if (errors.body) setErrors((prev) => ({ ...prev, body: undefined }));
              }}
              placeholder="Provide clear details, locations, contact info, and instructions..."
              rows={4}
              maxLength={5000}
              disabled={isSubmitting}
            />
          </FormField>

          <CheckboxField
            id="announcement-pinned"
            label="Pin this announcement to the top of the campus feed"
            checked={pinned}
            onCheckedChange={(checked) => setPinned(Boolean(checked))}
            disabled={isSubmitting}
          />

          <div className="flex flex-wrap items-center gap-3 pt-2">
            <Button
              type="submit"
              variant="default"
              disabled={isSubmitting}
              className="flex items-center gap-2"
            >
              <SendIcon className="size-5" aria-hidden="true" />
              <span>{isSubmitting ? "Publishing..." : "Publish announcement"}</span>
            </Button>
            <Button
              type="button"
              variant="outline"
              disabled={isSubmitting}
              onClick={() => {
                setIsOpen(false);
                setErrors({});
              }}
            >
              Cancel
            </Button>
          </div>
        </form>
      )}
    </div>
  );
}
