"use client";

import * as React from "react";
import Link from "next/link";
import { ChevronRightIcon, SendIcon } from "lucide-react";
import { Avatar } from "@/components/app/avatar";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ApiError, friendlyMessage } from "@/lib/api-client";
import { api, type NetworkSuggestion } from "@/lib/api/endpoints";
import { useLoad } from "@/lib/use-load";
import { useCollege } from "@/features/college";
import { networkProgress, openers } from "./network-tiers";

function Ring({
  fraction,
  size = 64,
  children,
}: {
  fraction: number;
  size?: number;
  children: React.ReactNode;
}) {
  const r = 26;
  const c = 2 * Math.PI * r;
  return (
    <span
      className="relative inline-flex shrink-0 items-center justify-center"
      style={{ width: size, height: size }}
    >
      <svg viewBox="0 0 64 64" className="absolute inset-0 -rotate-90" aria-hidden="true">
        <circle cx="32" cy="32" r={r} fill="none" strokeWidth="6" className="stroke-white/10" />
        <circle
          cx="32"
          cy="32"
          r={r}
          fill="none"
          strokeWidth="6"
          strokeLinecap="round"
          stroke="#8f86f0"
          strokeDasharray={c}
          strokeDashoffset={c * (1 - Math.min(1, Math.max(0, fraction)))}
        />
      </svg>
      <span
        className={`tabular relative font-extrabold ${size < 56 ? "text-[14px]" : "text-[17px]"}`}
      >
        {children}
      </span>
    </span>
  );
}

/** Home: how strong my network is. One slim line once someone has a few connections, a fuller prompt before that. Hidden on Global. */
export function NetworkStrip() {
  const { slug } = useCollege();
  const mine = useLoad(() => api.network.mine(), []);
  if (slug === "global" || mine.status !== "ready") return null;
  const connections = mine.data.connections;
  const progress = networkProgress(connections);
  const slim = connections >= 3;
  return (
    <Link
      href={`/c/${slug}/people`}
      aria-label="Your network"
      className={`lift glass-card flex items-center gap-3 rounded-[22px] outline-none focus-visible:ring-2 focus-visible:ring-ring ${slim ? "px-4 py-2.5" : "p-4"}`}
    >
      <Ring fraction={progress.fraction} size={slim ? 40 : 64}>
        {connections}
      </Ring>
      <span className="min-w-0 flex-1">
        <span className="block text-[11px] font-bold uppercase tracking-[0.1em] text-ink-muted">
          Network strength
        </span>
        <span className="block truncate text-[14.5px] font-bold leading-snug">
          {progress.tier ? progress.tier.name : "Just getting started"}
        </span>
        {slim ? null : (
          <span className="block text-[13px] text-ink-muted">
            {progress.next
              ? `Meet ${progress.left} more ${progress.left === 1 ? "person" : "people"} to reach ${progress.next.name}`
              : "You are at the top. Keep it going."}
          </span>
        )}
      </span>
      {slim && progress.next ? (
        <span className="shrink-0 text-[12.5px] text-ink-muted">
          {progress.left} to {progress.next.name}
        </span>
      ) : null}
      <ChevronRightIcon aria-hidden="true" className="size-4 shrink-0 text-ink-muted" />
    </Link>
  );
}

