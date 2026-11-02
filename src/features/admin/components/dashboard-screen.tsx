"use client";

import * as React from "react";
import { UsersIcon, ShieldCheckIcon, MailIcon, ClockIcon } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { AdminScreenSkeleton } from "./admin-screen-skeleton";
import { AdminError } from "./admin-error";
import { useAdminData } from "../use-admin-data";
import { sampleStats } from "../sample-data";
import type { AdminStats, AuditEntry } from "../types";

const statCards = [
  { key: "totalMembers", label: "Members", icon: <UsersIcon /> },
  { key: "pendingVerifications", label: "Pending verifications", icon: <ShieldCheckIcon /> },
  { key: "activeInvites", label: "Active invites", icon: <MailIcon /> },
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

      <div className="grid gap-4 sm:grid-cols-3">
        {statCards.map((stat) => (
          <Card key={stat.key}>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base font-medium text-muted-foreground [&_svg]:size-5">
                {stat.icon}
                {stat.label}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="font-heading text-3xl font-semibold">{data[stat.key]}</p>
            </CardContent>
          </Card>
        ))}
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
