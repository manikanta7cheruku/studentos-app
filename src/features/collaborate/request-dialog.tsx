"use client";

import * as React from "react";
import { Banner } from "@/components/ui/banner";
import { GlassSheet } from "@/components/app/glass-sheet";
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

  // A box has the keyboard: the sheet rises with it, and settles back when the focus leaves.
  const [typing, setTypingNow] = React.useState(false);
  const leave = React.useRef<number | null>(null);
  const setTyping = (next: boolean) => {
    if (leave.current !== null) window.clearTimeout(leave.current);
    leave.current = null;
    if (next) setTypingNow(true);
    else leave.current = window.setTimeout(() => setTypingNow(false), 220);
  };
  React.useEffect(
    () => () => {
      if (leave.current !== null) window.clearTimeout(leave.current);
    },
    [],
  );

  return (
    <GlassSheet
      open={open}
      onOpenChange={(next) => !busy && onOpenChange(next)}
      title={`Ask to join as ${role.role_name}`}
      description={`The author of “${postTitle}” sees your name, headline and skills with your message, and decides.`}
      typing={typing}
    >
      <div
        className="pro-scroll -mx-1 min-h-0 flex-1 overflow-y-auto overscroll-contain px-1 pt-2 pb-3"
        onFocusCapture={(event) => {
          if ((event.target as HTMLElement).matches("input, textarea")) setTyping(true);
        }}
        onBlurCapture={() => setTyping(false)}
      >
        <FormField label="A short message" help="Optional. Say why you fit, and what you can do.">
          <Textarea
            value={message}
            onChange={(event) => setMessage(event.target.value)}
            maxLength={500}
            rows={4}
          />
        </FormField>
        {error ? (
          <div className="pt-3">
            <Banner variant="error">
              <p>{error}</p>
            </Banner>
          </div>
        ) : null}
      </div>
      <div className="flex gap-2.5 pt-2">
        <button
          type="button"
          className="profile-btn flex-1"
          onClick={() => onOpenChange(false)}
          disabled={busy}
        >
          Cancel
        </button>
        <button
          type="button"
          className="profile-btn profile-btn-primary flex-1"
          onClick={() => void send()}
          disabled={busy}
        >
          {busy ? <Spinner /> : null} Send request
        </button>
      </div>
    </GlassSheet>
  );
}
