"use client";

import { useCallback, useEffect, useState } from "react";

type AsyncState<T> = {
  data: T | null;
  isLoading: boolean;
  error: string | null;
  reload: () => void;
};

/**
 * Simulates loading data from an API. R2 will replace this with real fetches.
 * Adds a small delay to show the loading skeleton.
 */
export function useAdminData<T>(sampleData: T, simulateEmpty = false): AsyncState<T> {
  const [data, setData] = useState<T | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);

  const reload = useCallback(() => {
    setIsLoading(true);
    setError(null);
    setData(null);
    setReloadKey((k) => k + 1);
  }, []);

  useEffect(() => {
    let ignore = false;
    const timer = setTimeout(() => {
      if (ignore) return;
      if (simulateEmpty) {
        setData(null);
        setIsLoading(false);
        return;
      }
      setData(sampleData);
      setIsLoading(false);
    }, 600);

    return () => {
      ignore = true;
      clearTimeout(timer);
    };
  }, [sampleData, simulateEmpty, reloadKey]);

  return { data, isLoading, error, reload };
}
