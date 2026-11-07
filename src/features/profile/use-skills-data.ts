"use client";

import { useCallback, useEffect, useState } from "react";
import type { SkillCatalogItem, UserSkill } from "./types";
import { sampleUserSkills } from "./sample-data";

type SkillsState = {
  skills: UserSkill[];
  isLoading: boolean;
  isSaving: boolean;
  error: string | null;
  requestId: string | null;
  reload: () => void;
  saveSkills: (newSkills: UserSkill[]) => Promise<void>;
  searchCatalog: (query: string) => Promise<SkillCatalogItem[]>;
};

export function useSkillsData(initialSkills?: UserSkill[]): SkillsState {
  const [skills, setSkills] = useState<UserSkill[]>(initialSkills ?? []);
  const [isLoading, setIsLoading] = useState(initialSkills === undefined);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [requestId, setRequestId] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);

  const reload = useCallback(() => {
    setIsLoading(true);
    setError(null);
    setReloadKey((k) => k + 1);
  }, []);

  useEffect(() => {
    if (initialSkills !== undefined) return;

    let ignore = false;

    async function load() {
      try {
        setIsLoading(true);
        setError(null);
        const res = await fetch("/api/v1/me/skills", {
          credentials: "include",
          headers: { Accept: "application/json" },
        });

        const reqId = res.headers.get("x-request-id") ?? null;
        if (!ignore) setRequestId(reqId);

        if (!res.ok) {
          if (res.status === 401 || res.status === 404) {
            if (!ignore) {
              setSkills(sampleUserSkills);
              setIsLoading(false);
            }
            return;
          }
          const errJson = await res.json().catch(() => null);
          const msg = errJson?.error?.message ?? `Failed to load skills (${res.status})`;
          if (!ignore) {
            setError(msg);
            setIsLoading(false);
          }
          return;
        }

        const json = await res.json();
        if (!ignore) {
          setSkills(json.data?.skills ?? []);
          setIsLoading(false);
        }
      } catch {
        if (!ignore) {
          setSkills(sampleUserSkills);
          setIsLoading(false);
        }
      }
    }

    load();

    return () => {
      ignore = true;
    };
  }, [initialSkills, reloadKey]);

  const saveSkills = useCallback(async (newSkills: UserSkill[]) => {
    setIsSaving(true);
    try {
      const payload = {
        skills: newSkills.map((s) => ({
          skill_id: s.skill_id,
          level: s.level,
          evidence_url: s.evidence_url || undefined,
        })),
      };

      const res = await fetch("/api/v1/me/skills", {
        method: "PUT",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify(payload),
      });

      const json = await res.json().catch(() => null);
      if (!res.ok) {
        throw new Error(json?.error?.message ?? "Failed to save skills.");
      }

      setSkills(json.data?.skills ?? newSkills);
    } finally {
      setIsSaving(false);
    }
  }, []);

  const searchCatalog = useCallback(async (query: string): Promise<SkillCatalogItem[]> => {
    if (!query.trim()) return [];

    try {
      const res = await fetch(`/api/v1/skills?q=${encodeURIComponent(query.trim())}`, {
        credentials: "include",
        headers: { Accept: "application/json" },
      });

      if (!res.ok) {
        // Fallback catalog for offline/dev
        const fallbackCatalog: SkillCatalogItem[] = [
          {
            id: "88888888-8888-4888-8888-888888888888",
            name: "TypeScript",
            category: "Programming",
          },
          { id: "88888888-8888-4888-8888-888888888889", name: "React", category: "Frontend" },
          { id: "88888888-8888-4888-8888-888888888890", name: "Next.js", category: "Frontend" },
          { id: "88888888-8888-4888-8888-888888888891", name: "Python", category: "Programming" },
          { id: "88888888-8888-4888-8888-888888888892", name: "PostgreSQL", category: "Database" },
          { id: "88888888-8888-4888-8888-888888888893", name: "UI/UX Design", category: "Design" },
        ];
        return fallbackCatalog.filter((s) => s.name.toLowerCase().includes(query.toLowerCase()));
      }

      const json = await res.json();
      return json.data ?? [];
    } catch {
      const fallbackCatalog: SkillCatalogItem[] = [
        { id: "88888888-8888-4888-8888-888888888888", name: "TypeScript", category: "Programming" },
        { id: "88888888-8888-4888-8888-888888888889", name: "React", category: "Frontend" },
        { id: "88888888-8888-4888-8888-888888888890", name: "Next.js", category: "Frontend" },
        { id: "88888888-8888-4888-8888-888888888891", name: "Python", category: "Programming" },
        { id: "88888888-8888-4888-8888-888888888892", name: "PostgreSQL", category: "Database" },
        { id: "88888888-8888-4888-8888-888888888893", name: "UI/UX Design", category: "Design" },
      ];
      return fallbackCatalog.filter((s) => s.name.toLowerCase().includes(query.toLowerCase()));
    }
  }, []);

  return { skills, isLoading, isSaving, error, requestId, reload, saveSkills, searchCatalog };
}
