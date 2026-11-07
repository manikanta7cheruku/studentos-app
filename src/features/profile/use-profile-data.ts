"use client";

import { useCallback, useEffect, useState } from "react";
import type { ProfileData } from "./types";
import { sampleProfile } from "./sample-data";

type ProfileState = {
  data: ProfileData | null;
  isLoading: boolean;
  error: string | null;
  requestId: string | null;
  reload: () => void;
  updateProfile: (patch: Partial<ProfileData>) => Promise<ProfileData>;
  uploadAvatar: (file: File) => Promise<string>;
};

export function useProfileData(initialData?: ProfileData | null): ProfileState {
  const [data, setData] = useState<ProfileData | null>(initialData ?? null);
  const [isLoading, setIsLoading] = useState(initialData === undefined);
  const [error, setError] = useState<string | null>(null);
  const [requestId, setRequestId] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);

  const reload = useCallback(() => {
    setIsLoading(true);
    setError(null);
    setReloadKey((k) => k + 1);
  }, []);

  useEffect(() => {
    if (initialData !== undefined) return;

    let ignore = false;

    async function load() {
      try {
        setIsLoading(true);
        setError(null);
        const res = await fetch("/api/v1/me/profile", {
          credentials: "include",
          headers: { Accept: "application/json" },
        });

        const reqId = res.headers.get("x-request-id") ?? null;
        if (!ignore) setRequestId(reqId);

        if (!res.ok) {
          // If 401 or not signed in yet during development/demo, fallback to sample profile
          if (res.status === 401 || res.status === 404) {
            if (!ignore) {
              setData(sampleProfile);
              setIsLoading(false);
            }
            return;
          }
          const errJson = await res.json().catch(() => null);
          const msg = errJson?.error?.message ?? `Failed to load profile (${res.status})`;
          if (!ignore) {
            setError(msg);
            setIsLoading(false);
          }
          return;
        }

        const json = await res.json();
        if (!ignore) {
          setData(json.data);
          setIsLoading(false);
        }
      } catch {
        if (!ignore) {
          // In local dev/mock fallback
          setData(sampleProfile);
          setIsLoading(false);
        }
      }
    }

    load();

    return () => {
      ignore = true;
    };
  }, [initialData, reloadKey]);

  const updateProfile = useCallback(async (patch: Partial<ProfileData>): Promise<ProfileData> => {
    const res = await fetch("/api/v1/me/profile", {
      method: "PATCH",
      credentials: "include",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify(patch),
    });

    const json = await res.json().catch(() => null);
    if (!res.ok) {
      throw new Error(json?.error?.message ?? "Failed to save profile changes.");
    }

    setData(json.data);
    return json.data;
  }, []);

  const uploadAvatar = useCallback(async (file: File): Promise<string> => {
    const formData = new FormData();
    formData.append("file", file);

    const res = await fetch("/api/v1/me/avatar", {
      method: "POST",
      credentials: "include",
      body: formData,
    });

    const json = await res.json().catch(() => null);
    if (!res.ok) {
      throw new Error(json?.error?.message ?? "Failed to upload avatar image.");
    }

    const avatarUrl = json.data?.avatar_url as string;
    setData((prev) => (prev ? { ...prev, avatar_url: avatarUrl } : prev));
    return avatarUrl;
  }, []);

  return { data, isLoading, error, requestId, reload, updateProfile, uploadAvatar };
}
