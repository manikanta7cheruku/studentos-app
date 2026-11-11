"use client";

import * as React from "react";
import { SearchIcon } from "lucide-react";
import { Banner } from "@/components/ui/banner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { FormField } from "@/components/ui/form-field";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { LoadError } from "@/components/app/load-error";
import { Spinner } from "@/components/app/spinner";
import { ApiError, friendlyMessage } from "@/lib/api-client";
import { api, type AdminMember } from "@/lib/api/endpoints";
import { usePaged } from "@/lib/use-paged";
import { useCollege } from "@/features/college";
import { ConsolePage, EmptyNote, ListSkeleton } from "./admin-shell";
import { PagedFooter } from "./paged-footer";

const ROLE_LABEL: Record<string, string> = {
  student: "Student",
  moderator: "Moderator",
  college_admin: "Admin",
};
const STATUS_LABEL: Record<string, string> = {
  active: "Active",
  pending: "Waiting",
  suspended: "Suspended",
  rejected: "Rejected",
  left: "Left",
};

type Action =
  | { kind: "role"; role: "student" | "moderator" | "college_admin" }
  | { kind: "suspend" }
  | { kind: "remove" }
  | { kind: "reactivate" };

function ActionDialog({
  member,
  action,
  onClose,
  onDone,
}: {
  member: AdminMember;
  action: Action | null;
  onClose: () => void;
  onDone: () => void;
}) {
  const { slug } = useCollege();
  const [reason, setReason] = React.useState("");
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  if (!action) return null;
  const needsReason = action.kind === "suspend" || action.kind === "remove";

  const title =
    action.kind === "role"
      ? `Make ${member.display_name} ${ROLE_LABEL[action.role]}?`
      : action.kind === "suspend"
        ? `Suspend ${member.display_name}?`
        : action.kind === "remove"
          ? `Remove ${member.display_name} from the college?`
          : `Reactivate ${member.display_name}?`;

  async function save() {
    if (!action) return;
    if (needsReason && reason.trim().length < 5) {
      setError("Write a reason of at least 5 characters. It is kept in the audit log.");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const body =
        action.kind === "role"
          ? { role: action.role }
          : action.kind === "suspend"
            ? { status: "suspended" as const, reason: reason.trim() }
            : action.kind === "remove"
              ? { status: "left" as const, reason: reason.trim() }
              : { status: "active" as const };
      await api.admin.patchMember(slug, member.membership_id, body);
      onDone();
      onClose();
    } catch (caught) {
      setError(
        caught instanceof ApiError && caught.code === "CONFLICT"
          ? "A college must keep at least one active admin. Make someone else an admin first."
          : friendlyMessage(caught, "We could not make that change. Please try again."),
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <Dialog open onOpenChange={(open) => !open && !busy && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>
            {action.kind === "role"
              ? "Admins can change settings and members. Moderators can post notices and handle reports."
              : action.kind === "reactivate"
                ? "They can use the college again."
                : "They lose access to the college right away."}
          </DialogDescription>
        </DialogHeader>
        {needsReason ? (
          <FormField label="Reason" help="At least 5 characters. Kept in the audit log." required>
            <Textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              maxLength={500}
              rows={3}
            />
          </FormField>
        ) : null}
        {error ? (
          <Banner variant="error">
            <p>{error}</p>
          </Banner>
        ) : null}
        <DialogFooter>
          <Button variant="ghost" onClick={onClose} disabled={busy}>
            Cancel
          </Button>
          <Button
            variant={
              action.kind === "suspend" || action.kind === "remove" ? "destructive" : "default"
            }
            onClick={() => void save()}
            disabled={busy}
          >
            {busy ? <Spinner /> : null} Confirm
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function MemberRow({ member, onChanged }: { member: AdminMember; onChanged: () => void }) {
  const [action, setAction] = React.useState<Action | null>(null);
  const active = member.status === "active";
  const roles = (["student", "moderator", "college_admin"] as const).filter(
    (r) => r !== member.role,
  );
  return (
    <li className="flex flex-col gap-3 py-4 sm:flex-row sm:items-center sm:justify-between sm:gap-6">
      <div className="min-w-0">
        <p className="text-[17px] font-semibold">{member.display_name}</p>
        <p className="text-[14px] text-ink-muted">
          {ROLE_LABEL[member.role]} · {STATUS_LABEL[member.status] ?? member.status}
          {member.program ? ` · ${member.program}` : ""}
          {member.grad_year ? ` · ${member.grad_year}` : ""}
        </p>
      </div>
      <div className="flex flex-wrap gap-2">
        {active
          ? roles.map((role) => (
              <Button
                key={role}
                variant="outline"
                size="sm"
                onClick={() => setAction({ kind: "role", role })}
              >
                Make {(ROLE_LABEL[role] ?? role).toLowerCase()}
              </Button>
            ))
          : null}
        {active ? (
          <Button variant="ghost" size="sm" onClick={() => setAction({ kind: "suspend" })}>
            Suspend
          </Button>
        ) : null}
        {member.status === "suspended" ? (
          <Button variant="outline" size="sm" onClick={() => setAction({ kind: "reactivate" })}>
            Reactivate
          </Button>
        ) : null}
        {active || member.status === "suspended" ? (
          <Button variant="ghost" size="sm" onClick={() => setAction({ kind: "remove" })}>
            Remove
          </Button>
        ) : null}
      </div>
      <ActionDialog
        member={member}
        action={action}
        onClose={() => setAction(null)}
        onDone={onChanged}
      />
    </li>
  );
}

/** Everyone in the college: search, filter by role and status, change roles, suspend, remove. */
export function MembersScreen() {
  const { slug } = useCollege();
  const [draft, setDraft] = React.useState("");
  const [q, setQ] = React.useState("");
  const [status, setStatus] = React.useState("");
  const [role, setRole] = React.useState("");
  React.useEffect(() => {
    const timer = window.setTimeout(() => setQ(draft.trim()), 350);
    return () => window.clearTimeout(timer);
  }, [draft]);

  const list = usePaged(
    (cursor) =>
      api.admin.members(slug, {
        q: q || undefined,
        status: status || undefined,
        role: role || undefined,
        cursor,
      }),
    [slug, q, status, role],
  );

  const select =
    "h-11 rounded-input border border-border-strong bg-surface px-3 text-base focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring";
  return (
    <ConsolePage title="Members" description="Everyone who joined or asked to join this college.">
      <div className="flex flex-col gap-3 sm:flex-row">
        <div className="relative flex-1">
          <SearchIcon
            aria-hidden="true"
            className="pointer-events-none absolute left-3.5 top-1/2 size-5 -translate-y-1/2 text-ink-muted"
          />
          <Input
            type="search"
            aria-label="Search members"
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            placeholder="Search by name"
            className="pl-11"
            autoComplete="off"
          />
        </div>
        <label className="sr-only" htmlFor="member-status">
          Status
        </label>
        <select
          id="member-status"
          value={status}
          onChange={(e) => setStatus(e.target.value)}
          className={select}
        >
          <option value="">Any status</option>
          {Object.entries(STATUS_LABEL).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>
        <label className="sr-only" htmlFor="member-role">
          Role
        </label>
        <select
          id="member-role"
          value={role}
          onChange={(e) => setRole(e.target.value)}
          className={select}
        >
          <option value="">Any role</option>
          {Object.entries(ROLE_LABEL).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>
      </div>
      <div aria-live="polite">
        {list.state.status === "loading" ? (
          <ListSkeleton />
        ) : list.state.status === "error" ? (
          <LoadError error={list.state.error} onRetry={list.state.reload} what="the members" />
        ) : list.items.length === 0 ? (
          <EmptyNote>No members match.</EmptyNote>
        ) : (
          <>
            <ul className="glass-card divide-y divide-white/[0.07] rounded-[22px] px-4">
              {list.items.map((member) => (
                <MemberRow
                  key={member.membership_id}
                  member={member}
                  onChanged={list.state.reload}
                />
              ))}
            </ul>
            <div className="mt-4">
              <PagedFooter
                hasMore={list.hasMore}
                loadingMore={list.loadingMore}
                moreError={list.moreError}
                onMore={list.more}
                count={list.items.length}
              />
            </div>
          </>
        )}
      </div>
    </ConsolePage>
  );
}
