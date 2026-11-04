"use client";

import * as React from "react";
import Link from "next/link";
import {
  UserIcon,
  EditIcon,
  EyeIcon,
  EyeOffIcon,
  SparklesIcon,
  TargetIcon,
  AlertCircleIcon,
  RefreshCwIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { ProfileSkeleton } from "./profile-skeleton";
import { useProfileData } from "../use-profile-data";
import type { ProfileData, UserSkill } from "../types";
import { sampleUserSkills } from "../sample-data";

export interface ProfileViewScreenProps {
  initialProfile?: ProfileData | null;
  initialSkills?: UserSkill[];
  simulateEmpty?: boolean;
}

export function ProfileViewScreen({
  initialProfile,
  initialSkills = sampleUserSkills,
  simulateEmpty = false,
}: ProfileViewScreenProps) {
  const { data: profile, isLoading, error, requestId, reload } = useProfileData(initialProfile);

  if (isLoading) {
    return <ProfileSkeleton />;
  }

  if (error) {
    return (
      <div className="flex flex-col items-start gap-4 p-6 rounded-card border border-destructive bg-surface max-w-4xl mx-auto my-8">
        <div className="flex items-center gap-3 text-destructive">
          <AlertCircleIcon className="size-6 shrink-0" />
          <h2 className="font-heading text-xl font-semibold">Could not load profile</h2>
        </div>
        <p className="text-muted-foreground">{error}</p>
        {requestId ? (
          <p className="text-base text-muted-foreground font-mono">Request ID: {requestId}</p>
        ) : null}
        <Button onClick={reload} variant="outline" className="flex items-center gap-2">
          <RefreshCwIcon className="size-4" />
          Retry
        </Button>
      </div>
    );
  }

  if (simulateEmpty || !profile || !profile.display_name) {
    return (
      <div className="max-w-4xl mx-auto py-8">
        <EmptyState
          icon={<UserIcon />}
          title="No profile details found"
          description="Your profile is not setup yet. Fill in your name, headline, and bio to get started."
          action={
            <Button asChild>
              <Link href="/me/edit">Create Profile</Link>
            </Button>
          }
        />
      </div>
    );
  }

  const initials = profile.display_name
    .split(" ")
    .map((n) => n[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase();

  return (
    <div className="flex flex-col gap-6 w-full max-w-4xl mx-auto py-8 px-4 sm:px-6">
      {/* Top Header Card */}
      <Card>
        <CardHeader className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6 pb-6">
          <div className="flex items-center gap-5">
            {profile.avatar_url ? (
              /* eslint-disable-next-line @next/next/no-img-element */
              <img
                src={profile.avatar_url}
                alt={profile.display_name}
                className="size-24 rounded-full object-cover border border-border"
              />
            ) : (
              <div
                aria-label={`Initials for ${profile.display_name}`}
                className="size-24 rounded-full bg-accent-soft text-accent flex items-center justify-center font-heading text-2xl font-bold border border-border"
              >
                {initials || "U"}
              </div>
            )}
            <div className="flex flex-col gap-1">
              <div className="flex items-center gap-3 flex-wrap">
                <h1 className="font-heading text-2xl font-bold text-foreground">
                  {profile.display_name}
                </h1>
                {profile.visibility === "college" ? (
                  <Badge
                    variant="outline"
                    className="flex items-center gap-1.5 text-success border-success"
                  >
                    <EyeIcon className="size-4" />
                    Visible to your college
                  </Badge>
                ) : (
                  <Badge
                    variant="outline"
                    className="flex items-center gap-1.5 text-warning border-warning"
                  >
                    <EyeOffIcon className="size-4" />
                    Hidden from classmates
                  </Badge>
                )}
              </div>
              {profile.handle ? (
                <p className="text-base text-muted-foreground font-mono">@{profile.handle}</p>
              ) : null}
              {profile.headline ? (
                <p className="text-base text-foreground font-medium mt-1">{profile.headline}</p>
              ) : null}
            </div>
          </div>

          <Button asChild className="min-h-11 shrink-0">
            <Link href="/me/edit" className="flex items-center gap-2">
              <EditIcon className="size-4" />
              Edit Profile
            </Link>
          </Button>
        </CardHeader>

        {profile.bio ? (
          <CardContent className="border-t border-border pt-4">
            <h2 className="font-heading text-lg font-semibold mb-2">About</h2>
            <p className="text-base text-foreground leading-relaxed whitespace-pre-line">
              {profile.bio}
            </p>
          </CardContent>
        ) : null}
      </Card>

      {/* Interests and Career Goals Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Interests Card */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <SparklesIcon className="size-5 text-accent" />
              Interests
            </CardTitle>
            <CardDescription>Topics and technical areas you enjoy exploring.</CardDescription>
          </CardHeader>
          <CardContent>
            {profile.interests && profile.interests.length > 0 ? (
              <div className="flex flex-wrap gap-2">
                {profile.interests.map((interest) => (
                  <Badge key={interest} variant="secondary" className="text-base py-1 px-3">
                    {interest}
                  </Badge>
                ))}
              </div>
            ) : (
              <p className="text-base text-muted-foreground">No interests listed yet.</p>
            )}
          </CardContent>
        </Card>

        {/* Career Goal Card */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <TargetIcon className="size-5 text-accent" />
              Career Goal
            </CardTitle>
            <CardDescription>What you are working toward after college.</CardDescription>
          </CardHeader>
          <CardContent>
            {profile.career_goal ? (
              <p className="text-base text-foreground font-medium">{profile.career_goal}</p>
            ) : (
              <p className="text-base text-muted-foreground">No career goal added yet.</p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Skills Showcase Card */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="text-lg">Skills & Evidence</CardTitle>
            <CardDescription>Your verified skill proficiencies and proof of work.</CardDescription>
          </div>
          <Button variant="outline" asChild className="min-h-11">
            <Link href="/me/skills">Manage Skills</Link>
          </Button>
        </CardHeader>
        <CardContent>
          {initialSkills && initialSkills.length > 0 ? (
            <div className="flex flex-col gap-3">
              {initialSkills.map((skill) => (
                <div
                  key={skill.skill_id}
                  className="flex items-center justify-between p-3 rounded-card border border-border bg-surface"
                >
                  <div className="flex items-center gap-3">
                    <span className="font-medium text-foreground text-base">{skill.name}</span>
                    <Badge variant="secondary">Level {skill.level}/5</Badge>
                  </div>
                  {skill.evidence_url ? (
                    <a
                      href={skill.evidence_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-accent underline text-base hover:text-accent-hover"
                    >
                      View Proof
                    </a>
                  ) : null}
                </div>
              ))}
            </div>
          ) : (
            <p className="text-base text-muted-foreground">No skills added yet.</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
