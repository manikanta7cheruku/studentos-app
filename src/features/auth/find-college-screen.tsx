"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { ArrowRightIcon, GraduationCapIcon, GlobeIcon, LockIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ChoiceCard } from "@/components/app/choice-card";
import { GLOBAL_SLUG } from "@/lib/home-path";
import { AuthFrame } from "./auth-frame";

/** Turn what a person typed (a link, or just the college code) into the college code. */
export function collegeCodeFrom(input: string): string | null {
  const text = input.trim().toLowerCase();
  const fromLink = /\/c\/([a-z0-9-]+)/.exec(text);
  const code = fromLink ? fromLink[1] : text;
  return code && /^[a-z0-9][a-z0-9-]{1,38}[a-z0-9]$/.test(code) ? code : null;
}

/**
 * For a person who is signed in but belongs to no space yet. For this launch everyone starts on Global; the college space is
 * shown, locked, with what it will be, because it opens as colleges join (src/lib/features.ts).
 */
export function FindCollegeScreen() {
  const router = useRouter();

  function submit(event: React.FormEvent) {
    event.preventDefault();
    router.push(`/c/${GLOBAL_SLUG}/join`);
  }

  return (
    <AuthFrame
      title="Where do you want to be?"
      intro="Start on Global now. Your college space opens as we team up with colleges."
    >
      <form onSubmit={submit} className="flex flex-col gap-3" noValidate>
        <div role="radiogroup" aria-label="Where do you want to be" className="flex flex-col gap-3">
          <ChoiceCard
            selected
            onSelect={() => undefined}
            icon={<GlobeIcon aria-hidden="true" />}
            title="Global"
            text="Open to every student. Plans, debates and ideas from everywhere. No college email needed."
          />
          <div
            aria-disabled="true"
            className="flex w-full items-center gap-3.5 rounded-[22px] border border-white/10 bg-white/[0.03] p-4 opacity-80"
          >
            <span className="inline-flex size-12 shrink-0 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.07] text-ink-muted [&_svg]:size-5">
              <GraduationCapIcon aria-hidden="true" />
            </span>
            <span className="min-w-0 flex-1">
              <span className="flex items-center gap-2 text-[16px] font-bold">
                My college
                <span className="rounded-full bg-white/10 px-2 py-0.5 text-[10.5px] font-bold uppercase tracking-wide text-[#f0c36a]">
                  Coming soon
                </span>
              </span>
              <span className="mt-0.5 block text-[13px] leading-snug text-ink-muted">
                A private space for your campus.
              </span>
            </span>
          </div>
        </div>

        <p className="glass-clear mt-1 flex items-start gap-2.5 rounded-2xl p-3.5 text-[13px] leading-relaxed text-ink-muted">
          <LockIcon aria-hidden="true" className="mt-0.5 size-4 shrink-0" />
          <span>
            <b className="font-semibold text-ink">Your college ecosystem is on its way.</b>{" "}
            Everything you do there stays inside your college and never goes public. We are teaming
            up with colleges now, and it opens campus by campus.
          </span>
        </p>

        <Button type="submit" size="lg" className="mt-2 h-12 w-full text-[15px]">
          Continue with Global <ArrowRightIcon aria-hidden="true" />
        </Button>
      </form>
    </AuthFrame>
  );
}
