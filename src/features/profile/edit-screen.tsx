"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { CameraIcon, XIcon } from "lucide-react";
import { AVATAR_MAX_BYTES, avatarAllowedMimeTypes } from "@/contracts/profile";
import { Banner } from "@/components/ui/banner";
import { Button } from "@/components/ui/button";
import { FormField } from "@/components/ui/form-field";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { Avatar } from "@/components/app/avatar";
import { LoadError } from "@/components/app/load-error";
import { PageHeader } from "@/components/app/page-header";
import { Spinner } from "@/components/app/spinner";
import { ApiError, friendlyMessage } from "@/lib/api-client";
import { api, type Profile } from "@/lib/api/endpoints";
import { useLoad } from "@/lib/use-load";
import { useCollege } from "@/features/college";

const HANDLE = /^[a-z0-9_]{3,30}$/;

/** What changed between the saved profile and the form. Only these fields are sent. */
export function profileChanges(
  saved: Profile,
  form: {
    display_name: string;
    handle: string;
    headline: string;
    bio: string;
    career_goal: string;
    interests: string[];
  },
) {
  const patch: Record<string, unknown> = {};
  const text = (value: string) => (value.trim() === "" ? null : value.trim());
  if (form.display_name.trim() !== saved.display_name)
    patch.display_name = form.display_name.trim();
  if (text(form.handle) !== saved.handle) patch.handle = text(form.handle);
  if (text(form.headline) !== saved.headline) patch.headline = text(form.headline);
  if (text(form.bio) !== saved.bio) patch.bio = text(form.bio);
  if (text(form.career_goal) !== saved.career_goal) patch.career_goal = text(form.career_goal);
  if (JSON.stringify(form.interests) !== JSON.stringify(saved.interests))
    patch.interests = form.interests;
  return patch;
}

