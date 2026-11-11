import { connection } from "next/server";
import { OwnerTitle, Table, when } from "@/features/owner/owner-ui";
import { reports } from "@/modules/owner/owner.admin";

export const instant = false;

export default async function OwnerReports() {
  await connection();
  const rows = await reports();
  return (
    <>
      <OwnerTitle
        title="Reports"
        text="Open reports from every college. The college's own admins and moderators decide on them; this is for you to keep an eye on."
      />
      <Table
        head={["College", "What", "Reason", "Details", "Reported by", "When"]}
        empty="No open reports."
      >
        {rows.map((report) => (
          <tr key={report.id}>
            <td>
              <p className="font-semibold">{report.college_name}</p>
              <p className="text-[12.5px] text-ink-muted">/c/{report.college_slug}</p>
            </td>
            <td className="capitalize">{report.target_type.replace("_", " ")}</td>
            <td className="capitalize">{report.reason}</td>
            <td className="max-w-xs text-[13px] text-ink-muted">{report.details ?? "none"}</td>
            <td className="break-all text-[13px] text-ink-muted">
              {report.reporter_email ?? "a removed account"}
            </td>
            <td className="whitespace-nowrap text-[13px] text-ink-muted">
              {when(report.created_at)}
            </td>
          </tr>
        ))}
      </Table>
    </>
  );
}
