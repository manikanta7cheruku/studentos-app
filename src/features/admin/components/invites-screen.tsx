"use client";

import * as React from "react";
import { useState } from "react";
import { MailIcon } from "lucide-react";
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
import { FormField } from "@/components/ui/form-field";
import { AdminScreenSkeleton } from "./admin-screen-skeleton";
import { AdminError } from "./admin-error";
import { useAdminData } from "../use-admin-data";
import { sampleInvites } from "../sample-data";
import type { Invite } from "../types";

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

const statusBadgeVariant: Record<Invite["status"], "success" | "secondary" | "destructive"> = {
  active: "success",
  used: "secondary",
  revoked: "destructive",
};

export function InvitesScreen() {
  const { data, isLoading, error, reload } = useAdminData<Invite[]>(sampleInvites);
  const [showCreate, setShowCreate] = useState(false);
  const [newCode, setNewCode] = useState("");
  const [codeError, setCodeError] = useState<string | undefined>();
  const [revokeTarget, setRevokeTarget] = useState<Invite | null>(null);

  function handleCreate() {
    if (!newCode.trim()) {
      setCodeError("Enter an invite code.");
      return;
    }
    toast.success(`Created invite code: ${newCode}`);
    setShowCreate(false);
    setNewCode("");
    setCodeError(undefined);
  }

  function handleRevoke() {
    if (!revokeTarget) return;
    toast.success(`Revoked invite code: ${revokeTarget.code}`);
    setRevokeTarget(null);
  }

  if (isLoading) return <AdminScreenSkeleton />;
  if (error) return <AdminError message={error} onRetry={reload} />;
  if (!data || data.length === 0) {
    return (
      <EmptyState
        icon={<MailIcon />}
        title="No invite codes yet"
        description="Create an invite code so people can join your college."
        action={<Button onClick={() => setShowCreate(true)}>Create invite code</Button>}
      />
    );
  }

  const columns: ResponsiveListColumn<Invite>[] = [
    { key: "code", header: "Code", cell: (row) => <code className="font-medium">{row.code}</code> },
    { key: "createdBy", header: "Created by" },
    {
      key: "createdAt",
      header: "Created",
      cell: (row) => formatDate(row.createdAt),
    },
    {
      key: "status",
      header: "Status",
      cell: (row) => <Badge variant={statusBadgeVariant[row.status]}>{row.status}</Badge>,
    },
    {
      key: "actions",
      header: "Actions",
      cell: (row) =>
        row.status === "active" ? (
          <Button size="sm" variant="destructive" onClick={() => setRevokeTarget(row)}>
            Revoke
          </Button>
        ) : null,
    },
  ];

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="font-heading text-2xl font-semibold">Invite codes</h1>
          <p className="text-muted-foreground">
            Share invite codes so students can join your college.
          </p>
        </div>
        <Button onClick={() => setShowCreate(true)}>Create invite code</Button>
      </div>

      <ResponsiveList
        caption="Invite codes"
        columns={columns}
        rows={data}
        getRowKey={(row) => row.id}
        breakpoint="lg"
      />

      {/* Create invite dialog */}
      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create invite code</DialogTitle>
            <DialogDescription>
              Choose a memorable code. Students will enter it when they sign up.
            </DialogDescription>
          </DialogHeader>

          <FormField label="Invite code" required error={codeError}>
            <Input
              placeholder="e.g. WELCOME-2026"
              value={newCode}
              onChange={(e) => {
                setNewCode(e.target.value.toUpperCase());
                if (e.target.value.trim()) setCodeError(undefined);
              }}
            />
          </FormField>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreate(false)}>
              Cancel
            </Button>
            <Button onClick={handleCreate}>Create</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Revoke confirmation dialog */}
      <Dialog open={!!revokeTarget} onOpenChange={(open) => !open && setRevokeTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Revoke invite code?</DialogTitle>
            <DialogDescription>
              The code <strong>{revokeTarget?.code}</strong> will stop working. Anyone who has not
              yet used it will not be able to join with this code.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRevokeTarget(null)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleRevoke}>
              Revoke {revokeTarget?.code}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
