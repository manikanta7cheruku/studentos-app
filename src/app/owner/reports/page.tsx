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
        head={[
          "College",
          "What was reported",
          "Written by",
          "Reason",
          "Details",
          "Reported by",
          "When",
        ]}
        empty="No open reports."
      >
        {rows.map((report) => (
          <tr key={report.id}>
            <td>
              <p className="font-semibold">{report.college_name}</p>
              <p className="text-[12.5px] text-ink-muted">/c/{report.college_slug}</p>
            </td>
            <td className="max-w-xs">
              <p className="text-[12px] font-semibold uppercase tracking-wide text-ink-muted">
                {report.target_type.replace("_", " ")}
              </p>
              <p className="line-clamp-3 text-[13px]">{report.target_preview ?? "(gone)"}</p>
            </td>
            <td className="text-[13px]">
              {report.target_author_name ? (
                <>
                  <p className="font-semibold">
                    {report.target_author_name}
                    {report.target_anonymous ? (
                      <span className="ml-1.5 rounded-full bg-white/10 px-2 py-0.5 text-[11px] font-bold text-[#f0a58c]">
                        posted anonymously
                      </span>
                    ) : null}
                  </p>
                  <p className="break-all text-ink-muted">{report.target_author_email ?? ""}</p>
                </>
              ) : (
                <span className="text-ink-muted">unknown</span>
              )}
            </td>
            <td className="capitalize">{report.reason}</td>
            <td className="capitalize">{report.reason}</td>
            <td className="max-w-xs text-[13px] text-ink-muted">{report.details ?? "none"}</td>
            <td className="break-all text-[13px] text-ink-muted">
              {report.reporter_name ?? ""}
              <br />
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
