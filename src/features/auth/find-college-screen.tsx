"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { ArrowRightIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { FormField } from "@/components/ui/form-field";
import { Input } from "@/components/ui/input";
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
    </AuthFrame>
  );
}
