"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { ArrowRightIcon, GraduationCapIcon, GlobeIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ChoiceCard } from "@/components/app/choice-card";
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

type Choice = "global" | "college";

/** For a person who is signed in but belongs to no space yet: Global now, or a college by its link or code. */
export function FindCollegeScreen() {
  const router = useRouter();
  const [choice, setChoice] = React.useState<Choice>("global");
  const [value, setValue] = React.useState("");
  const [error, setError] = React.useState<string | undefined>();

  function submit(event: React.FormEvent) {
    event.preventDefault();
    if (choice === "global") {
      router.push(`/c/${GLOBAL_SLUG}/join`);
      return;
    }
    const code = collegeCodeFrom(value);
    if (!code) {
      setError("Enter the college code or paste the link your college sent you.");
      return;
    }
    router.push(`/c/${code}`);
  }

  return (
    <AuthFrame
      title="Where do you want to be?"
      intro="Start on Global now. You can add your college any time, and switch from the top of the app."
    >
      <form onSubmit={submit} className="flex flex-col gap-3" noValidate>
        <div role="radiogroup" aria-label="Where do you want to be" className="flex flex-col gap-3">
          <ChoiceCard
            selected={choice === "global"}
            onSelect={() => setChoice("global")}
            icon={<GlobeIcon aria-hidden="true" />}
            title="Global"
            text="Open to every student. Plans and ideas from everywhere. No college email needed."
          />
          <ChoiceCard
            selected={choice === "college"}
            onSelect={() => setChoice("college")}
            icon={<GraduationCapIcon aria-hidden="true" />}
            title="My college"
            text="A private space for your campus. You join with your college email."
          />
        </div>

        {choice === "college" ? (
          <div className="page-enter pt-2">
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
          </div>
        ) : null}

        <Button type="submit" size="lg" className="mt-3 h-12 w-full text-[15px]">
          Continue <ArrowRightIcon aria-hidden="true" />
        </Button>
        <p className="text-center text-[12.5px] text-ink-muted">
          You can change this any time from the top of the app.
        </p>
      </form>
    </AuthFrame>
  );
}
