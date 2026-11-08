"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowRightIcon, GlobeIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { FormField } from "@/components/ui/form-field";
import { Input } from "@/components/ui/input";
import { GLOBAL_SLUG } from "@/lib/home-path";
import { AuthFrame } from "./auth-frame";

/** Turn what a person typed (a link, or just the college code) into the college code. */
export function collegeCodeFrom(input: string): string | null {
  const text = input.trim().toLowerCase();
  const fromLink = /\/c\/([a-z0-9-]+)/.exec(text);
  const code = fromLink ? fromLink[1] : text;
  return code && /^[a-z0-9][a-z0-9-]{1,38}[a-z0-9]$/.test(code) ? code : null;
}

/** For a person who is signed in but belongs to no college yet: enter the college code or paste its link. */
export function FindCollegeScreen() {
  const router = useRouter();
  const [value, setValue] = React.useState("");
  const [error, setError] = React.useState<string | undefined>();

  function submit(event: React.FormEvent) {
    event.preventDefault();
    const code = collegeCodeFrom(value);
    if (!code) {
      setError("Enter the college code or paste the link your college sent you.");
      return;
    }
    router.push(`/c/${code}`);
  }

  return (
    <AuthFrame
      eyebrow="Your college"
      title="Which college are you at?"
      intro="Every college has its own private space with its own link. Paste the link your college sent you, or type its short code."
    >
      <form onSubmit={submit} className="flex flex-col gap-5" noValidate>
        <FormField label="College link or code" error={error} required>
          <Input
            name="college"
            value={value}
            onChange={(event) => setValue(event.target.value)}
            autoCapitalize="none"
            autoComplete="off"
            spellCheck={false}
            autoFocus
            placeholder="studentos.app/c/your-college"
          />
        </FormField>
        <div>
          <Button type="submit" size="lg">
            Continue <ArrowRightIcon aria-hidden="true" />
          </Button>
        </div>
      </form>
      <div className="mt-10 border-t border-border pt-6">
        <h2 className="text-[18px] font-semibold">Your college is not on StudentOS yet?</h2>
        <p className="mt-1 max-w-prose text-[16px] leading-relaxed text-ink-muted">
          No problem, and no college email needed. Global is open to every student. Your profile
          shows that no college has verified you.
        </p>
        <Button asChild variant="outline" size="lg" className="mt-4">
          <Link href={`/c/${GLOBAL_SLUG}/join`}>
            <GlobeIcon aria-hidden="true" /> Join Global
          </Link>
        </Button>
      </div>
    </AuthFrame>
  );
}
