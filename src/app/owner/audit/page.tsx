import { connection } from "next/server";
import { OwnerTitle, Table, when } from "@/features/owner/owner-ui";
import { audit } from "@/modules/owner/owner.admin";

export const instant = false;

const LABEL: Record<string, string> = {
  "owner.unlock": "Unlocked the dashboard",
  "owner.pin_wrong": "Wrong PIN",
  "owner.pin_locked": "PIN locked after too many tries",
  "owner.college_suspended": "Suspended a college",
  "owner.college_reactivated": "Reactivated a college",
  "owner.code_made": "Made a setup code",
  "owner.code_revoked": "Revoked a setup code",
  "owner.user_suspended": "Suspended an account",
  "owner.user_restored": "Restored an account",
};

export default async function OwnerAudit() {
  await connection();
  const rows = await audit();
  return (
    <>
      <OwnerTitle
        title="Audit"
        text="Everything done in this dashboard, newest first. It cannot be edited or deleted."
      />
      <Table head={["When", "Who", "What", "About"]} empty="Nothing yet.">
        {rows.map((row) => (
          <tr key={row.id}>
            <td className="whitespace-nowrap text-[13px] text-ink-muted">{when(row.created_at)}</td>
            <td className="break-all text-[13px]">{row.actor_email ?? "unknown"}</td>
            <td className="font-semibold">{LABEL[row.action] ?? row.action}</td>
            <td className="text-[13px] text-ink-muted">
              {row.college_slug ? `/c/${row.college_slug}` : null}
              {row.target_type && !row.college_slug
                ? `${row.target_type} ${row.target_id ?? ""}`
                : null}
              {typeof row.metadata.label === "string" ? ` ${row.metadata.label}` : null}
            </td>
          </tr>
        ))}
      </Table>
    </>
  );
}
