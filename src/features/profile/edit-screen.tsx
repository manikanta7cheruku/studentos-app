"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { CameraIcon } from "lucide-react";
import { AVATAR_MAX_BYTES, avatarAllowedMimeTypes } from "@/contracts/profile";
import { Banner } from "@/components/ui/banner";
import { Button } from "@/components/ui/button";
import { FormField } from "@/components/ui/form-field";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { Avatar } from "@/components/app/avatar";
import { ToggleRow } from "@/components/app/toggle-row";
import { LoadError } from "@/components/app/load-error";
import { PageHeader } from "@/components/app/page-header";
import { Spinner } from "@/components/app/spinner";
import { ApiError, friendlyMessage } from "@/lib/api-client";
import { api, type Profile } from "@/lib/api/endpoints";
import { compressImage } from "@/lib/compress-image";
import { useLoad } from "@/lib/use-load";
import { useCollege } from "@/features/college";
import {
  BirthYearPicker,
  CASUAL_INTERESTS,
  InterestChips,
  PHONE_OK,
  PhoneFields,
  SexField,
  TECH_INTERESTS,
  normalisePhone,
  type Sex,
} from "./about-fields";

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
    tech_interests?: string[];
    excited_by?: string;
    sex?: Sex | null;
    sex_public?: boolean;
    age_public?: boolean;
    birth_year?: number | null;
    phone?: string;
    share_phone?: boolean;
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
  if (
    form.tech_interests !== undefined &&
    JSON.stringify(form.tech_interests) !== JSON.stringify(saved.tech_interests)
  )
    patch.tech_interests = form.tech_interests;
  if (form.excited_by !== undefined && text(form.excited_by) !== saved.excited_by)
    patch.excited_by = text(form.excited_by);
  if (form.sex !== undefined && form.sex !== saved.sex) patch.sex = form.sex;
  if (form.age_public !== undefined && form.age_public !== saved.age_public)
    patch.age_public = form.age_public;
  if (form.sex_public !== undefined && form.sex_public !== saved.sex_public)
    patch.sex_public = form.sex_public;
  if (form.birth_year !== undefined && form.birth_year !== saved.birth_year)
    patch.birth_year = form.birth_year;
  if (form.phone !== undefined) {
    const number = form.phone.trim() ? normalisePhone(form.phone) : null;
    if (number !== saved.phone) patch.phone = number;
    const visibility = number && form.share_phone ? "hosts" : "hidden";
    if (visibility !== saved.phone_visibility) patch.phone_visibility = visibility;
  }
  return patch;
}

function uploadMessage(caught: unknown): string {
  if (caught instanceof ApiError && caught.code === "VALIDATION_FAILED")
    return "That picture could not be used. Try a JPEG or PNG under 2 MB.";
  return friendlyMessage(
    caught,
    "We could not upload that picture. Check your connection and try again.",
  );
}

