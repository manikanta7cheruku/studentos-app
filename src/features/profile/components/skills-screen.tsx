"use client";

import * as React from "react";
import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  ArrowLeftIcon,
  SearchIcon,
  PlusIcon,
  Trash2Icon,
  CheckIcon,
  SparklesIcon,
  ExternalLinkIcon,
  AlertCircleIcon,
  RefreshCwIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
  CardFooter,
} from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { Skeleton } from "@/components/ui/skeleton";
import { useSkillsData } from "../use-skills-data";
import type { SkillCatalogItem, UserSkill } from "../types";

export interface SkillsScreenProps {
  initialSkills?: UserSkill[];
  simulateEmpty?: boolean;
}

interface SkillsEditorProps {
  initialSkills: UserSkill[];
  saveSkills: (newSkills: UserSkill[]) => Promise<void>;
  searchCatalog: (query: string) => Promise<SkillCatalogItem[]>;
  isSaving: boolean;
}

const levelLabels: Record<number, string> = {
  1: "Beginner",
  2: "Elementary",
  3: "Intermediate",
  4: "Advanced",
  5: "Expert",
};

function SkillsEditor({ initialSkills, saveSkills, searchCatalog, isSaving }: SkillsEditorProps) {
  const router = useRouter();
  const [skills, setSkills] = useState<UserSkill[]>(initialSkills);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<SkillCatalogItem[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [urlErrors, setUrlErrors] = useState<Record<string, string>>({});

  async function handleSearch(q: string) {
    setSearchQuery(q);
    if (!q.trim()) {
      setSearchResults([]);
      return;
    }
    setIsSearching(true);
    const results = await searchCatalog(q);
    setSearchResults(results);
    setIsSearching(false);
  }

  function handleAddSkill(catalogItem: SkillCatalogItem) {
    if (skills.some((s) => s.skill_id === catalogItem.id)) {
      toast.error(`You have already added ${catalogItem.name}.`);
      return;
    }
    if (skills.length >= 50) {
      toast.error("You can add up to 50 skills maximum.");
      return;
    }

    const newSkill: UserSkill = {
      skill_id: catalogItem.id,
      name: catalogItem.name,
      level: 3, // Default to Intermediate
      evidence_url: null,
    };

    setSkills((prev) => [...prev, newSkill]);
    setSearchQuery("");
    setSearchResults([]);
    toast.success(`Added ${catalogItem.name} to your skills.`);
  }

  function handleRemoveSkill(skillId: string) {
    setSkills((prev) => prev.filter((s) => s.skill_id !== skillId));
    setUrlErrors((prev) => {
      const next = { ...prev };
      delete next[skillId];
      return next;
    });
  }

  function handleLevelChange(skillId: string, level: number) {
    setSkills((prev) => prev.map((s) => (s.skill_id === skillId ? { ...s, level } : s)));
  }

  function handleEvidenceUrlChange(skillId: string, url: string) {
    setSkills((prev) =>
      prev.map((s) => (s.skill_id === skillId ? { ...s, evidence_url: url || null } : s)),
    );

    if (url && !url.startsWith("https://")) {
      setUrlErrors((prev) => ({
        ...prev,
        [skillId]: "Links must start with https://",
      }));
    } else {
      setUrlErrors((prev) => {
        const next = { ...prev };
        delete next[skillId];
        return next;
      });
    }
  }

  async function handleSave() {
    // Validate evidence URLs
    const errors: Record<string, string> = {};
    for (const skill of skills) {
      if (skill.evidence_url && !skill.evidence_url.startsWith("https://")) {
        errors[skill.skill_id] = "Links must start with https://";
      }
    }

    if (Object.keys(errors).length > 0) {
      setUrlErrors(errors);
      toast.error("Please fix invalid proof URLs before saving.");
      return;
    }

    try {
      await saveSkills(skills);
      toast.success("Skills updated successfully.");
      router.push("/me");
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed to save skills.");
    }
  }

  return (
    <div className="flex flex-col gap-6 w-full max-w-4xl mx-auto py-8 px-4 sm:px-6">
      <div className="flex items-center justify-between">
        <Button variant="ghost" asChild className="gap-2 -ml-2">
          <Link href="/me">
            <ArrowLeftIcon className="size-4" />
            Back to Profile
          </Link>
        </Button>
      </div>

      <div>
        <h1 className="font-heading text-2xl font-bold text-foreground">Skills & Expertise</h1>
        <p className="text-base text-muted-foreground mt-1">
          Add skills to help team leads and collaborators find you for projects and hackathons.
        </p>
      </div>

      {/* Skill Search & Catalog Picker Card */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <SearchIcon className="size-5 text-accent" />
            Search Skill Catalog
          </CardTitle>
          <CardDescription>
            Search for technical skills, frameworks, tools, or design competencies.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <div className="relative">
            <Input
              id="skill-search-input"
              value={searchQuery}
              onChange={(e) => handleSearch(e.target.value)}
              placeholder="Search skills (e.g. TypeScript, React, Python, UI Design)..."
              className="pl-10"
            />
            <SearchIcon className="size-5 absolute left-3 top-3 text-muted-foreground" />
          </div>

          {searchQuery && (
            <div className="rounded-card border border-border bg-surface p-3 flex flex-col gap-2 max-h-60 overflow-y-auto">
              {isSearching ? (
                <p className="text-base text-muted-foreground p-2">Searching catalog...</p>
              ) : searchResults.length > 0 ? (
                searchResults.map((item) => {
                  const alreadyAdded = skills.some((s) => s.skill_id === item.id);
                  return (
                    <div
                      key={item.id}
                      className="flex items-center justify-between p-2 rounded-input hover:bg-accent-soft/50 transition-colors"
                    >
                      <div className="flex items-center gap-2">
                        <span className="text-base font-medium text-foreground">{item.name}</span>
                        {item.category ? <Badge variant="secondary">{item.category}</Badge> : null}
                      </div>
                      <Button
                        size="sm"
                        variant={alreadyAdded ? "secondary" : "default"}
                        disabled={alreadyAdded}
                        onClick={() => handleAddSkill(item)}
                        className="min-h-9 flex items-center gap-1.5"
                      >
                        {alreadyAdded ? (
                          <>
                            <CheckIcon className="size-3.5" />
                            Added
                          </>
                        ) : (
                          <>
                            <PlusIcon className="size-3.5" />
                            Add
                          </>
                        )}
                      </Button>
                    </div>
                  );
                })
              ) : (
                <p className="text-base text-muted-foreground p-2">
                  No skills matching &quot;{searchQuery}&quot; found in the catalog.
                </p>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Added Skills List Card */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-lg flex items-center gap-2">
                <SparklesIcon className="size-5 text-accent" />
                My Skills ({skills.length}/50)
              </CardTitle>
              <CardDescription>
                Set your self-assessed proficiency level and optional proof link for each skill.
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {skills.length === 0 ? (
            <EmptyState
              icon={<SparklesIcon />}
              title="No skills added yet"
              description="Search the catalog above to add your primary skills and showcase what you can build."
            />
          ) : (
            <div className="flex flex-col gap-4">
              {skills.map((skill) => (
                <div
                  key={skill.skill_id}
                  className="flex flex-col gap-3 p-4 rounded-card border border-border bg-surface"
                >
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <span className="font-heading font-semibold text-lg text-foreground">
                        {skill.name}
                      </span>
                      <Badge variant="outline" className="text-accent border-accent">
                        Level {skill.level}: {levelLabels[skill.level]}
                      </Badge>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleRemoveSkill(skill.skill_id)}
                      aria-label={`Remove ${skill.name}`}
                      className="text-destructive hover:text-destructive hover:bg-destructive/10 min-h-9"
                    >
                      <Trash2Icon className="size-4" />
                    </Button>
                  </div>

                  {/* Level selector buttons */}
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-base text-muted-foreground mr-1">Level:</span>
                    {[1, 2, 3, 4, 5].map((lvl) => (
                      <Button
                        key={lvl}
                        type="button"
                        variant={skill.level === lvl ? "default" : "outline"}
                        size="sm"
                        onClick={() => handleLevelChange(skill.skill_id, lvl)}
                        className="min-h-9 px-3"
                      >
                        {lvl} - {levelLabels[lvl]}
                      </Button>
                    ))}
                  </div>

                  {/* Evidence URL Input */}
                  <div className="flex flex-col gap-1.5 pt-1">
                    <div className="flex items-center gap-2">
                      <Input
                        value={skill.evidence_url ?? ""}
                        onChange={(e) => handleEvidenceUrlChange(skill.skill_id, e.target.value)}
                        placeholder="Proof of work (optional https link, e.g. GitHub repo, live demo, certificate)"
                        className="text-base"
                      />
                      {skill.evidence_url && skill.evidence_url.startsWith("https://") ? (
                        <Button variant="ghost" size="icon" asChild className="min-h-11 shrink-0">
                          <a
                            href={skill.evidence_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            aria-label={`Open evidence link for ${skill.name}`}
                          >
                            <ExternalLinkIcon className="size-4" />
                          </a>
                        </Button>
                      ) : null}
                    </div>
                    {urlErrors[skill.skill_id] ? (
                      <p className="text-base font-medium text-destructive">
                        {urlErrors[skill.skill_id]}
                      </p>
                    ) : null}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
        <CardFooter className="flex items-center justify-between border-t border-border py-4">
          <Button variant="outline" asChild className="min-h-11">
            <Link href="/me">Cancel</Link>
          </Button>
          <Button
            onClick={handleSave}
            disabled={isSaving}
            className="min-h-11 flex items-center gap-2"
          >
            <CheckIcon className="size-4" />
            {isSaving ? "Saving..." : "Save Skills"}
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}

export function SkillsScreen({ initialSkills, simulateEmpty = false }: SkillsScreenProps) {
  const {
    skills: serverSkills,
    isLoading,
    isSaving,
    error,
    requestId,
    reload,
    saveSkills,
    searchCatalog,
  } = useSkillsData(initialSkills);

  if (isLoading && (!serverSkills || serverSkills.length === 0)) {
    return (
      <div
        data-testid="skills-skeleton"
        className="flex flex-col gap-6 w-full max-w-4xl mx-auto py-8 px-4 sm:px-6"
      >
        <Skeleton className="h-10 w-48" />
        <Skeleton className="h-32 w-full rounded-card" />
        <Skeleton className="h-64 w-full rounded-card" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-start gap-4 p-6 rounded-card border border-destructive bg-surface max-w-4xl mx-auto my-8">
        <div className="flex items-center gap-3 text-destructive">
          <AlertCircleIcon className="size-6 shrink-0" />
          <h2 className="font-heading text-xl font-semibold">Could not load skills</h2>
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

  return (
    <SkillsEditor
      key={serverSkills?.map((s) => s.skill_id).join(",") ?? "skills-editor"}
      initialSkills={simulateEmpty ? [] : serverSkills}
      saveSkills={saveSkills}
      searchCatalog={searchCatalog}
      isSaving={isSaving}
    />
  );
}
