"use client";

import * as React from "react";
import { Loader2Icon, SendIcon } from "lucide-react";
import { cn } from "cn";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { ErrorSummary, type ErrorSummaryItem } from "@/components/ui/error-summary";
import { FormField } from "@/components/ui/form-field";
import { Textarea } from "@/components/ui/textarea";
import type { JoinRequestErrorCode, JoinRequestError, TeamPost } from "./types";
import { RoleChip } from "./role-chip";

export interface RequestDialogProps {
  post: TeamPost;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  trigger?: React.ReactNode;
  initialRoleId?: string;
  isSending?: boolean;
  error?: string | JoinRequestError | null;
  errorCode?: JoinRequestErrorCode | string | null;
  onSubmit?: (data: { postId: string; roleId: string; message: string }) => void | Promise<void>;
  maxMessageLength?: number;
}

const DEFAULT_MAX_LENGTH = 300;

export function RequestDialog({
  post,
  open: controlledOpen,
  onOpenChange: setControlledOpen,
  trigger,
  initialRoleId,
  isSending = false,
  error: externalError,
  errorCode,
  onSubmit,
  maxMessageLength = DEFAULT_MAX_LENGTH,
}: RequestDialogProps) {
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

  const lastActiveElementRef = React.useRef<HTMLElement | null>(null);
  const [selectedRoleIdOverride, setSelectedRoleIdOverride] = React.useState<
    string | null | undefined
  >(undefined);
  const selectedRoleId =
    selectedRoleIdOverride !== undefined ? selectedRoleIdOverride : (initialRoleId ?? null);

  const [message, setMessage] = React.useState("");
  const [localErrors, setLocalErrors] = React.useState<ErrorSummaryItem[]>([]);

  // Derive error messages from props or local state
  const errorItems = React.useMemo<ErrorSummaryItem[]>(() => {
    const items: ErrorSummaryItem[] = [...localErrors];

    if (errorCode === "DUPLICATE_REQUEST") {
      items.push({
        fieldId: "request-role",
        message: "You have already sent a request to join this role.",
      });
    } else if (errorCode === "SLOTS_FULL") {
      items.push({
        fieldId: "request-role",
        message: "That role was just filled. See other open roles.",
      });
    } else if (externalError) {
      const msg = typeof externalError === "string" ? externalError : externalError.message;
      const fieldId =
        typeof externalError === "object" && externalError.fieldId
          ? externalError.fieldId
          : "request-message";
      items.push({ fieldId, message: msg });
    }

    return items;
  }, [localErrors, errorCode, externalError]);

  const roleError = errorItems.find((e) => e.fieldId === "request-role")?.message;
  const messageError = errorItems.find((e) => e.fieldId === "request-message")?.message;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const newErrors: ErrorSummaryItem[] = [];

    if (!selectedRoleId) {
      newErrors.push({
        fieldId: "request-role",
        message: "Please choose a role to apply for.",
      });
    } else {
      const chosenRole = post.roles.find((r) => r.id === selectedRoleId);
      if (chosenRole && chosenRole.filled >= chosenRole.slots) {
        newErrors.push({
          fieldId: "request-role",
          message: "That role was just filled. See other open roles.",
        });
      }
    }

    const trimmed = message.trim();
    if (!trimmed) {
      newErrors.push({
        fieldId: "request-message",
        message: "Please write a short message explaining why you'd like to join.",
      });
    } else if (trimmed.length > maxMessageLength) {
      newErrors.push({
        fieldId: "request-message",
        message: `Message must be ${maxMessageLength} characters or fewer.`,
      });
    }

    if (newErrors.length > 0) {
      setLocalErrors(newErrors);
      return;
    }

    setLocalErrors([]);
    if (selectedRoleId && onSubmit) {
      await onSubmit({
        postId: post.id,
        roleId: selectedRoleId,
        message: trimmed,
      });
    }
  };

  const handleOpenChange = (nextOpen: boolean) => {
    if (nextOpen) {
      if (typeof document !== "undefined" && document.activeElement instanceof HTMLElement) {
        lastActiveElementRef.current = document.activeElement;
      }
    } else {
      setLocalErrors([]);
      setSelectedRoleIdOverride(undefined);
      setMessage("");
      if (lastActiveElementRef.current) {
        lastActiveElementRef.current.focus();
      }
    }
    setIsOpen(nextOpen);
  };

  const charactersRemaining = maxMessageLength - message.length;

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <DialogTrigger
        asChild
        onClick={() => {
          if (typeof document !== "undefined" && document.activeElement instanceof HTMLElement) {
            lastActiveElementRef.current = document.activeElement;
          }
        }}
      >
        {trigger || (
          <Button type="button" className="min-h-[44px]">
            Request to join
          </Button>
        )}
      </DialogTrigger>

      <DialogContent
        onCloseAutoFocus={(e) => {
          if (lastActiveElementRef.current) {
            e.preventDefault();
            lastActiveElementRef.current.focus();
          }
        }}
        className="sm:max-w-lg max-h-[calc(100dvh-2rem)] flex flex-col p-0 overflow-hidden"
      >
        <DialogHeader className="p-6 pb-2 shrink-0">
          <DialogTitle>Request to join {post.title}</DialogTitle>
          <DialogDescription>
            Choose the role you want and send a brief note to the team creator.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="flex min-h-0 flex-1 flex-col overflow-hidden">
          <div className="flex-1 overflow-y-auto px-6 py-3 flex flex-col gap-6">
            {errorItems.length > 0 && (
              <ErrorSummary errors={errorItems} title="There is a problem with your request" />
            )}

            {/* Role Selection */}
            <div className="flex flex-col gap-2">
              <span id="role-select-label" className="text-base font-semibold text-foreground">
                Role to join <span className="font-normal text-muted-foreground">(required)</span>
              </span>
              <p id="role-select-help" className="text-base text-muted-foreground">
                Select an open role. Full roles cannot be selected.
              </p>

              {roleError && (
                <p id="request-role-error" className="text-base font-medium text-destructive">
                  {roleError}
                </p>
              )}

              <div
                id="request-role"
                tabIndex={-1}
                role="group"
                aria-labelledby="role-select-label"
                aria-describedby={
                  [roleError ? "request-role-error" : null, "role-select-help"]
                    .filter(Boolean)
                    .join(" ") || undefined
                }
                className="flex flex-col gap-2 pt-1"
              >
                {post.roles.map((role) => {
                  const isFull = role.filled >= role.slots;
                  const isSelected = selectedRoleId === role.id;
                  return (
                    <RoleChip
                      key={role.id}
                      role={role}
                      selectable
                      selected={isSelected}
                      disabled={isFull || isSending}
                      onSelect={(r) => {
                        setSelectedRoleIdOverride(r.id);
                        setLocalErrors((prev) => prev.filter((e) => e.fieldId !== "request-role"));
                      }}
                      showSkills
                    />
                  );
                })}
              </div>
            </div>

            {/* Note / Message */}
            <FormField
              id="request-message"
              label="Short note to the creator"
              help="Mention relevant projects, courses, or what you want to build together."
              required
              error={messageError}
            >
              <Textarea
                value={message}
                disabled={isSending}
                onChange={(e) => {
                  setMessage(e.target.value);
                  if (messageError) {
                    setLocalErrors((prev) =>
                      prev.filter((err) => err.fieldId !== "request-message"),
                    );
                  }
                }}
                maxLength={maxMessageLength}
                rows={4}
                placeholder="Hi, I saw your post and have worked with..."
                className="resize-none text-base"
              />
            </FormField>

            {/* Visible character count */}
            <div
              aria-live="polite"
              className={cn(
                "-mt-4 text-right text-base text-muted-foreground",
                charactersRemaining < 20 && "text-warning font-medium",
                charactersRemaining <= 0 && "text-destructive font-medium",
              )}
            >
              <span>
                {message.length} of {maxMessageLength} characters
              </span>
            </div>
          </div>

          <DialogFooter className="p-4 border-t border-border bg-muted/30">
            <DialogClose asChild>
              <Button type="button" variant="outline" disabled={isSending} className="min-h-[44px]">
                Cancel
              </Button>
            </DialogClose>
            <Button
              type="submit"
              disabled={isSending}
              aria-disabled={isSending}
              className="min-h-[44px] flex items-center gap-2"
            >
              {isSending ? (
                <>
                  <Loader2Icon className="size-5 animate-spin" aria-hidden="true" />
                  <span>Sending...</span>
                </>
              ) : (
                <>
                  <SendIcon className="size-5" aria-hidden="true" />
                  <span>Send request</span>
                </>
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
