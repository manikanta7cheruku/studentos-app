"use client";

import * as React from "react";
import { Skeleton } from "@/components/ui/skeleton";

export function AdminScreenSkeleton({ rows = 5 }: { rows?: number }) {
  return (
    <div className="flex flex-col gap-4">
      <Skeleton className="h-8 w-48" />
      <Skeleton className="h-5 w-72" />
      <div className="flex flex-col gap-3 pt-2">
        {Array.from({ length: rows }).map((_, i) => (
          <Skeleton key={i} className="h-14 w-full rounded-card" />
        ))}
      </div>
    </div>
  );
}
