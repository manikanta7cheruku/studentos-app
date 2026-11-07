"use client";

import * as React from "react";
import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  ArrowLeftIcon,
  UploadIcon,
  CheckIcon,
  ShieldIcon,
  EyeIcon,
  EyeOffIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
  CardFooter,
} from "@/components/ui/card";
import { FormField } from "@/components/ui/form-field";
import { ErrorSummary } from "@/components/ui/error-summary";
import { useProfileData } from "../use-profile-data";
import type { ProfileData } from "../types";
import { AVATAR_MAX_BYTES } from "@/contracts/profile";

export interface ProfileEditScreenProps {
  initialProfile?: ProfileData | null;
}

interface ProfileEditFormProps {
  profile: ProfileData | null;
  updateProfile: (patch: Partial<ProfileData>) => Promise<ProfileData>;
  uploadAvatar: (file: File) => Promise<string>;
}

function ProfileEditForm({ profile, updateProfile, uploadAvatar }: ProfileEditFormProps) {
  const router = useRouter();

  const [displayName, setDisplayName] = useState(profile?.display_name ?? "");
  const [handle, setHandle] = useState(profile?.handle ?? "");
  const [headline, setHeadline] = useState(profile?.headline ?? "");
  const [bio, setBio] = useState(profile?.bio ?? "");
  const [interestsText, setInterestsText] = useState(profile?.interests?.join(", ") ?? "");
  const [careerGoal, setCareerGoal] = useState(profile?.career_goal ?? "");
  const [visibility, setVisibility] = useState<"college" | "hidden">(
    profile?.visibility ?? "college",
  );
  const [portfolioPublic, setPortfolioPublic] = useState(profile?.portfolio_public ?? false);

  const [avatarPreview, setAvatarPreview] = useState<string | null>(profile?.avatar_url ?? null);
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarError, setAvatarError] = useState<string | null>(null);

  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const [isUploading, setIsUploading] = useState(false);

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    setAvatarError(null);
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      setAvatarError("Please select a valid image file (PNG, JPG, WebP, GIF, SVG).");
      return;
    }

    if (file.size > AVATAR_MAX_BYTES) {
      setAvatarError("Image file size must be 2 MB or smaller.");
      return;
    }

    setAvatarFile(file);
    const objectUrl = URL.createObjectURL(file);
    setAvatarPreview(objectUrl);
  }

  async function handleAvatarUpload() {
    if (!avatarFile) return;
    setIsUploading(true);
    setAvatarError(null);
    try {
      const url = await uploadAvatar(avatarFile);
      setAvatarPreview(url);
      setAvatarFile(null);
      toast.success("Avatar image uploaded successfully!");
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Failed to upload avatar.";
      setAvatarError(message);
      toast.error(message);
    } finally {
      setIsUploading(false);
    }
  }

  function validate(): boolean {
    const errors: Record<string, string> = {};

    if (!displayName.trim()) {
      errors.display_name = "Display name is required.";
    } else if (displayName.length > 80) {
      errors.display_name = "Display name must be 80 characters or fewer.";
    }

    if (handle) {
      const trimmed = handle.trim();
      if (!/^[a-z0-9_]{3,30}$/.test(trimmed)) {
        errors.handle = "Handle must be 3-30 lowercase letters, numbers, or underscores.";
      }
    }

    if (headline && headline.length > 120) {
      errors.headline = "Headline must be 120 characters or fewer.";
    }

    if (bio && bio.length > 1000) {
      errors.bio = "Bio must be 1000 characters or fewer.";
    }

    if (careerGoal && careerGoal.length > 200) {
      errors.career_goal = "Career goal must be 200 characters or fewer.";
    }

    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setFormError(null);

    if (!validate()) {
      toast.error("Please fix the validation errors below.");
      return;
    }

    const interests = interestsText
      .split(",")
      .map((item) => item.trim())
      .filter(Boolean)
      .slice(0, 20);

    startTransition(async () => {
      try {
        await updateProfile({
          display_name: displayName.trim(),
          handle: handle.trim() || null,
          headline: headline.trim() || null,
          bio: bio.trim() || null,
          interests,
          career_goal: careerGoal.trim() || null,
          visibility,
          portfolio_public: portfolioPublic,
        });

        toast.success("Profile saved successfully.");
        router.push("/me");
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : "Failed to save profile.";
        setFormError(message);
        toast.error(message);
      }
    });
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="flex flex-col gap-6 w-full max-w-4xl mx-auto py-8 px-4 sm:px-6"
    >
      <div className="flex items-center justify-between">
        <Button variant="ghost" asChild className="gap-2 -ml-2">
          <Link href="/me">
            <ArrowLeftIcon className="size-4" />
            Back to Profile
          </Link>
        </Button>
      </div>

      {formError ? (
        <ErrorSummary errors={[{ fieldId: "display_name", message: formError }]} />
      ) : null}

      {/* Avatar Section Card */}
      <Card>
        <CardHeader>
          <CardTitle className="text-xl">Profile Photo</CardTitle>
          <CardDescription>
            Upload a photo or avatar image (PNG, JPG, WebP, GIF, SVG up to 2 MB).
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col sm:flex-row items-start sm:items-center gap-6">
          {avatarPreview ? (
            /* eslint-disable-next-line @next/next/no-img-element */
            <img
              src={avatarPreview}
              alt="Avatar preview"
              className="size-24 rounded-full object-cover border border-border"
            />
          ) : (
            <div className="size-24 rounded-full bg-accent-soft text-accent flex items-center justify-center font-heading text-2xl font-bold border border-border">
              {displayName ? displayName[0]?.toUpperCase() : "U"}
            </div>
          )}

          <div className="flex flex-col gap-3">
            <div className="flex items-center gap-3">
              <input
                id="avatar-file-input"
                type="file"
                accept="image/*"
                onChange={handleFileChange}
                className="text-base file:mr-4 file:py-2 file:px-4 file:rounded-input file:border-0 file:text-base file:font-semibold file:bg-accent-soft file:text-accent hover:file:bg-accent-soft/80"
              />
              {avatarFile ? (
                <Button
                  type="button"
                  onClick={handleAvatarUpload}
                  disabled={isUploading}
                  className="min-h-11 flex items-center gap-2"
                >
                  <UploadIcon className="size-4" />
                  {isUploading ? "Uploading..." : "Upload Photo"}
                </Button>
              ) : null}
            </div>
            {avatarError ? (
              <p className="text-base font-medium text-destructive">{avatarError}</p>
            ) : null}
          </div>
        </CardContent>
      </Card>

      {/* Basic Info Card */}
      <Card>
        <CardHeader>
          <CardTitle className="text-xl">Personal Information</CardTitle>
          <CardDescription>How you appear to fellow students in your college.</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-5">
          <FormField
            label="Display Name"
            required
            help="Your real full name or known name on campus."
            error={fieldErrors.display_name}
          >
            <Input
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              placeholder="e.g. Riya Sharma"
              maxLength={80}
            />
          </FormField>

          <FormField
            label="Handle"
            help="Unique handle for your public profile, between 3 and 30 lowercase characters."
            error={fieldErrors.handle}
          >
            <Input
              value={handle}
              onChange={(e) => setHandle(e.target.value.toLowerCase().trim())}
              placeholder="e.g. riya_alpha"
              maxLength={30}
            />
          </FormField>

          <FormField
            label="Headline"
            help="A brief phrase describing your study year, branch, or primary passion."
            error={fieldErrors.headline}
          >
            <Input
              value={headline}
              onChange={(e) => setHeadline(e.target.value)}
              placeholder="e.g. Second year CSE, passionate about web systems"
              maxLength={120}
            />
          </FormField>

          <FormField
            label="About (Bio)"
            help="Tell your college peers about your projects, experience, or what you like working on."
            error={fieldErrors.bio}
          >
            <Textarea
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              placeholder="Tell others about your background, interests, and collaborative projects..."
              rows={4}
              maxLength={1000}
            />
          </FormField>
        </CardContent>
      </Card>

      {/* Interests & Goals Card */}
      <Card>
        <CardHeader>
          <CardTitle className="text-xl">Interests & Career</CardTitle>
          <CardDescription>
            Help classmates discover mutual interests for hackathons and projects.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-5">
          <FormField
            label="Interests"
            help="Comma-separated topics (e.g. web, design, robotics, ai)."
            error={fieldErrors.interests}
          >
            <Input
              value={interestsText}
              onChange={(e) => setInterestsText(e.target.value)}
              placeholder="web, design, machine learning, systems"
            />
          </FormField>

          <FormField
            label="Career Goal"
            help="Your post-graduation focus or target role."
            error={fieldErrors.career_goal}
          >
            <Input
              value={careerGoal}
              onChange={(e) => setCareerGoal(e.target.value)}
              placeholder="e.g. Full-stack software engineer"
              maxLength={200}
            />
          </FormField>
        </CardContent>
      </Card>

      {/* Privacy and Visibility Card */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <ShieldIcon className="size-5 text-accent" />
            <CardTitle className="text-xl">Privacy & Visibility</CardTitle>
          </div>
          <CardDescription>
            Control who can discover your profile across your college network.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-6">
          <div className="flex flex-col gap-3">
            <Label className="text-base font-semibold">Directory Visibility</Label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <label
                className={`flex items-start gap-3 p-4 rounded-card border cursor-pointer transition-colors ${
                  visibility === "college"
                    ? "border-accent bg-accent-soft text-foreground"
                    : "border-border bg-surface text-muted-foreground"
                }`}
              >
                <input
                  type="radio"
                  name="visibility"
                  value="college"
                  checked={visibility === "college"}
                  onChange={() => setVisibility("college")}
                  className="mt-1"
                />
                <div>
                  <div className="flex items-center gap-2 font-semibold text-foreground">
                    <EyeIcon className="size-4 text-accent" />
                    Visible to your college
                  </div>
                  <p className="text-base text-muted-foreground mt-1">
                    Classmates and active members in your college can view your profile and find you
                    in directory search.
                  </p>
                </div>
              </label>

              <label
                className={`flex items-start gap-3 p-4 rounded-card border cursor-pointer transition-colors ${
                  visibility === "hidden"
                    ? "border-accent bg-accent-soft text-foreground"
                    : "border-border bg-surface text-muted-foreground"
                }`}
              >
                <input
                  type="radio"
                  name="visibility"
                  value="hidden"
                  checked={visibility === "hidden"}
                  onChange={() => setVisibility("hidden")}
                  className="mt-1"
                />
                <div>
                  <div className="flex items-center gap-2 font-semibold text-foreground">
                    <EyeOffIcon className="size-4 text-warning" />
                    Hidden from classmates
                  </div>
                  <p className="text-base text-muted-foreground mt-1">
                    Your profile will not appear in the member list or directory for anyone else.
                  </p>
                </div>
              </label>
            </div>
          </div>

          <div className="flex items-start gap-3 border-t border-border pt-4">
            <Checkbox
              id="portfolio-public"
              checked={portfolioPublic}
              onCheckedChange={(checked) => setPortfolioPublic(Boolean(checked))}
            />
            <div className="grid gap-1.5 leading-none">
              <Label htmlFor="portfolio-public" className="text-base font-semibold cursor-pointer">
                Enable Public Portfolio
              </Label>
              <p className="text-base text-muted-foreground">
                Allows external viewers with your handle link to view your verified projects
                portfolio.
              </p>
            </div>
          </div>
        </CardContent>

        <CardFooter className="flex items-center justify-between border-t border-border py-4">
          <Button variant="outline" type="button" asChild className="min-h-11">
            <Link href="/me">Cancel</Link>
          </Button>
          <Button type="submit" disabled={isPending} className="min-h-11 flex items-center gap-2">
            <CheckIcon className="size-4" />
            {isPending ? "Saving..." : "Save Changes"}
          </Button>
        </CardFooter>
      </Card>
    </form>
  );
}

export function ProfileEditScreen({ initialProfile }: ProfileEditScreenProps) {
  const { data: profile, isLoading, updateProfile, uploadAvatar } = useProfileData(initialProfile);

  if (isLoading && !profile) {
    return (
      <div className="flex flex-col gap-6 w-full max-w-4xl mx-auto py-8 px-4 sm:px-6">
        <p className="text-base text-muted-foreground">Loading profile form...</p>
      </div>
    );
  }

  return (
    <ProfileEditForm
      key={profile?.user_id ?? "profile-form"}
      profile={profile}
      updateProfile={updateProfile}
      uploadAvatar={uploadAvatar}
    />
  );
}
