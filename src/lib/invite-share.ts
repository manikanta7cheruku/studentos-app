// Sharing a person's invite link: the words a friend reads, and the share sheet (or a copy to the clipboard when the phone has none).

// What a friend reads when the link is shared in a chat: what it is, that it is free, and how to get it on a phone.
export const INVITE_TEXT =
  "I am using StudentOS to find plans, join debates and meet people on campus. It is free, and you can add it to your phone in two taps, no app store needed. Join me:";

export function inviteLink(code: string): string {
  return `${window.location.origin}/?ref=${code}`;
}

/** Opens the phone's share sheet, or copies the message and link. Answers what happened; a closed share sheet is not an error. */
export async function shareInvite(code: string): Promise<"shared" | "copied" | "none"> {
  const link = inviteLink(code);
  try {
    if (navigator.share) {
      await navigator.share({ title: "Join me on StudentOS", text: INVITE_TEXT, url: link });
      return "shared";
    }
    await navigator.clipboard.writeText(`${INVITE_TEXT}\n${link}`);
    return "copied";
  } catch {
    // The share sheet was closed, or the browser blocked the clipboard. Nothing to tell them.
    return "none";
  }
}
