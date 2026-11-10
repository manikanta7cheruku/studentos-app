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
import { FormField } from "@/components/ui/form-field";
import { Textarea } from "@/components/ui/textarea";
import { Spinner } from "@/components/app/spinner";
import { ApiError, friendlyMessage } from "@/lib/api-client";
import { api } from "@/lib/api/endpoints";
import { useAttempt } from "@/lib/use-attempt";
import { useCollege } from "@/features/college";

/** What the server's refusals mean for a person who asks to join a role. */
export function requestErrorMessage(caught: unknown): string {
  if (caught instanceof ApiError) {
    switch (caught.code) {
      case "ALREADY_REQUESTED":
        return "You already asked to join this post. Wait for the author's answer.";
      case "SLOTS_FULL":
        return "That role was just filled. Try another role, or another post.";
      case "CONFLICT":
        return "This post is no longer taking requests.";
      case "FORBIDDEN":
        return "You cannot ask to join your own post.";
      case "RATE_LIMITED":
        return "You have 10 requests waiting. Wait for answers before asking for more.";
      default:
        break;
    }
  }
  return friendlyMessage(caught, "We could not send your request. Please try again.");
}

/** Ask to join one role of a post, with a short message. One Idempotency-Key per attempt. */
export function RequestDialog({
  postId,
  postTitle,
  role,
  open,
  onOpenChange,
  onSent,
}: {
  postId: string;
  postTitle: string;
  role: { id: string; role_name: string };
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSent: () => void;
}) {
  const { slug } = useCollege();
  const attempt = useAttempt();
  const [message, setMessage] = React.useState("");
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  async function send() {
    if (busy) return;
    setBusy(true);
    setError(null);
    try {
      await api.teamPosts.request(slug, postId, role.id, message.trim(), attempt.get());
      attempt.reset();
      setMessage("");
      onOpenChange(false);
      onSent();
    } catch (caught) {
      if (!(caught instanceof ApiError && caught.isOffline)) attempt.reset();
      setError(requestErrorMessage(caught));
    } finally {
      setBusy(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={(next) => !busy && onOpenChange(next)}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Ask to join as {role.role_name}</DialogTitle>
          <DialogDescription>
            The author of &ldquo;{postTitle}&rdquo; sees your name, headline and skills with your
            message, and decides.
          </DialogDescription>
        </DialogHeader>
        <FormField label="A short message" help="Optional. Say why you fit, and what you can do.">
          <Textarea
            value={message}
            onChange={(event) => setMessage(event.target.value)}
            maxLength={500}
            rows={4}
          />
        </FormField>
        {error ? (
          <Banner variant="error">
            <p>{error}</p>
          </Banner>
        ) : null}
        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)} disabled={busy}>
            Cancel
          </Button>
          <Button onClick={() => void send()} disabled={busy}>
            {busy ? <Spinner /> : null} Send request
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
