"use client";

import * as React from "react";
import { ScrollTextIcon } from "lucide-react";
import { EmptyState } from "@/components/ui/empty-state";
import { ResponsiveList, type ResponsiveListColumn } from "@/components/ui/responsive-list";
import { AdminScreenSkeleton } from "./admin-screen-skeleton";
import { AdminError } from "./admin-error";
import { useAdminData } from "../use-admin-data";
import { sampleAuditLog } from "../sample-data";
import type { AuditEntry } from "../types";

function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function AuditScreen() {
  const { data, isLoading, error, reload } = useAdminData<AuditEntry[]>(sampleAuditLog);

  if (isLoading) return <AdminScreenSkeleton />;
  if (error) return <AdminError message={error} onRetry={reload} />;
  if (!data || data.length === 0) {
    return (
      <EmptyState
        icon={<ScrollTextIcon />}
        title="No audit history"
        description="Admin actions will be logged here for transparency."
      />
    );
  }

  const columns: ResponsiveListColumn<AuditEntry>[] = [
    { key: "actor", header: "Who" },
    { key: "action", header: "What" },
    { key: "target", header: "Target" },
    {
      key: "timestamp",
      header: "When",
      cell: (row) => <time dateTime={row.timestamp}>{formatDateTime(row.timestamp)}</time>,
    },
  ];

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="font-heading text-2xl font-semibold">Audit log</h1>
        <p className="text-muted-foreground">
          A read-only record of admin actions in your college.
        </p>
      </div>

      <ResponsiveList
        caption="Audit log"
        columns={columns}
        rows={data}
        getRowKey={(row) => row.id}
        breakpoint="lg"
      />
    </div>
  );
}
