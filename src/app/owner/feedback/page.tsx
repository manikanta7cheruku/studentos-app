import { connection } from "next/server";
import { OwnerTitle, Pill, Table, when } from "@/features/owner/owner-ui";
import { ownerFeedback } from "@/modules/feedback/feedback.admin";

export const instant = false;

const KIND = { idea: "Idea", problem: "Problem", other: "Other" } as const;

export default async function OwnerFeedback() {
  await connection();
  const rows = await ownerFeedback(null);
  return (
    <>
      <OwnerTitle
        title="Feedback"
        text="Notes people sent from the app, newest first. The page they were on is shown when we know it."
      />
      <Table head={["Note", "From", "Kind", "Sent", "Status"]} empty="No feedback yet.">
        {rows.map((row) => (
          <tr key={row.id}>
            <td className="max-w-[28rem]">
              <p className="whitespace-pre-line text-[14px]">{row.message}</p>
              {row.page ? (
                <p className="mt-1 break-all text-[12px] text-ink-muted">{row.page}</p>
              ) : null}
            </td>
            <td className="text-[13px]">
              <p className="font-semibold">{row.user_name}</p>
              {row.user_email ? (
                <p className="break-all text-[12px] text-ink-muted">{row.user_email}</p>
              ) : null}
            </td>
            <td className="text-[13px]">{KIND[row.kind]}</td>
            <td className="whitespace-nowrap text-[13px] text-ink-muted">{when(row.created_at)}</td>
            <td>
              <Pill value={row.status} />
            </td>
          </tr>
        ))}
      </Table>
    </>
  );
}
