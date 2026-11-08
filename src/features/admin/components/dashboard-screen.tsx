"use client";

import * as React from "react";
import { ClockIcon } from "lucide-react";
import { EmptyState } from "@/components/ui/empty-state";
import { AdminScreenSkeleton } from "./admin-screen-skeleton";
import { AdminError } from "./admin-error";
import { useAdminData } from "../use-admin-data";
import { sampleStats } from "../sample-data";
import type { AdminStats, AuditEntry } from "../types";

const statCards = [
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
    <li className="flex flex-col gap-1 border-b border-border py-3 last:border-0 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <span className="font-medium">{entry.actor}</span>{" "}
        <span className="text-muted-foreground">{entry.action}</span>{" "}
        <span className="font-medium">{entry.target}</span>
      </div>
      <time className="flex items-center gap-1 text-muted-foreground" dateTime={entry.timestamp}>
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
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="font-heading text-2xl font-semibold">Admin dashboard</h1>
        <p className="text-muted-foreground">Overview of your college on StudentOS.</p>
      </div>

      <dl className="flex flex-col divide-y divide-border rounded-card border border-border bg-surface sm:flex-row sm:divide-x sm:divide-y-0">
        {statCards.map((stat) => (
          <div key={stat.key} className="flex-1 p-4 sm:p-6">
            <dt className="text-base text-muted-foreground">{stat.label}</dt>
            <dd className="pt-1 font-heading text-3xl font-semibold">{data[stat.key]}</dd>
          </div>
        ))}
      </dl>

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
