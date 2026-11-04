"use client";

import * as React from "react";
import { useState } from "react";
import { UsersIcon, SearchIcon } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { EmptyState } from "@/components/ui/empty-state";
import { ResponsiveList, type ResponsiveListColumn } from "@/components/ui/responsive-list";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { AdminScreenSkeleton } from "./admin-screen-skeleton";
import { AdminError } from "./admin-error";
import { useAdminData } from "../use-admin-data";
import { sampleMembers } from "../sample-data";
import type { Member } from "../types";

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

const roleBadgeVariant: Record<Member["role"], "default" | "secondary" | "outline"> = {
  admin: "default",
  moderator: "secondary",
  member: "outline",
};

export function MembersScreen() {
  const { data, isLoading, error, reload } = useAdminData<Member[]>(sampleMembers);
  const [search, setSearch] = useState("");
  const [removeTarget, setRemoveTarget] = useState<Member | null>(null);

  function handleRemove() {
    if (!removeTarget) return;
    toast.success(`Removed ${removeTarget.name} from your college.`);
    setRemoveTarget(null);
  }

  if (isLoading) return <AdminScreenSkeleton />;
  if (error) return <AdminError message={error} onRetry={reload} />;
  if (!data || data.length === 0) {
    return (
      <EmptyState
        icon={<UsersIcon />}
        title="No members yet"
        description="Members will appear here after they join your college."
      />
    );
  }

  const filtered = data.filter(
    (m) =>
      m.name.toLowerCase().includes(search.toLowerCase()) ||
      m.email.toLowerCase().includes(search.toLowerCase()),
  );

  const columns: ResponsiveListColumn<Member>[] = [
    { key: "name", header: "Name" },
    { key: "email", header: "Email" },
    {
      key: "role",
      header: "Role",
      cell: (row) => <Badge variant={roleBadgeVariant[row.role]}>{row.role}</Badge>,
    },
    {
      key: "joinedAt",
      header: "Joined",
      cell: (row) => formatDate(row.joinedAt),
    },
    {
      key: "actions",
      header: "Actions",
      cell: (row) =>
        row.role !== "admin" ? (
          <Button size="sm" variant="destructive" onClick={() => setRemoveTarget(row)}>
            Remove
          </Button>
        ) : null,
    },
  ];

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="font-heading text-2xl font-semibold">Members</h1>
        <p className="text-muted-foreground">Everyone in your college on StudentOS.</p>
      </div>

      <div className="relative max-w-sm">
        <SearchIcon className="pointer-events-none absolute top-1/2 left-3 size-5 -translate-y-1/2 text-muted-foreground" />
        <Input
          aria-label="Search members"
          placeholder="Search by name or email…"
          className="pl-10"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {filtered.length === 0 ? (
        <p className="text-muted-foreground">No members match &ldquo;{search}&rdquo;.</p>
      ) : (
        <ResponsiveList
          caption="College members"
          columns={columns}
          rows={filtered}
          getRowKey={(row) => row.id}
          breakpoint="lg"
        />
      )}

      {/* Remove confirmation dialog */}
      <Dialog open={!!removeTarget} onOpenChange={(open) => !open && setRemoveTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Remove {removeTarget?.name}?</DialogTitle>
            <DialogDescription>
              {removeTarget?.name} ({removeTarget?.email}) will lose access to your college. They
              can request to join again later.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRemoveTarget(null)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleRemove}>
              Remove {removeTarget?.name}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