function Section({
  title,
  text,
  children,
}: {
  title: string;
  text?: string;
  children: React.ReactNode;
}) {
  const id = React.useId();
  return (
    <section
      aria-labelledby={id}
      className="glass-card flex flex-col gap-4 rounded-[22px] p-4 md:p-5"
    >
      <div>
        <h2 id={id} className="text-[15px] font-bold">
          {title}
        </h2>
        {text ? <p className="text-[12.5px] text-ink-muted">{text}</p> : null}
      </div>
      {children}
    </section>
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
      // Shrunk first (at most 512 pixels, WebP): it is small, and the camera's metadata is gone.
      // If shrinking or the shrunk file fails for any reason, the original is sent instead.
      let saved;
      try {
        const small = await compressImage(file, { maxEdge: 512, maxBytes: 300_000 });
        saved = await api.profile.uploadAvatar(
          new File([small], "avatar.webp", { type: small.type }),
        );
      } catch (first) {
        if (first instanceof ApiError && first.status >= 500) throw first;
        saved = await api.profile.uploadAvatar(file);
      }
      setUrl(saved.avatar_url);
      onChanged();
    } catch (caught) {
      setError(uploadMessage(caught));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex flex-col items-center gap-4 text-center sm:flex-row sm:text-left">
      <Avatar name={profile.display_name} src={url} size="xl" />
      <div className="flex flex-col items-center gap-2 sm:items-start">
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
    tech_interests: saved.tech_interests,
    excited_by: saved.excited_by ?? "",
    sex: saved.sex as Sex | null,
    sex_public: saved.sex_public,
    age_public: saved.age_public,
    birth_year: saved.birth_year,
    phone: saved.phone ?? "",
    share_phone: saved.phone_visibility === "hosts",
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
    if (form.phone.trim() && !PHONE_OK.test(normalisePhone(form.phone)))
      problems.phone = "Use the form +919876543210.";
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
    <form onSubmit={submit} className="flex max-w-xl flex-col gap-4" noValidate>
      <Section title="Photo">
        <PhotoField profile={saved} onChanged={() => void refreshProfile()} />
      </Section>
      <Section title="You" text="What verified classmates see first.">
        <FormField label="Name" error={fields.display_name} required>
          <Input
            value={form.display_name}
            onChange={(e) => set("display_name", e.target.value)}
            maxLength={80}
            autoComplete="name"
          />
        </FormField>
        <FormField
          label="Username"
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
            rows={4}
          />
        </FormField>
        <FormField
          label="What makes you excited?"
          help="One line on your profile."
          error={fields.excited_by}
        >
          <Textarea
            value={form.excited_by}
            onChange={(e) => set("excited_by", e.target.value)}
            maxLength={200}
            rows={2}
          />
        </FormField>
      </Section>
      <Section title="Interests" text="Pick a few. Add your own below each list.">
        <InterestChips
          title="For fun"
          suggestions={CASUAL_INTERESTS}
          value={form.interests}
          onChange={(next) => set("interests", next)}
          room={20 - form.interests.length}
          placeholder="Something else you enjoy"
        />
        <InterestChips
          title="Tech and career"
          suggestions={TECH_INTERESTS}
          value={form.tech_interests}
          onChange={(next) => set("tech_interests", next)}
          room={20 - form.tech_interests.length}
          placeholder="Another skill or field"
        />
        <FormField label="Career goal" error={fields.career_goal}>
          <Input
            value={form.career_goal}
            onChange={(e) => set("career_goal", e.target.value)}
            maxLength={200}
            placeholder="Embedded systems engineer"
          />
        </FormField>
      </Section>
      <Section
        title="Private details"
        text="Only you can see these, unless you choose to show your gender or age."
      >
        <div className="flex flex-col gap-2">
          <p className="text-[13px] font-semibold text-ink/90">Gender</p>
          <SexField value={form.sex} onChange={(next) => set("sex", next)} />
          {form.sex && form.sex !== "prefer_not_to_say" ? (
            <ToggleRow
              checked={form.sex_public}
              onChange={(next) => set("sex_public", next)}
              title="Show it on my profile"
              text="Classmates who can see your profile see your gender. Off by default."
            />
          ) : null}
        </div>
        <div className="flex flex-col gap-2">
          <p className="text-[13px] font-semibold text-ink/90">
            Birth year <span className="font-normal text-ink-muted">(optional)</span>
          </p>
          <BirthYearPicker value={form.birth_year} onChange={(next) => set("birth_year", next)} />
          {form.birth_year ? (
            <ToggleRow
              checked={form.age_public}
              onChange={(next) => set("age_public", next)}
              title="Show my age on my profile"
              text="Classmates see your age in years, never the year you were born. Off by default."
            />
          ) : null}
        </div>
        <PhoneFields
          phone={form.phone}
          onPhone={(next) => set("phone", next)}
          share={form.share_phone}
          onShare={(next) => set("share_phone", next)}
          error={fields.phone}
        />
      </Section>
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
    <div className="mx-auto flex w-full max-w-4xl flex-col gap-8 px-5 pt-4 pb-2 md:px-8 md:py-8">
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
