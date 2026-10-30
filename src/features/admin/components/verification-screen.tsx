"use client";

import * as React from "react";
import { useState } from "react";
import { ShieldCheckIcon } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
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
import { Textarea } from "@/components/ui/textarea";
import { AdminScreenSkeleton } from "./admin-screen-skeleton";
import { AdminError } from "./admin-error";
import { useAdminData } from "../use-admin-data";
import { samplePendingVerifications } from "../sample-data";
import type { PendingVerification } from "../types";

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export function VerificationScreen() {
  const { data, isLoading, error, reload } = useAdminData<PendingVerification[]>(
    samplePendingVerifications,
  );

  const [handledIds, setHandledIds] = useState<PendingVerification["id"][]>([]);
  const rows = data ? data.filter((p) => !handledIds.includes(p.id)) : null;

  const [rejectTarget, setRejectTarget] = useState<PendingVerification | null>(null);
  const [rejectReason, setRejectReason] = useState("");
  const [reasonError, setReasonError] = useState<string | undefined>();

  function handleApprove(person: PendingVerification) {
    setHandledIds((ids) => [...ids, person.id]);
    toast.success(`Approved ${person.name}`);
  }

  function openRejectDialog(person: PendingVerification) {
    setRejectTarget(person);
    setRejectReason("");
    setReasonError(undefined);
  }

  function submitReject() {
    if (!rejectReason.trim()) {
      setReasonError("Please provide a reason for rejecting this person.");
      return;
    }
    if (rejectTarget) setHandledIds((ids) => [...ids, rejectTarget.id]);
    toast.success(`Rejected ${rejectTarget?.name}: ${rejectReason}`);
    setRejectTarget(null);
    setRejectReason("");
    setReasonError(undefined);
  }

  if (isLoading) return <AdminScreenSkeleton />;
  if (error) return <AdminError message={error} onRetry={reload} />;
  if (!rows || rows.length === 0) {
    return (
      <EmptyState
        icon={<ShieldCheckIcon />}
        title="No pending verifications"
        description="New sign-ups will appear here for your review."
      />
    );
  }

  const columns: ResponsiveListColumn<PendingVerification>[] = [
    { key: "name", header: "Name" },
    { key: "email", header: "Email" },
    {
      key: "appliedAt",
      header: "Applied",
      cell: (row) => formatDate(row.appliedAt),
    },
    {
      key: "status",
      header: "Status",
      cell: (row) => (
        <Badge variant={row.status === "pending" ? "warning" : "secondary"}>{row.status}</Badge>
      ),
    },
    {
      key: "actions",
      header: "Actions",
      cell: (row) => (
        <div className="flex gap-2">
          <Button size="sm" onClick={() => handleApprove(row)}>
            Approve
          </Button>
          <Button size="sm" variant="destructive" onClick={() => openRejectDialog(row)}>
            Reject
          </Button>
        </div>
      ),
    },
  ];

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="font-heading text-2xl font-semibold">Verification queue</h1>
        <p className="text-muted-foreground">
          Review and approve people who want to join your college.
        </p>
      </div>

      <ResponsiveList
        caption="Pending verifications"
        columns={columns}
        rows={rows}
        getRowKey={(row) => row.id}
      />

      {/* Reject dialog — requires a reason */}
      <Dialog open={!!rejectTarget} onOpenChange={(open) => !open && setRejectTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reject {rejectTarget?.name}?</DialogTitle>
            <DialogDescription>
              This person will be notified that their request was rejected. Please explain why.
            </DialogDescription>
          </DialogHeader>

          <FormField label="Reason for rejection" required error={reasonError}>
            <Textarea
              placeholder="e.g. Could not verify your student ID"
              value={rejectReason}
              onChange={(e) => {
                setRejectReason(e.target.value);
                if (e.target.value.trim()) setReasonError(undefined);
              }}
            />
          </FormField>

          <DialogFooter>
            <Button variant="outline" onClick={() => setRejectTarget(null)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={submitReject}>
              Reject
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
