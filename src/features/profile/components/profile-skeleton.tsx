import * as React from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent, CardHeader } from "@/components/ui/card";

export function ProfileSkeleton() {
  return (
    <div
      data-testid="profile-skeleton"
      className="flex flex-col gap-6 w-full max-w-4xl mx-auto py-8"
    >
      {/* Header skeleton */}
      <Card>
        <CardHeader className="flex flex-row items-center gap-6 pb-6">
          <Skeleton className="size-24 rounded-full" />
          <div className="flex flex-col gap-3 flex-1">
            <Skeleton className="h-8 w-48" />
            <Skeleton className="h-5 w-32" />
            <Skeleton className="h-5 w-64" />
          </div>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <Skeleton className="h-6 w-full" />
          <Skeleton className="h-6 w-5/6" />
        </CardContent>
      </Card>

      {/* Details skeleton */}
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-40" />
        </CardHeader>
        <CardContent className="flex flex-wrap gap-2">
          <Skeleton className="h-8 w-20 rounded-input" />
          <Skeleton className="h-8 w-24 rounded-input" />
          <Skeleton className="h-8 w-28 rounded-input" />
        </CardContent>
      </Card>
    </div>
  );
}