function InterestsField({
  value,
  onChange,
  error,
}: {
  value: string[];
  onChange: (next: string[]) => void;
  error?: string;
}) {
  const [draft, setDraft] = React.useState("");

  function addAll(items: string[]) {
    const next = [...value];
    for (const raw of items) {
      const item = raw.trim();
      if (!item || item.length > 40 || next.length >= 20) continue;
      if (next.some((v) => v.toLowerCase() === item.toLowerCase())) continue;
      next.push(item);
    }
    if (next.length !== value.length) onChange(next);
  }

  function add() {
    addAll([draft]);
    setDraft("");
  }

  // A comma ends an interest, also when it arrives from a paste or a phone keyboard.
  function typed(text: string) {
    if (!text.includes(",")) {
      setDraft(text);
      return;
    }
    const parts = text.split(",");
    addAll(parts.slice(0, -1));
    setDraft(parts[parts.length - 1] ?? "");
  }

  return (
    <div className="flex flex-col gap-3">
      <FormField
        label="Interests"
        help="Press Enter or comma after each one. Up to 20."
        error={error}
      >
        <Input
          value={draft}
          onChange={(event) => typed(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter" || event.key === ",") {
              event.preventDefault();
              add();
            } else if (event.key === "Backspace" && !draft && value.length) {
              onChange(value.slice(0, -1));
            }
          }}
          onBlur={add}
          placeholder="Robotics, design, football"
          enterKeyHint="done"
        />
      </FormField>
      {value.length ? (
        <ul className="flex flex-wrap gap-2">
          {value.map((interest) => (
            <li key={interest}>
              <span className="inline-flex min-h-9 items-center gap-1 rounded-full border border-border bg-surface pl-3 text-[13.5px]">
                {interest}
                <button
                  type="button"
                  onClick={() => onChange(value.filter((v) => v !== interest))}
                  aria-label={`Remove ${interest}`}
                  className="inline-flex size-9 items-center justify-center rounded-full text-ink-muted hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  <XIcon aria-hidden="true" className="size-4" />
                </button>
              </span>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}

function PhotoField({ profile, onChanged }: { profile: Profile; onChanged: () => void }) {
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [url, setUrl] = React.useState(profile.avatar_url);
  const input = React.useRef<HTMLInputElement>(null);

  async function pick(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    if (!(avatarAllowedMimeTypes as readonly string[]).includes(file.type)) {
      setError("Use a JPEG, PNG, WebP, GIF or AVIF picture.");
      return;
    }
    if (file.size > AVATAR_MAX_BYTES) {
      setError("That picture is larger than 2 MB. Pick a smaller one.");
      return;
    }
    setError(null);
    setBusy(true);
    try {
      const saved = await api.profile.uploadAvatar(file);
      setUrl(saved.avatar_url);
      onChanged();
    } catch (caught) {
      setError(friendlyMessage(caught, "We could not upload that picture."));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex items-center gap-5">
      <Avatar name={profile.display_name} src={url} size="xl" />
      <div className="flex flex-col items-start gap-2">
        <input
          ref={input}
          type="file"
          accept={avatarAllowedMimeTypes.join(",")}
          onChange={(event) => void pick(event)}
          className="sr-only"
          tabIndex={-1}
          aria-hidden="true"
        />
        <Button
          type="button"
          variant="outline"
          disabled={busy}
          onClick={() => input.current?.click()}
        >
          {busy ? <Spinner /> : <CameraIcon aria-hidden="true" />}
          {busy ? "Uploading" : url ? "Change photo" : "Add a photo"}
        </Button>
        <p className="text-[13px] text-ink-muted">JPEG, PNG, WebP, GIF or AVIF, up to 2 MB.</p>
        {error ? (
          <p role="alert" className="text-[13.5px] font-medium text-danger">
            {error}
          </p>
        ) : null}
      </div>
    </div>
  );
}

function EditForm({ saved }: { saved: Profile }) {
  const { slug, refreshProfile } = useCollege();
  const router = useRouter();
  const [form, setForm] = React.useState({
    display_name: saved.display_name,
    handle: saved.handle ?? "",
    headline: saved.headline ?? "",
    bio: saved.bio ?? "",
    career_goal: saved.career_goal ?? "",
    interests: saved.interests,
  });
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [fields, setFields] = React.useState<Record<string, string>>({});

  const set = <K extends keyof typeof form>(key: K, value: (typeof form)[K]) =>
    setForm((current) => ({ ...current, [key]: value }));

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (busy) return;
    const problems: Record<string, string> = {};
    if (!form.display_name.trim()) problems.display_name = "Enter the name classmates will see.";
    if (form.handle.trim() && !HANDLE.test(form.handle.trim()))
      problems.handle = "Use 3 to 30 lowercase letters, numbers or underscores.";
    setFields(problems);
    if (Object.keys(problems).length) return;

    const patch = profileChanges(saved, form);
    if (Object.keys(patch).length === 0) {
      router.push(`/c/${slug}/me`);
      return;
    }
    setBusy(true);
    setError(null);
    try {
      await api.profile.patch(patch);
      await refreshProfile();
      router.push(`/c/${slug}/me`);
    } catch (caught) {
      if (caught instanceof ApiError && caught.code === "VALIDATION_FAILED") {
        setFields(caught.fieldErrors);
      }
      setError(friendlyMessage(caught, "We could not save your profile. Please try again."));
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} className="flex max-w-xl flex-col gap-6" noValidate>
      <PhotoField profile={saved} onChanged={() => void refreshProfile()} />
      <FormField label="Name" help="What classmates see." error={fields.display_name} required>
        <Input
          value={form.display_name}
          onChange={(e) => set("display_name", e.target.value)}
          maxLength={80}
          autoComplete="name"
        />
      </FormField>
      <FormField
        label="Handle"
        help="Optional. Lowercase letters, numbers and underscores."
        error={fields.handle}
      >
        <Input
          value={form.handle}
          onChange={(e) => set("handle", e.target.value.toLowerCase())}
          maxLength={30}
          autoCapitalize="none"
          autoComplete="off"
          spellCheck={false}
          placeholder="your_name"
        />
      </FormField>
      <FormField label="Headline" help="One line about you." error={fields.headline}>
        <Input
          value={form.headline}
          onChange={(e) => set("headline", e.target.value)}
          maxLength={120}
          placeholder="Third year CSE, building things with sensors"
        />
      </FormField>
      <FormField label="About you" error={fields.bio}>
        <Textarea
          value={form.bio}
          onChange={(e) => set("bio", e.target.value)}
          maxLength={1000}
          rows={5}
        />
      </FormField>
      <FormField label="Career goal" error={fields.career_goal}>
        <Input
          value={form.career_goal}
          onChange={(e) => set("career_goal", e.target.value)}
          maxLength={200}
          placeholder="Embedded systems engineer"
        />
      </FormField>
      <InterestsField
        value={form.interests}
        onChange={(next) => set("interests", next)}
        error={fields.interests}
      />
      {error ? (
        <Banner variant="error">
          <p>{error}</p>
        </Banner>
      ) : null}
      <div className="flex flex-wrap items-center gap-3">
        <Button type="submit" size="lg" disabled={busy}>
          {busy ? (
            <>
              <Spinner /> Saving
            </>
          ) : (
            "Save changes"
          )}
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="lg"
          onClick={() => router.push(`/c/${slug}/me`)}
        >
          Cancel
        </Button>
      </div>
    </form>
  );
}

export function EditProfileScreen() {
  const { slug } = useCollege();
  const state = useLoad(() => api.profile.get(), [slug]);
  return (
    <div className="mx-auto flex w-full max-w-4xl flex-col gap-8 px-5 pt-3 md:px-8 md:py-8">
      <PageHeader
        title="Edit profile"
        description="This is what verified classmates see."
        back={{ href: `/c/${slug}/me`, label: "My profile" }}
      />
      {state.status === "loading" ? (
        <div aria-busy="true" className="flex max-w-xl flex-col gap-5">
          <Skeleton className="size-24 rounded-full" />
          <Skeleton className="h-11 w-full" />
          <Skeleton className="h-11 w-full" />
          <Skeleton className="h-28 w-full" />
        </div>
      ) : state.status === "error" ? (
        <LoadError error={state.error} onRetry={state.reload} what="your profile" />
      ) : (
        <EditForm saved={state.data} />
      )}
    </div>
  );
}