/** People to meet: small cards in a row you can swipe, each with a one-tap hello. */
export function PeopleToMeet() {
  const { slug } = useCollege();
  const people = useLoad(() => api.network.suggestions(slug, 6), [slug]);
  const [target, setTarget] = React.useState<NetworkSuggestion | null>(null);
  const [sent, setSent] = React.useState<Set<string>>(() => new Set());
  if (slug === "global" || people.status !== "ready") return null;
  const list = people.data.filter((p) => !sent.has(p.user_id));
  if (list.length === 0) return null;
  return (
    <section aria-label="People to meet" className="-mx-5 md:mx-0">
      <div className="flex items-center justify-between px-5 md:px-0">
        <h2 className="text-[14px] font-bold">People to meet</h2>
        <Link href={`/c/${slug}/people`} className="text-[12.5px] font-semibold text-[#b9b4ee]">
          See all
        </Link>
      </div>
      <ul className="no-scrollbar mt-2 flex snap-x scroll-px-5 gap-3 overflow-x-auto px-5 pb-1 md:px-0">
        {list.map((person) => (
          <li
            key={person.user_id}
            className="glass-card flex w-[148px] shrink-0 snap-start flex-col items-center gap-1.5 rounded-[20px] p-3 text-center"
          >
            <Link href={`/c/${slug}/people/${person.user_id}`} className="rounded-full">
              <Avatar name={person.display_name} src={person.avatar_url} size="lg" />
            </Link>
            <span className="w-full truncate text-[13.5px] font-semibold">
              {person.display_name}
            </span>
            <span className="line-clamp-2 min-h-8 text-[11.5px] leading-snug text-ink-muted">
              {person.mutual > 0
                ? `${person.mutual} mutual ${person.mutual === 1 ? "connection" : "connections"}`
                : person.shared_interests.length
                  ? `Both like ${person.shared_interests.slice(0, 2).join(", ")}`
                  : [person.branch, person.grad_year].filter(Boolean).join(" · ") || "Classmate"}
            </span>
            <Button
              type="button"
              size="sm"
              variant="outline"
              className="w-full"
              onClick={() => setTarget(person)}
            >
              Say hi
            </Button>
          </li>
        ))}
      </ul>
      <SayHi
        key={target?.user_id ?? "none"}
        person={target}
        slug={slug}
        onClose={() => setTarget(null)}
        onSent={(id) => {
          setSent((old) => new Set(old).add(id));
          setTarget(null);
        }}
      />
    </section>
  );
}

function SayHi({
  person,
  slug,
  onClose,
  onSent,
}: {
  person: NetworkSuggestion | null;
  slug: string;
  onClose: () => void;
  onSent: (id: string) => void;
}) {
  const [text, setText] = React.useState(() =>
    person
      ? (openers(person.display_name.split(/\s+/)[0] ?? "", person.shared_interests)[0] ?? "")
      : "",
  );
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const first = person?.display_name.split(/\s+/)[0] ?? "";
  const choices = person ? openers(first, person.shared_interests) : [];

  async function send() {
    if (!person || busy || !text.trim()) return;
    setBusy(true);
    setError(null);
    try {
      await api.messages.send(slug, person.user_id, text.trim());
      onSent(person.user_id);
    } catch (caught) {
      setError(
        caught instanceof ApiError && caught.code === "RATE_LIMITED"
          ? "You have sent a lot of requests today. Try again tomorrow."
          : friendlyMessage(caught, "We could not send that. Please try again."),
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <Dialog open={!!person} onOpenChange={(open) => (open ? null : onClose())}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Say hi to {first}</DialogTitle>
          <DialogDescription>
            They get a request and choose whether to chat. Pick a line or write your own.
          </DialogDescription>
        </DialogHeader>
        <div className="flex flex-wrap gap-2">
          {choices.map((line) => (
            <button
              key={line}
              type="button"
              onClick={() => setText(line)}
              className="glass-clear rounded-full px-3 py-1.5 text-left text-[12.5px] outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              {line}
            </button>
          ))}
        </div>
        <label htmlFor="sayhi-body" className="sr-only">
          Your message
        </label>
        <textarea
          id="sayhi-body"
          value={text}
          onChange={(event) => setText(event.target.value)}
          maxLength={500}
          rows={3}
          className="glass-clear w-full resize-none rounded-2xl p-3 text-[16px] outline-none focus-visible:ring-2 focus-visible:ring-ring md:text-[14.5px]"
        />
        {error ? <p className="text-[13px] text-red-300">{error}</p> : null}
        <DialogFooter>
          <Button type="button" variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button type="button" onClick={() => void send()} disabled={busy || !text.trim()}>
            <SendIcon aria-hidden="true" /> Send request
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
