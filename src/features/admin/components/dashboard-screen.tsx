"use client";

import * as React from "react";
import { ClockIcon } from "lucide-react";
import { EmptyState } from "@/components/ui/empty-state";
import { AdminScreenSkeleton } from "./admin-screen-skeleton";
import { AdminError } from "./admin-error";
import { useAdminData } from "../use-admin-data";
import { sampleStats } from "../sample-data";
import type { AdminStats, AuditEntry } from "../types";

const summaryStats = [
  { key: "totalMembers", label: "Members" },
  { key: "pendingVerifications", label: "Pending verifications" },
  { key: "activeInvites", label: "Active invites" },
] as const;

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function ActivityRow({ entry }: { entry: AuditEntry }) {
  return (
    <li className="flex flex-col gap-1 border-b border-border py-3 last:border-0 sm:flex-row sm:items-center sm:justify-between min-w-0">
      <div className="break-words min-w-0">
        <span className="font-medium">{entry.actor}</span>{" "}
        <span className="text-muted-foreground">{entry.action}</span>{" "}
        <span className="font-medium">{entry.target}</span>
      </div>
      <time
        className="flex items-center gap-1 text-muted-foreground shrink-0"
        dateTime={entry.timestamp}
      >
        <ClockIcon className="size-4" />
        {formatDate(entry.timestamp)}
      </time>
    </li>
  );
}

export function DashboardScreen() {
  const { data, isLoading, error, reload } = useAdminData<AdminStats>(sampleStats);

  if (isLoading) return <AdminScreenSkeleton rows={3} />;
  if (error) return <AdminError message={error} onRetry={reload} />;
  if (!data) {
    return (
      <EmptyState
        title="No admin data yet"
        description="Data will appear once your college has members."
      />
    );
  }

  return (
    <div className="flex flex-col gap-6 min-w-0">
      <div className="min-w-0">
        <h1 className="font-heading text-2xl font-semibold break-words min-w-0">Admin dashboard</h1>
        <p className="text-muted-foreground break-words">Overview of your college on StudentOS.</p>
      </div>

      <div className="rounded-card border border-border bg-surface p-6">
        <h2 className="text-base font-medium text-muted-foreground">College figures</h2>
        <dl className="mt-4 grid grid-cols-1 divide-y divide-border sm:grid-cols-3 sm:divide-x sm:divide-y-0">
          {summaryStats.map((stat) => (
            <div
              key={stat.key}
              className="flex flex-col gap-1 py-3 sm:px-6 sm:py-0 first:sm:pl-0 last:sm:pr-0 min-w-0"
            >
              <dt className="text-base text-muted-foreground">{stat.label}</dt>
              <dd className="font-heading text-3xl font-semibold text-foreground break-words min-w-0">
                {data[stat.key]}
              </dd>
            </div>
          ))}
        </dl>
      </div>

      <section>
        <h2 className="font-heading text-xl font-semibold">Recent activity</h2>
        {data.recentActivity.length === 0 ? (
          <p className="pt-2 text-muted-foreground">No recent activity.</p>
        ) : (
          <ul className="pt-2">
            {data.recentActivity.map((entry) => (
              <ActivityRow key={entry.id} entry={entry} />
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
